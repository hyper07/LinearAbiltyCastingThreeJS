/**
 * The tree-walking evaluator for the lab's Python. Every statement and
 * expression is a generator, so a program can stop anywhere — at
 * time.sleep(), at a loop's back-edge, while it waits for a button — and the
 * runtime (runtime.ts) resumes it in simulation time. Errors are Python
 * exceptions with the line they happened on.
 */
import { PyError } from './lexer'
import type { Expr, Stmt } from './parser'
import {
  arith, Builtin, compare, err, EXCEPTIONS, excType, F, formatSpec, getItem, int, isInt, isNum, iterate, len, num, percentFormat,
  PyDict, PyExc, PyExcType, PyFloat, PyFunc, PyModule, PyObj, PyRange, PyTuple, pyRound, repr, Scope, setItem, sortValues, str,
  strFormat, toList, truthy, typeName, eq, objId, type Gen, type Kw, type SliceSpec, type Value, type Yielded,
} from './values'

const NORMAL = 0
const BREAK = 1
const CONTINUE = 2
const RETURN = 3
type Signal = 0 | 1 | 2 | 3

const MAX_DEPTH = 120

export interface InterpHost {
  write(text: string): void
  /** a line typed into the serial monitor, or null while there is none */
  readLine(): string | null
  /** a module the program imports (null = no such module) */
  importModule(name: string): PyModule | null
  /** a teaching note for the issues list (deduplicated by the host) */
  warn(message: string): void
  /** random number in [0, 1) */
  random(): number
}

export class Interp {
  readonly globals = new Scope(null, null, null)
  readonly builtins = new Map<string, Value>()
  /** the line being run (for messages) */
  line = 0
  private depth = 0
  /** exceptions being handled (for a bare `raise`) */
  private handling: PyError[] = []

  constructor(readonly host: InterpHost) {
    this.installBuiltins()
    this.globals.vars.set('__name__', '__main__')
  }

  // ------------------------------------------------------------ program

  *run(prog: Stmt[]): Gen<Value> {
    yield* this.block(prog, this.globals)
    return null
  }

  // ------------------------------------------------------------ names

  lookup(name: string, sc: Scope): Value {
    for (let s: Scope | null = sc; s; s = s.parent) {
      if (s.locals === null) {
        if (s.vars.has(name)) return s.vars.get(name) as Value
        break
      }
      if (s.locals.has(name) && !s.globalNames?.has(name)) {
        if (s.vars.has(name)) return s.vars.get(name) as Value
        if (s === sc) throw err('UnboundLocalError', `cannot access local variable '${name}' where it is not associated with a value — it is set later in this function. To change a global variable inside a function, add \`global ${name}\` at the top of the function.`)
      }
    }
    const b = this.builtins.get(name)
    if (b !== undefined) return b
    throw err('NameError', this.nameHint(name))
  }

  private nameHint(name: string): string {
    const base = `name '${name}' is not defined`
    const known: Record<string, string> = {
      sleep: 'add `from time import sleep` at the top',
      pause: 'add `from signal import pause` at the top',
      LED: 'add `from gpiozero import LED` at the top',
      Button: 'add `from gpiozero import Button` at the top',
      PWMLED: 'add `from gpiozero import PWMLED` at the top',
      Buzzer: 'add `from gpiozero import Buzzer` at the top',
      Servo: 'add `from gpiozero import Servo` at the top',
      GPIO: 'add `import RPi.GPIO as GPIO` at the top',
      time: 'add `import time` at the top',
      random: 'add `import random` at the top',
      math: 'add `import math` at the top',
      true: 'Python writes True with a capital T',
      false: 'Python writes False with a capital F',
      null: 'Python writes None',
      none: 'Python writes None',
      digitalWrite: 'that is Arduino C++ — a Raspberry Pi runs Python (gpiozero: LED(17).on())',
      delay: 'that is Arduino — in Python use time.sleep(seconds)',
    }
    if (known[name]) return `${base} — ${known[name]}`
    // a near miss among the names in scope
    const names = [...this.globals.vars.keys(), ...this.builtins.keys()]
    const near = names.find((n) => n.toLowerCase() === name.toLowerCase() || editDistance(n, name) === 1)
    return near ? `${base}. Did you mean '${near}'?` : base
  }

  private assignName(name: string, v: Value, sc: Scope): void {
    if (sc.locals === null || sc.globalNames?.has(name)) this.globals.vars.set(name, v)
    else sc.vars.set(name, v)
  }

  private *assign(target: Expr, v: Value, sc: Scope): Gen<void> {
    switch (target.k) {
      case 'name':
        this.assignName(target.id, v, sc)
        return
      case 'tuple':
      case 'list': {
        const items = toList(v)
        if (items.length !== target.items.length) {
          throw err('ValueError', items.length > target.items.length ? `too many values to unpack (expected ${target.items.length})` : `not enough values to unpack (expected ${target.items.length}, got ${items.length})`)
        }
        for (let i = 0; i < items.length; i++) yield* this.assign(target.items[i], items[i], sc)
        return
      }
      case 'index': {
        const obj = yield* this.ev(target.e, sc)
        const i = yield* this.index(target.i, sc)
        setItem(obj, i, v)
        return
      }
      case 'attr': {
        const obj = yield* this.ev(target.e, sc)
        this.setAttr(obj, target.name, v)
        return
      }
    }
    throw err('SyntaxError', 'cannot assign to this expression')
  }

  private *index(i: Expr, sc: Scope): Gen<Value | SliceSpec> {
    if (i.k === 'slice') {
      return {
        lo: i.lo ? yield* this.ev(i.lo, sc) : null,
        hi: i.hi ? yield* this.ev(i.hi, sc) : null,
        step: i.step ? yield* this.ev(i.step, sc) : null,
      } as SliceSpec
    }
    return yield* this.ev(i, sc)
  }

  // ---------------------------------------------------------- statements

  *block(body: Stmt[], sc: Scope): Gen<Signal> {
    for (const s of body) {
      const r = yield* this.stmt(s, sc)
      if (r !== NORMAL) return r
    }
    return NORMAL
  }

  private *stmt(s: Stmt, sc: Scope): Gen<Signal> {
    this.line = s.line
    try {
      return yield* this.stmtInner(s, sc)
    } catch (e) {
      throw this.located(e, s.line)
    }
  }

  /** attach the line to an error that has none; turn JS errors into Python ones */
  located(e: unknown, line: number): PyError {
    if (e instanceof PyError) {
      if (e.line === undefined) e.line = line
      return e
    }
    if (e instanceof RangeError && /call stack/i.test(e.message)) return new PyError('RecursionError', 'maximum recursion depth exceeded', line)
    const msg = e instanceof Error ? e.message : String(e)
    return new PyError('RuntimeError', msg, line)
  }

  private *stmtInner(s: Stmt, sc: Scope): Gen<Signal> {
    switch (s.k) {
      case 'expr': {
        const v = yield* this.ev(s.e, sc)
        if ((v instanceof Builtin || v instanceof PyFunc) && (s.e.k === 'attr' || s.e.k === 'name')) {
          const what = s.e.k === 'attr' ? `${exprText(s.e.e)}.${s.e.name}` : s.e.id
          this.host.warn(`Line ${s.line}: \`${what}\` does nothing without brackets — call it: ${what}()`)
        }
        return NORMAL
      }
      case 'assign': {
        const v = yield* this.ev(s.value, sc)
        for (const t of s.targets) yield* this.assign(t, v, sc)
        return NORMAL
      }
      case 'aug': {
        let cur: Value
        let obj: Value = null
        let idx: Value | SliceSpec = null
        if (s.target.k === 'index') {
          obj = yield* this.ev(s.target.e, sc)
          idx = yield* this.index(s.target.i, sc)
          cur = getItem(obj, idx)
        } else if (s.target.k === 'attr') {
          obj = yield* this.ev(s.target.e, sc)
          cur = this.getAttr(obj, s.target.name)
        } else cur = yield* this.ev(s.target, sc)
        const rhs = yield* this.ev(s.value, sc)
        // lists grow in place: xs += [1]
        const v = Array.isArray(cur) && s.op === '+' ? (cur.push(...toList(rhs)), cur) : arith(s.op, cur, rhs)
        if (s.target.k === 'index') setItem(obj, idx, v)
        else if (s.target.k === 'attr') this.setAttr(obj, s.target.name, v)
        else yield* this.assign(s.target, v, sc)
        return NORMAL
      }
      case 'if': {
        for (const [c, body] of s.tests) {
          if (truthy(yield* this.ev(c, sc))) return yield* this.block(body, sc)
        }
        return s.orelse ? yield* this.block(s.orelse, sc) : NORMAL
      }
      case 'while': {
        while (truthy(yield* this.ev(s.c, sc))) {
          const r = yield* this.block(s.body, sc)
          if (r === BREAK) return NORMAL
          if (r === RETURN) return r
          this.line = s.line
          yield { k: 'L', line: s.line }
        }
        return s.orelse ? yield* this.block(s.orelse, sc) : NORMAL
      }
      case 'for': {
        const it = yield* this.ev(s.iter, sc)
        for (const v of iterate(it)) {
          yield* this.assign(s.target, v, sc)
          const r = yield* this.block(s.body, sc)
          if (r === BREAK) return NORMAL
          if (r === RETURN) return r
          this.line = s.line
          yield { k: 'L', line: s.line }
        }
        return s.orelse ? yield* this.block(s.orelse, sc) : NORMAL
      }
      case 'break':
        return BREAK
      case 'continue':
        return CONTINUE
      case 'pass':
      case 'global':
        return NORMAL
      case 'def': {
        const defaults: (Value | undefined)[] = []
        for (const p of s.params) defaults.push(p.def ? yield* this.ev(p.def, sc) : undefined)
        this.assignName(s.name, new PyFunc(s.name, s.params, defaults, s.body, null, s.locals, s.globals, sc), sc)
        return NORMAL
      }
      case 'return':
        sc.ret = s.e ? yield* this.ev(s.e, sc) : null
        return RETURN
      case 'import': {
        for (const n of s.names) {
          const mod = this.importModule(n.mod)
          if (n.as) this.assignName(n.as, mod, sc)
          else {
            // `import RPi.GPIO` binds RPi with GPIO inside it
            const top = n.mod.split('.')[0]
            this.assignName(top, n.mod.includes('.') ? this.importModule(top) : mod, sc)
          }
        }
        return NORMAL
      }
      case 'from': {
        const mod = this.importModule(s.mod)
        if (s.names === '*') {
          for (const [k, v] of Object.entries(mod.attrs)) if (!k.startsWith('_')) this.assignName(k, v, sc)
          return NORMAL
        }
        for (const n of s.names) {
          let v = mod.getAttr(n.name)
          if (v === undefined) {
            try {
              v = this.importModule(`${s.mod}.${n.name}`)
            } catch {
              throw err('ImportError', `cannot import name '${n.name}' from '${s.mod}'${moduleHint(s.mod, n.name)}`)
            }
          }
          this.assignName(n.as ?? n.name, v, sc)
        }
        return NORMAL
      }
      case 'try':
        return yield* this.tryStmt(s, sc)
      case 'raise': {
        if (!s.e) {
          const cur = this.handling[this.handling.length - 1]
          if (!cur) throw err('RuntimeError', 'No active exception to reraise')
          throw cur
        }
        let v = yield* this.ev(s.e, sc)
        if (v instanceof PyExcType) v = new PyExc(v, '', [])
        if (!(v instanceof PyExc)) throw err('TypeError', 'exceptions must derive from BaseException')
        throw new PyError(v.cls.name, str(v), s.line, v)
      }
      case 'assert': {
        if (!truthy(yield* this.ev(s.c, sc))) throw err('AssertionError', s.msg ? str(yield* this.ev(s.msg, sc)) : '')
        return NORMAL
      }
      case 'del': {
        for (const t of s.targets) {
          if (t.k === 'name') {
            if (sc.locals === null || sc.globalNames?.has(t.id)) this.globals.vars.delete(t.id)
            else sc.vars.delete(t.id)
          } else if (t.k === 'index') {
            const obj = yield* this.ev(t.e, sc)
            const i = yield* this.index(t.i, sc)
            if (Array.isArray(obj) && isInt(i as Value)) {
              getItem(obj, i)
              obj.splice(((num(i as Value) % obj.length) + obj.length) % obj.length, 1)
            } else if (obj instanceof PyDict) {
              if (!obj.delete(i as Value)) throw err('KeyError', repr(i as Value))
            } else throw err('TypeError', `'${typeName(obj)}' object doesn't support item deletion`)
          }
        }
        return NORMAL
      }
    }
  }

  private *tryStmt(s: Extract<Stmt, { k: 'try' }>, sc: Scope): Gen<Signal> {
    let r: Signal = NORMAL
    let pending: unknown = null
    try {
      r = yield* this.block(s.body, sc)
      if (r === NORMAL && s.orelse) r = yield* this.block(s.orelse, sc)
    } catch (e0) {
      const e = this.located(e0, this.line)
      let handled = false
      for (const h of s.handlers) {
        const types = h.types ? yield* this.ev(h.types, sc) : null
        if (!this.matches(e, types)) continue
        handled = true
        if (h.as) this.assignName(h.as, this.excValue(e), sc)
        this.handling.push(e)
        try {
          r = yield* this.block(h.body, sc)
        } catch (e2) {
          pending = e2
        } finally {
          this.handling.pop()
        }
        break
      }
      if (!handled) pending = e
    }
    if (s.final) {
      const fr = yield* this.block(s.final, sc)
      if (fr !== NORMAL) return fr
    }
    if (pending) throw pending
    return r
  }

  excValue(e: PyError): PyExc {
    if (e.value instanceof PyExc) return e.value
    return new PyExc(excType(e.type), e.msg, e.msg ? [e.msg] : [])
  }

  private matches(e: PyError, types: Value): boolean {
    if (types === null) return true
    const cls = excType(e.type)
    const list = types instanceof PyTuple ? types.items : [types]
    for (const t of list) {
      if (!(t instanceof PyExcType)) throw err('TypeError', 'catching classes that do not inherit from BaseException is not allowed')
      if (cls.isSub(t) || (EXCEPTIONS[e.type] === undefined && t === EXCEPTIONS.Exception)) return true
    }
    return false
  }

  private importModule(name: string): PyModule {
    const m = this.host.importModule(name)
    if (!m) {
      throw err('ModuleNotFoundError', `No module named '${name}'${moduleHint(name, '')}`)
    }
    return m
  }

  // --------------------------------------------------------- expressions

  *ev(e: Expr, sc: Scope): Gen<Value> {
    switch (e.k) {
      case 'num':
        return e.float ? F(e.v) : e.v
      case 'str':
        return e.v
      case 'const':
        return e.v
      case 'name':
        return this.lookup(e.id, sc)
      case 'fstr': {
        let out = ''
        for (const p of e.parts) {
          if (typeof p === 'string') {
            out += p
            continue
          }
          let v = yield* this.ev(p.e, sc)
          if (p.conv === 'r') v = repr(v)
          else if (p.conv === 's') v = str(v)
          out += formatSpec(v, p.spec)
        }
        return out
      }
      case 'list': {
        const out: Value[] = []
        for (const x of e.items) out.push(yield* this.ev(x, sc))
        return out
      }
      case 'tuple': {
        const out: Value[] = []
        for (const x of e.items) out.push(yield* this.ev(x, sc))
        return new PyTuple(out)
      }
      case 'dict': {
        const d = new PyDict()
        for (let i = 0; i < e.keys.length; i++) d.set(yield* this.ev(e.keys[i], sc), yield* this.ev(e.values[i], sc))
        return d
      }
      case 'bin':
        return arith(e.op, yield* this.ev(e.l, sc), yield* this.ev(e.r, sc))
      case 'unary': {
        const v = yield* this.ev(e.e, sc)
        if (!isNum(v)) throw err('TypeError', `bad operand type for unary ${e.op}: '${typeName(v)}'`)
        if (e.op === '+') return typeof v === 'boolean' ? num(v) : v
        if (e.op === '-') return v instanceof PyFloat ? F(-v.v) : -num(v)
        if (v instanceof PyFloat) throw err('TypeError', "bad operand type for unary ~: 'float'")
        return ~num(v)
      }
      case 'not':
        return !truthy(yield* this.ev(e.e, sc))
      case 'bool': {
        const l = yield* this.ev(e.l, sc)
        if (e.op === 'and' ? !truthy(l) : truthy(l)) return l
        return yield* this.ev(e.r, sc)
      }
      case 'cmp': {
        let a = yield* this.ev(e.items[0], sc)
        for (let i = 0; i < e.ops.length; i++) {
          const b = yield* this.ev(e.items[i + 1], sc)
          if (!compare(e.ops[i], a, b)) return false
          a = b
        }
        return true
      }
      case 'ifexp':
        return truthy(yield* this.ev(e.c, sc)) ? yield* this.ev(e.a, sc) : yield* this.ev(e.b, sc)
      case 'attr':
        return this.getAttr(yield* this.ev(e.e, sc), e.name)
      case 'index': {
        const obj = yield* this.ev(e.e, sc)
        return getItem(obj, yield* this.index(e.i, sc))
      }
      case 'slice':
        throw err('SyntaxError', 'a slice can only be used inside [ ]')
      case 'lambda': {
        const defaults: (Value | undefined)[] = []
        for (const p of e.params) defaults.push(p.def ? yield* this.ev(p.def, sc) : undefined)
        return new PyFunc('<lambda>', e.params, defaults, null, e.body, new Set(e.params.map((p) => p.name)), new Set(), sc)
      }
      case 'comp': {
        const it = yield* this.ev(e.iter, sc)
        const inner = new Scope(sc, new Set(targetNames(e.target)), null)
        const out: Value[] = []
        for (const v of iterate(it)) {
          yield* this.assign(e.target, v, inner)
          let ok = true
          for (const c of e.conds) {
            if (!truthy(yield* this.ev(c, inner))) {
              ok = false
              break
            }
          }
          if (ok) out.push(yield* this.ev(e.e, inner))
        }
        return out
      }
      case 'call': {
        const f = yield* this.ev(e.f, sc)
        const args: Value[] = []
        for (const a of e.args) args.push(yield* this.ev(a, sc))
        if (e.star) args.push(...toList(yield* this.ev(e.star, sc)))
        const kw: Kw = {}
        for (const k of e.kw) kw[k.name] = yield* this.ev(k.e, sc)
        return yield* this.call(f, args, kw)
      }
    }
  }

  *call(f: Value, args: Value[], kw: Kw = {}): Gen<Value> {
    if (f instanceof PyFunc) return yield* this.callFunc(f, args, kw)
    if (f instanceof Builtin) {
      const r = f.fn(args, kw)
      if (f.gen) return yield* (r as Gen)
      return r as Value
    }
    if (f instanceof PyExcType) return new PyExc(f, args.length ? str(args[0]) : '', args)
    throw err('TypeError', `'${typeName(f)}' object is not callable${f === null ? ' — did a function return None?' : ''}`)
  }

  private *callFunc(f: PyFunc, args: Value[], kw: Kw): Gen<Value> {
    const sc = new Scope(f.closure, f.locals, f.globals)
    const positional = f.params.filter((p) => !p.star)
    const star = f.params.find((p) => p.star)
    if (args.length > positional.length && !star) {
      throw err('TypeError', `${f.name}() takes ${positional.length} positional argument${positional.length === 1 ? '' : 's'} but ${args.length} ${args.length === 1 ? 'was' : 'were'} given`)
    }
    const missing: string[] = []
    positional.forEach((p) => {
      const i = f.params.indexOf(p)
      const pi = positional.indexOf(p)
      if (pi < args.length) {
        if (p.name in kw) throw err('TypeError', `${f.name}() got multiple values for argument '${p.name}'`)
        sc.vars.set(p.name, args[pi])
      } else if (p.name in kw) sc.vars.set(p.name, kw[p.name])
      else if (f.defaults[i] !== undefined) sc.vars.set(p.name, f.defaults[i] as Value)
      else missing.push(p.name)
    })
    if (star) sc.vars.set(star.name, new PyTuple(args.slice(positional.length)))
    for (const k of Object.keys(kw)) {
      if (!positional.some((p) => p.name === k)) throw err('TypeError', `${f.name}() got an unexpected keyword argument '${k}'`)
    }
    if (missing.length) throw err('TypeError', `${f.name}() missing ${missing.length} required positional argument${missing.length === 1 ? '' : 's'}: ${missing.map((m) => `'${m}'`).join(' and ')}`)
    if (++this.depth > MAX_DEPTH) {
      this.depth = 0
      throw err('RecursionError', 'maximum recursion depth exceeded')
    }
    try {
      if (f.expr) return yield* this.ev(f.expr, sc)
      const r = yield* this.block(f.body!, sc)
      return r === RETURN ? sc.ret : null
    } finally {
      this.depth--
    }
  }

  // ---------------------------------------------------------- attributes

  getAttr(v: Value, name: string): Value {
    if (v instanceof PyObj) {
      const a = v.getAttr(name)
      if (a !== undefined) return a
      if (v instanceof PyModule) throw err('AttributeError', `module '${v.name}' has no attribute '${name}'${moduleHint(v.name, name)}`)
      throw err('AttributeError', `'${v.type}' object has no attribute '${name}'`)
    }
    if (v instanceof PyExc && name === 'args') return new PyTuple(v.args)
    const m = this.method(v, name)
    if (m) return m
    throw err('AttributeError', `'${typeName(v)}' object has no attribute '${name}'`)
  }

  setAttr(v: Value, name: string, x: Value): void {
    if (v instanceof PyObj && v.setAttr(name, x)) return
    throw err('AttributeError', `'${typeName(v)}' object attribute '${name}' cannot be set`)
  }

  private method(v: Value, name: string): Builtin | null {
    const self = this
    const B = (fn: (args: Value[], kw: Kw) => Value | Gen, gen = false) => new Builtin(name, fn, gen)
    if (typeof v === 'string') {
      const s = v
      switch (name) {
        case 'upper': return B(() => s.toUpperCase())
        case 'lower': return B(() => s.toLowerCase())
        case 'strip': return B((a) => stripChars(s, a[0], 'both'))
        case 'lstrip': return B((a) => stripChars(s, a[0], 'left'))
        case 'rstrip': return B((a) => stripChars(s, a[0], 'right'))
        case 'split': return B((a, kw) => splitStr(s, a[0] ?? kw.sep ?? null, a[1] ?? kw.maxsplit ?? -1))
        case 'join': return B((a) => toList(a[0]).map((x) => {
          if (typeof x !== 'string') throw err('TypeError', `sequence item: expected str instance, ${typeName(x)} found — use str(x)`)
          return x
        }).join(s))
        case 'replace': return B((a) => s.split(str(a[0])).join(str(a[1])))
        case 'startswith': return B((a) => (a[0] instanceof PyTuple ? a[0].items : [a[0]]).some((p) => s.startsWith(str(p))))
        case 'endswith': return B((a) => (a[0] instanceof PyTuple ? a[0].items : [a[0]]).some((p) => s.endsWith(str(p))))
        case 'find': return B((a) => s.indexOf(str(a[0])))
        case 'index': return B((a) => {
          const i = s.indexOf(str(a[0]))
          if (i < 0) throw err('ValueError', 'substring not found')
          return i
        })
        case 'count': return B((a) => (str(a[0]) ? s.split(str(a[0])).length - 1 : s.length + 1))
        case 'format': return B((a, kw) => strFormat(s, a, kw))
        case 'isdigit': case 'isnumeric': case 'isdecimal': return B(() => /^\d+$/.test(s))
        case 'isalpha': return B(() => /^[A-Za-zÀ-￿]+$/.test(s))
        case 'isalnum': return B(() => /^[A-Za-z0-9À-￿]+$/.test(s))
        case 'isspace': return B(() => /^\s+$/.test(s))
        case 'isupper': return B(() => s !== s.toLowerCase() && s === s.toUpperCase())
        case 'islower': return B(() => s !== s.toUpperCase() && s === s.toLowerCase())
        case 'title': return B(() => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()))
        case 'capitalize': return B(() => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s))
        case 'center': return B((a) => formatSpec(s, `${a[1] ? str(a[1]) : ' '}^${int(a[0])}`))
        case 'ljust': return B((a) => formatSpec(s, `${a[1] ? str(a[1]) : ' '}<${int(a[0])}`))
        case 'rjust': return B((a) => formatSpec(s, `${a[1] ? str(a[1]) : ' '}>${int(a[0])}`))
        case 'zfill': return B((a) => (s.startsWith('-') ? '-' + s.slice(1).padStart(int(a[0]) - 1, '0') : s.padStart(int(a[0]), '0')))
        case 'encode': return B(() => s)
      }
      return null
    }
    if (Array.isArray(v)) {
      const xs = v
      switch (name) {
        case 'append': return B((a) => (xs.push(a[0]), null))
        case 'extend': return B((a) => (xs.push(...toList(a[0])), null))
        case 'insert': return B((a) => {
          let i = int(a[0])
          if (i < 0) i = Math.max(0, i + xs.length)
          xs.splice(Math.min(i, xs.length), 0, a[1])
          return null
        })
        case 'pop': return B((a) => {
          if (!xs.length) throw err('IndexError', 'pop from empty list')
          let i = a.length ? int(a[0]) : xs.length - 1
          if (i < 0) i += xs.length
          if (i < 0 || i >= xs.length) throw err('IndexError', 'pop index out of range')
          return xs.splice(i, 1)[0]
        })
        case 'remove': return B((a) => {
          const i = xs.findIndex((x) => eq(x, a[0]))
          if (i < 0) throw err('ValueError', 'list.remove(x): x not in list')
          xs.splice(i, 1)
          return null
        })
        case 'index': return B((a) => {
          const i = xs.findIndex((x) => eq(x, a[0]))
          if (i < 0) throw err('ValueError', `${repr(a[0])} is not in list`)
          return i
        })
        case 'count': return B((a) => xs.filter((x) => eq(x, a[0])).length)
        case 'reverse': return B(() => (xs.reverse(), null))
        case 'clear': return B(() => ((xs.length = 0), null))
        case 'copy': return B(() => [...xs])
        case 'sort': return B(function* (this: void, _a: Value[], kw: Kw): Gen {
          const keys = kw.key && kw.key !== null ? yield* self.mapCall(kw.key, xs) : undefined
          const sorted = sortValues(xs, keys)
          if (truthy(kw.reverse ?? false)) sorted.reverse()
          xs.splice(0, xs.length, ...sorted)
          return null
        }, true)
      }
      return null
    }
    if (v instanceof PyDict) {
      const d = v
      switch (name) {
        case 'get': return B((a) => d.get(a[0]) ?? (a.length > 1 ? a[1] : null))
        case 'keys': return B(() => d.keys())
        case 'values': return B(() => [...d.map.values()].map((e) => e[1]))
        case 'items': return B(() => [...d.map.values()].map(([k, x]) => new PyTuple([k, x])))
        case 'pop': return B((a) => {
          const x = d.get(a[0])
          if (x === undefined) {
            if (a.length > 1) return a[1]
            throw err('KeyError', repr(a[0]))
          }
          d.delete(a[0])
          return x
        })
        case 'update': return B((a) => {
          if (a[0] instanceof PyDict) for (const [k, x] of a[0].map.values()) d.set(k, x)
          return null
        })
        case 'setdefault': return B((a) => {
          if (!d.has(a[0])) d.set(a[0], a.length > 1 ? a[1] : null)
          return d.get(a[0]) as Value
        })
        case 'clear': return B(() => (d.map.clear(), null))
        case 'copy': return B(() => {
          const c = new PyDict()
          for (const [k, x] of d.map.values()) c.set(k, x)
          return c
        })
      }
      return null
    }
    if (v instanceof PyFloat && name === 'is_integer') return B(() => Number.isInteger(v.v))
    return null
  }

  /** call f on each item (key functions, map) */
  *mapCall(f: Value, xs: Value[]): Gen<Value[]> {
    const out: Value[] = []
    for (const x of xs) out.push(yield* this.call(f, [x]))
    return out
  }

  // ------------------------------------------------------------ builtins

  private installBuiltins(): void {
    const self = this
    const def = (name: string, fn: (args: Value[], kw: Kw) => Value | Gen, gen = false) => this.builtins.set(name, new Builtin(name, fn, gen))
    for (const [n, t] of Object.entries(EXCEPTIONS)) if (!/^(GPIO|Pin|Device|BadPin)/.test(n)) this.builtins.set(n, t)

    def('print', (args, kw) => {
      const sep = kw.sep === undefined || kw.sep === null ? ' ' : str(kw.sep)
      const end = kw.end === undefined || kw.end === null ? '\n' : str(kw.end)
      this.host.write(args.map(str).join(sep) + end)
      return null
    })
    def('input', function* (args): Gen {
      if (args.length) self.host.write(str(args[0]))
      for (;;) {
        const l = self.host.readLine()
        if (l !== null) {
          self.host.write(l + '\n')
          return l
        }
        yield { k: 'w', line: self.line } as Yielded
      }
    }, true)
    def('len', (a) => len(a[0]))
    def('range', (a) => {
      const ints = a.map((x) => {
        if (x instanceof PyFloat) throw err('TypeError', "'float' object cannot be interpreted as an integer — use int(x)")
        return int(x)
      })
      if (ints.length === 0) throw err('TypeError', 'range expected at least 1 argument, got 0')
      const [start, stop, step] = ints.length === 1 ? [0, ints[0], 1] : [ints[0], ints[1], ints[2] ?? 1]
      if (step === 0) throw err('ValueError', 'range() arg 3 must not be zero')
      return new PyRange(start, stop, step)
    })
    def('int', (a) => {
      if (!a.length) return 0
      const x = a[0]
      if (typeof x === 'string') {
        const base = a.length > 1 ? int(a[1]) : 10
        const s = x.trim().replace(/_/g, '')
        const ok = base === 10 ? /^[+-]?\d+$/.test(s) : base === 16 ? /^[+-]?(0x)?[0-9a-f]+$/i.test(s) : base === 2 ? /^[+-]?(0b)?[01]+$/i.test(s) : /^[+-]?[0-9a-z]+$/i.test(s)
        if (!ok) throw err('ValueError', `invalid literal for int() with base ${base}: ${repr(x)}`)
        return parseInt(s.replace(/^([+-]?)0[xb]/i, '$1'), base)
      }
      if (isNum(x)) {
        const n = num(x)
        if (!Number.isFinite(n)) throw err(Number.isNaN(n) ? 'ValueError' : 'OverflowError', 'cannot convert float to integer')
        return Math.trunc(n)
      }
      throw err('TypeError', `int() argument must be a string or a number, not '${typeName(x)}'`)
    })
    def('float', (a) => {
      if (!a.length) return F(0)
      const x = a[0]
      if (typeof x === 'string') {
        const s = x.trim().toLowerCase()
        if (s === 'inf' || s === '+inf' || s === 'infinity') return F(Infinity)
        if (s === '-inf' || s === '-infinity') return F(-Infinity)
        if (s === 'nan') return F(NaN)
        if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(s)) throw err('ValueError', `could not convert string to float: ${repr(x)}`)
        return F(Number(s))
      }
      return F(num(x))
    })
    def('str', (a) => (a.length ? str(a[0]) : ''))
    def('repr', (a) => repr(a[0]))
    def('bool', (a) => (a.length ? truthy(a[0]) : false))
    def('abs', (a) => {
      const x = a[0]
      return x instanceof PyFloat ? F(Math.abs(x.v)) : Math.abs(num(x))
    })
    def('round', (a) => {
      const x = num(a[0])
      if (a.length < 2 || a[1] === null) return pyRound(x)
      const r = pyRound(x, int(a[1]))
      return a[0] instanceof PyFloat ? F(r) : r
    })
    const minmax = (which: 'min' | 'max') => function* (args: Value[], kw: Kw): Gen {
      const items = args.length === 1 ? toList(args[0]) : args
      if (!items.length) {
        if (kw.default !== undefined) return kw.default
        throw err('ValueError', `${which}() arg is an empty sequence`)
      }
      const keys = kw.key !== undefined && kw.key !== null ? yield* self.mapCall(kw.key, items) : items
      let best = 0
      for (let i = 1; i < items.length; i++) {
        if (which === 'min' ? compare('<', keys[i], keys[best]) : compare('>', keys[i], keys[best])) best = i
      }
      return items[best]
    }
    def('min', minmax('min'), true)
    def('max', minmax('max'), true)
    def('sum', (a) => toList(a[0]).reduce<Value>((acc, x) => arith('+', acc, x), a[1] ?? 0))
    def('list', (a) => (a.length ? toList(a[0]) : []))
    def('tuple', (a) => new PyTuple(a.length ? toList(a[0]) : []))
    def('dict', (a, kw) => {
      const d = new PyDict()
      if (a[0] instanceof PyDict) for (const [k, x] of a[0].map.values()) d.set(k, x)
      else if (a.length) for (const pair of iterate(a[0])) {
        const kv = toList(pair)
        d.set(kv[0], kv[1])
      }
      for (const [k, x] of Object.entries(kw)) d.set(k, x)
      return d
    })
    def('enumerate', (a, kw) => {
      const start = a.length > 1 ? int(a[1]) : kw.start !== undefined ? int(kw.start) : 0
      return toList(a[0]).map((x, i) => new PyTuple([i + start, x]))
    })
    def('zip', (a) => {
      const lists = a.map(toList)
      const n = lists.length ? Math.min(...lists.map((l) => l.length)) : 0
      return Array.from({ length: n }, (_, i) => new PyTuple(lists.map((l) => l[i])))
    })
    def('sorted', function* (a: Value[], kw: Kw): Gen {
      const items = toList(a[0])
      const keys = kw.key !== undefined && kw.key !== null ? yield* self.mapCall(kw.key, items) : undefined
      const out = sortValues(items, keys)
      if (truthy(kw.reverse ?? false)) out.reverse()
      return out
    }, true)
    def('reversed', (a) => toList(a[0]).reverse())
    def('map', function* (a: Value[]): Gen {
      return yield* self.mapCall(a[0], toList(a[1]))
    }, true)
    def('filter', function* (a: Value[]): Gen {
      const items = toList(a[1])
      if (a[0] === null) return items.filter(truthy)
      const keep = yield* self.mapCall(a[0], items)
      return items.filter((_, i) => truthy(keep[i]))
    }, true)
    def('any', (a) => toList(a[0]).some(truthy))
    def('all', (a) => toList(a[0]).every(truthy))
    def('chr', (a) => String.fromCharCode(int(a[0])))
    def('ord', (a) => {
      const s = str(a[0])
      if ([...s].length !== 1) throw err('TypeError', `ord() expected a character, but string of length ${s.length} found`)
      return s.codePointAt(0) as number
    })
    def('hex', (a) => (int(a[0]) < 0 ? '-0x' + (-int(a[0])).toString(16) : '0x' + int(a[0]).toString(16)))
    def('bin', (a) => (int(a[0]) < 0 ? '-0b' + (-int(a[0])).toString(2) : '0b' + int(a[0]).toString(2)))
    def('oct', (a) => '0o' + int(a[0]).toString(8))
    def('divmod', (a) => new PyTuple([arith('//', a[0], a[1]), arith('%', a[0], a[1])]))
    def('pow', (a) => (a.length > 2 ? Number((BigInt(int(a[0])) ** BigInt(int(a[1]))) % BigInt(int(a[2]))) : arith('**', a[0], a[1])))
    def('format', (a) => formatSpec(a[0], a.length > 1 ? str(a[1]) : ''))
    def('type', (a) => `<class '${typeName(a[0])}'>`)
    def('isinstance', (a) => {
      const names = (a[1] instanceof PyTuple ? a[1].items : [a[1]]).map((t) => (t instanceof Builtin ? t.name : t instanceof PyExcType ? t.name : ''))
      const tn = typeName(a[0])
      if (a[0] instanceof PyExc) return names.some((n) => (a[0] as PyExc).cls.isSub(excType(n)))
      return names.some((n) => n === tn || (n === 'int' && tn === 'bool') || (n === 'float' && false))
    })
    def('callable', (a) => a[0] instanceof PyFunc || a[0] instanceof Builtin || a[0] instanceof PyExcType)
    def('id', (a) => (typeof a[0] === 'object' && a[0] !== null ? objId(a[0]) : num(isNum(a[0]) ? a[0] : 0)))
    def('hash', (a) => (isNum(a[0]) ? Math.trunc(num(a[0])) : 0))
    def('help', () => {
      this.host.write("The lab's Python: print, input, range, len, int, float, str, list, dict, sorted… and the modules gpiozero, RPi.GPIO, time, signal, random, math.\n")
      return null
    })
    def('exit', () => {
      throw err('SystemExit', '')
    })
    def('quit', () => {
      throw err('SystemExit', '')
    })
    // percent formatting is an operator; keep a helper name out of the user's way
    void percentFormat
  }
}

function targetNames(e: Expr): string[] {
  if (e.k === 'name') return [e.id]
  if (e.k === 'tuple' || e.k === 'list') return e.items.flatMap(targetNames)
  return []
}

function exprText(e: Expr): string {
  if (e.k === 'name') return e.id
  if (e.k === 'attr') return `${exprText(e.e)}.${e.name}`
  return '…'
}

function stripChars(s: string, chars: Value | undefined, side: 'both' | 'left' | 'right'): string {
  const set = chars === undefined || chars === null ? null : str(chars)
  const strip = (c: string) => (set === null ? /\s/.test(c) : set.includes(c))
  let a = 0
  let b = s.length
  if (side !== 'right') while (a < b && strip(s[a])) a++
  if (side !== 'left') while (b > a && strip(s[b - 1])) b--
  return s.slice(a, b)
}

function splitStr(s: string, sep: Value, maxsplit: Value): string[] {
  const max = isInt(maxsplit) ? num(maxsplit) : -1
  if (sep === null) {
    const parts = s.trim().split(/\s+/).filter(Boolean)
    if (max >= 0 && parts.length > max + 1) {
      // rejoin the tail
      const head = parts.slice(0, max)
      let rest = s.trim()
      for (const h of head) rest = rest.slice(rest.indexOf(h) + h.length).trimStart()
      return [...head, rest]
    }
    return parts
  }
  const sp = str(sep)
  if (!sp) throw err('ValueError', 'empty separator')
  const parts = s.split(sp)
  if (max >= 0 && parts.length > max + 1) return [...parts.slice(0, max), parts.slice(max).join(sp)]
  return parts
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return dp[a.length][b.length]
}

function moduleHint(mod: string, name: string): string {
  if (mod === 'RPi' && name === '') return " — write `import RPi.GPIO as GPIO`"
  if (mod === 'gpiozero' && name) return ' — the lab\'s gpiozero has LED, PWMLED, RGBLED, Button, Buzzer, TonalBuzzer, Servo, AngularServo, DistanceSensor, MotionSensor, Motor, DigitalOutputDevice, DigitalInputDevice, PWMOutputDevice'
  if (/^(numpy|pandas|requests|smbus2?|spidev|serial|machine|microbit|board|digitalio|picamera2?|cv2|PIL|tkinter|pygame)$/.test(mod)) {
    return ` — the lab's Python knows gpiozero, RPi.GPIO, time, signal, random and math (not ${mod})`
  }
  return name ? '' : " — the lab's Python knows gpiozero, RPi.GPIO, time, signal, random and math"
}
