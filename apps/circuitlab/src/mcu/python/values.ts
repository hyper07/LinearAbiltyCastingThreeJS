/**
 * Python values for the lab's interpreter and the operators on them.
 *
 *   None → null, bool → boolean, int → number, float → PyFloat (so 10 / 2
 *   prints 5.0), str → string, list → JS array, tuple → PyTuple, dict →
 *   PyDict, range → PyRange, functions → PyFunc / Builtin, modules and
 *   gpiozero devices → PyObj, exceptions → PyExc (classes: PyExcType).
 */
import { PyError } from './lexer'
import type { Expr, Param, Stmt } from './parser'

export class PyFloat {
  constructor(readonly v: number) {}
}
export class PyTuple {
  constructor(readonly items: Value[]) {}
}
export class PyRange {
  constructor(
    readonly start: number,
    readonly stop: number,
    readonly step: number,
  ) {}
  get length(): number {
    const n = Math.ceil((this.stop - this.start) / this.step)
    return Math.max(0, n)
  }
  at(i: number): number {
    return this.start + i * this.step
  }
}
export class PyDict {
  readonly map = new Map<string, [Value, Value]>()
  get(k: Value): Value | undefined {
    return this.map.get(hashKey(k))?.[1]
  }
  set(k: Value, v: Value): void {
    this.map.set(hashKey(k), [k, v])
  }
  has(k: Value): boolean {
    return this.map.has(hashKey(k))
  }
  delete(k: Value): boolean {
    return this.map.delete(hashKey(k))
  }
  keys(): Value[] {
    return [...this.map.values()].map((e) => e[0])
  }
}

/** a lexical scope: the module (locals = null) or a function call */
export class Scope {
  readonly vars = new Map<string, Value>()
  ret: Value = null
  constructor(
    readonly parent: Scope | null,
    readonly locals: Set<string> | null,
    readonly globalNames: Set<string> | null,
  ) {}
}

export class PyFunc {
  constructor(
    readonly name: string,
    readonly params: Param[],
    readonly defaults: (Value | undefined)[],
    readonly body: Stmt[] | null,
    readonly expr: Expr | null,
    readonly locals: Set<string>,
    readonly globals: Set<string>,
    readonly closure: Scope,
  ) {}
  /** parameters without a default */
  get required(): number {
    return this.params.filter((p, i) => !p.star && this.defaults[i] === undefined).length
  }
}

export interface Yielded {
  /** L = a loop back-edge (costs a little time), d = sleep until `until`, w = wait for the next solver step */
  k: 'L' | 'd' | 'w'
  line: number
  until?: number
}
export type Gen<T = Value> = Generator<Yielded, T, unknown>

export type Kw = Record<string, Value>
export class Builtin {
  constructor(
    readonly name: string,
    readonly fn: (args: Value[], kw: Kw) => Value | Gen,
    /** fn returns a generator (it may sleep or wait) */
    readonly gen = false,
  ) {}
}

/** a host object: module, gpiozero device, PWM object… */
export abstract class PyObj {
  abstract readonly type: string
  abstract getAttr(name: string): Value | undefined
  setAttr(_name: string, _v: Value): boolean {
    return false
  }
  repr(): string {
    return `<${this.type} object>`
  }
}

export class PyModule extends PyObj {
  readonly type = 'module'
  constructor(
    readonly name: string,
    readonly attrs: Record<string, Value>,
  ) {
    super()
  }
  getAttr(name: string): Value | undefined {
    return this.attrs[name]
  }
  setAttr(name: string, v: Value): boolean {
    this.attrs[name] = v
    return true
  }
  repr(): string {
    return `<module '${this.name}'>`
  }
}

export class PyExcType {
  constructor(
    readonly name: string,
    readonly parent: PyExcType | null,
  ) {}
  isSub(of: PyExcType): boolean {
    for (let t: PyExcType | null = this; t; t = t.parent) if (t === of) return true
    return false
  }
}
export class PyExc {
  constructor(
    readonly cls: PyExcType,
    readonly msg: string,
    readonly args: Value[],
  ) {}
}

export type Value = null | boolean | number | string | PyFloat | Value[] | PyTuple | PyDict | PyRange | PyFunc | Builtin | PyObj | PyExcType | PyExc

// ------------------------------------------------------------ exceptions

const EXC: Record<string, PyExcType> = {}
function exc(name: string, parent: string | null): void {
  EXC[name] = new PyExcType(name, parent ? EXC[parent] : null)
}
exc('BaseException', null)
exc('SystemExit', 'BaseException')
exc('KeyboardInterrupt', 'BaseException')
exc('Exception', 'BaseException')
for (const [n, p] of [
  ['ArithmeticError', 'Exception'], ['ZeroDivisionError', 'ArithmeticError'], ['OverflowError', 'ArithmeticError'],
  ['LookupError', 'Exception'], ['IndexError', 'LookupError'], ['KeyError', 'LookupError'],
  ['NameError', 'Exception'], ['UnboundLocalError', 'NameError'], ['TypeError', 'Exception'], ['ValueError', 'Exception'],
  ['AttributeError', 'Exception'], ['RuntimeError', 'Exception'], ['RecursionError', 'RuntimeError'],
  ['NotImplementedError', 'RuntimeError'], ['ImportError', 'Exception'], ['ModuleNotFoundError', 'ImportError'],
  ['AssertionError', 'Exception'], ['OSError', 'Exception'], ['TimeoutError', 'OSError'], ['StopIteration', 'Exception'],
  ['SyntaxError', 'Exception'], ['IndentationError', 'SyntaxError'],
  // gpiozero's own errors
  ['GPIOZeroError', 'Exception'], ['DeviceClosed', 'GPIOZeroError'], ['GPIODeviceError', 'GPIOZeroError'],
  ['GPIOPinInUse', 'GPIODeviceError'], ['PinError', 'GPIOZeroError'], ['PinInvalidPin', 'PinError'],
  ['PinFixedPull', 'PinError'], ['PinPWMUnsupported', 'PinError'], ['BadPinFactory', 'GPIOZeroError'],
] as [string, string][]) exc(n, p)
export const EXCEPTIONS = EXC

export function excType(name: string): PyExcType {
  return EXC[name] ?? EXC.Exception
}

export function err(type: string, msg: string): PyError {
  return new PyError(type, msg)
}

// ------------------------------------------------------------- basics

export const F = (n: number): PyFloat => new PyFloat(n)

export function isNum(v: Value): v is number | boolean | PyFloat {
  return typeof v === 'number' || typeof v === 'boolean' || v instanceof PyFloat
}
export function num(v: Value): number {
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v instanceof PyFloat) return v.v
  throw err('TypeError', `expected a number, got ${typeName(v)}`)
}
export function isInt(v: Value): v is number | boolean {
  return typeof v === 'number' || typeof v === 'boolean'
}
export function int(v: Value, what = 'value'): number {
  if (isInt(v)) return num(v)
  throw err('TypeError', `${what} must be an integer, not ${typeName(v)}`)
}

export function typeName(v: Value): string {
  if (v === null) return 'NoneType'
  if (typeof v === 'boolean') return 'bool'
  if (typeof v === 'number') return 'int'
  if (typeof v === 'string') return 'str'
  if (v instanceof PyFloat) return 'float'
  if (Array.isArray(v)) return 'list'
  if (v instanceof PyTuple) return 'tuple'
  if (v instanceof PyDict) return 'dict'
  if (v instanceof PyRange) return 'range'
  if (v instanceof PyFunc) return 'function'
  if (v instanceof Builtin) return 'builtin_function_or_method'
  if (v instanceof PyExcType) return 'type'
  if (v instanceof PyExc) return v.cls.name
  return v.type
}

export function truthy(v: Value): boolean {
  if (v === null || v === false || v === 0 || v === '') return false
  if (v === true || typeof v === 'number' || typeof v === 'string') return true
  if (v instanceof PyFloat) return v.v !== 0
  if (Array.isArray(v)) return v.length > 0
  if (v instanceof PyTuple) return v.items.length > 0
  if (v instanceof PyDict) return v.map.size > 0
  if (v instanceof PyRange) return v.length > 0
  return true
}

export function hashKey(v: Value): string {
  if (v === null) return 'N'
  if (isNum(v)) return `n${num(v)}`
  if (typeof v === 'string') return `s${v}`
  if (v instanceof PyTuple) return `t(${v.items.map(hashKey).join(',')})`
  if (Array.isArray(v) || v instanceof PyDict) throw err('TypeError', `unhashable type: '${typeName(v)}'`)
  return `o${typeName(v)}:${objId(v)}`
}
const ids = new WeakMap<object, number>()
let nextId = 0x7f3a2c10
export function objId(v: object): number {
  let id = ids.get(v)
  if (id === undefined) {
    id = nextId += 0x30
    ids.set(v, id)
  }
  return id
}

// ------------------------------------------------------------- printing

export function floatRepr(x: number): string {
  if (Number.isNaN(x)) return 'nan'
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf'
  if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0'
  const a = Math.abs(x)
  if (a >= 1e16 || a < 1e-4) return x.toExponential().replace(/e([+-])(\d)$/, 'e$10$2')
  const s = String(x)
  return /[.e]/.test(s) ? s : `${s}.0`
}

export function strRepr(s: string): string {
  const q = s.includes("'") && !s.includes('"') ? '"' : "'"
  let out = ''
  for (const c of s) {
    if (c === '\\') out += '\\\\'
    else if (c === '\n') out += '\\n'
    else if (c === '\t') out += '\\t'
    else if (c === '\r') out += '\\r'
    else if (c === q) out += '\\' + c
    else if (c.charCodeAt(0) < 32) out += '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')
    else out += c
  }
  return q + out + q
}

export function repr(v: Value, seen = new Set<object>()): string {
  if (typeof v === 'string') return strRepr(v)
  if (Array.isArray(v)) {
    if (seen.has(v)) return '[...]'
    seen.add(v)
    return `[${v.map((x) => repr(x, seen)).join(', ')}]`
  }
  if (v instanceof PyTuple) return v.items.length === 1 ? `(${repr(v.items[0], seen)},)` : `(${v.items.map((x) => repr(x, seen)).join(', ')})`
  if (v instanceof PyDict) return `{${[...v.map.values()].map(([k, x]) => `${repr(k, seen)}: ${repr(x, seen)}`).join(', ')}}`
  if (v instanceof PyExc) return `${v.cls.name}(${v.args.map((a) => repr(a, seen)).join(', ')})`
  return str(v)
}

export function str(v: Value): string {
  if (v === null) return 'None'
  if (v === true) return 'True'
  if (v === false) return 'False'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : floatRepr(v)
  if (typeof v === 'string') return v
  if (v instanceof PyFloat) return floatRepr(v.v)
  if (v instanceof PyRange) return v.step === 1 ? `range(${v.start}, ${v.stop})` : `range(${v.start}, ${v.stop}, ${v.step})`
  if (v instanceof PyFunc) return `<function ${v.name} at 0x${objId(v).toString(16)}>`
  if (v instanceof Builtin) return `<built-in method ${v.name}>`
  if (v instanceof PyExcType) return `<class '${v.name}'>`
  if (v instanceof PyExc) return v.args.length === 1 ? str(v.args[0]) : v.args.length ? repr(new PyTuple(v.args)) : v.msg
  if (v instanceof PyObj) return v.repr()
  return repr(v)
}

// ------------------------------------------------------------ operators

const OP_NAMES: Record<string, string> = { '+': '+', '-': '-', '*': '*', '/': '/', '//': '//', '%': '%', '**': '** or pow()' }

export function arith(op: string, a: Value, b: Value): Value {
  if (isNum(a) && isNum(b)) {
    const fl = a instanceof PyFloat || b instanceof PyFloat
    const x = num(a)
    const y = num(b)
    let r: number
    switch (op) {
      case '+': r = x + y; break
      case '-': r = x - y; break
      case '*': r = x * y; break
      case '/':
        if (y === 0) throw err('ZeroDivisionError', 'division by zero')
        return F(x / y)
      case '//':
        if (y === 0) throw err('ZeroDivisionError', fl ? 'float floor division by zero' : 'integer division or modulo by zero')
        r = Math.floor(x / y)
        break
      case '%':
        if (y === 0) throw err('ZeroDivisionError', fl ? 'float modulo' : 'integer modulo by zero')
        r = x - y * Math.floor(x / y)
        break
      case '**':
        if (x === 0 && y < 0) throw err('ZeroDivisionError', '0.0 cannot be raised to a negative power')
        r = x ** y
        if (!fl && y < 0) return F(r)
        break
      case '&': case '|': case '^': case '<<': case '>>': {
        if (fl) throw err('TypeError', `unsupported operand type(s) for ${op}: '${typeName(a)}' and '${typeName(b)}'`)
        if (op === '<<') r = x * 2 ** y
        else if (op === '>>') r = Math.floor(x / 2 ** y)
        else {
          const bx = BigInt(x)
          const by = BigInt(y)
          r = Number(op === '&' ? bx & by : op === '|' ? bx | by : bx ^ by)
        }
        break
      }
      default:
        throw err('TypeError', `unsupported operand '${op}'`)
    }
    return fl ? F(r) : r
  }
  if (op === '+') {
    if (typeof a === 'string' && typeof b === 'string') return a + b
    if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b]
    if (a instanceof PyTuple && b instanceof PyTuple) return new PyTuple([...a.items, ...b.items])
    if (typeof a === 'string') throw err('TypeError', `can only concatenate str (not "${typeName(b)}") to str — use str(${typeName(b) === 'int' || typeName(b) === 'float' ? 'x' : '…'}) or an f-string: f"…{x}"`)
  }
  if (op === '*') {
    const seq = (s: Value, n: Value): Value | undefined => {
      if (!isInt(n)) return undefined
      const k = Math.max(0, num(n))
      if (typeof s === 'string') return s.repeat(k)
      if (Array.isArray(s)) return Array.from({ length: k }, () => s).flat(1)
      if (s instanceof PyTuple) return new PyTuple(Array.from({ length: k }, () => s.items).flat(1))
      return undefined
    }
    const r = seq(a, b) ?? seq(b, a)
    if (r !== undefined) return r
  }
  if (op === '%' && typeof a === 'string') return percentFormat(a, b)
  throw err('TypeError', `unsupported operand type(s) for ${OP_NAMES[op] ?? op}: '${typeName(a)}' and '${typeName(b)}'`)
}

export function eq(a: Value, b: Value): boolean {
  if (a === b) return true
  if (isNum(a) && isNum(b)) return num(a) === num(b)
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => eq(x, b[i]))
  if (a instanceof PyTuple && b instanceof PyTuple) return a.items.length === b.items.length && a.items.every((x, i) => eq(x, b.items[i]))
  if (a instanceof PyDict && b instanceof PyDict) return a.map.size === b.map.size && [...a.map.entries()].every(([k, [, v]]) => b.map.has(k) && eq(v, b.map.get(k)![1]))
  if (a instanceof PyRange && b instanceof PyRange) return a.start === b.start && a.stop === b.stop && a.step === b.step
  return false
}

function order(a: Value, b: Value, op: string): number {
  if (isNum(a) && isNum(b)) return num(a) - num(b)
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0
  const la = Array.isArray(a) ? a : a instanceof PyTuple ? a.items : null
  const lb = Array.isArray(b) ? b : b instanceof PyTuple ? b.items : null
  if (la && lb && Array.isArray(a) === Array.isArray(b)) {
    for (let i = 0; i < Math.min(la.length, lb.length); i++) {
      if (!eq(la[i], lb[i])) return order(la[i], lb[i], op)
    }
    return la.length - lb.length
  }
  throw err('TypeError', `'${op}' not supported between instances of '${typeName(a)}' and '${typeName(b)}'`)
}

export function contains(container: Value, item: Value): boolean {
  if (typeof container === 'string') {
    if (typeof item !== 'string') throw err('TypeError', `'in <string>' requires string as left operand, not ${typeName(item)}`)
    return container.includes(item)
  }
  if (Array.isArray(container)) return container.some((x) => eq(x, item))
  if (container instanceof PyTuple) return container.items.some((x) => eq(x, item))
  if (container instanceof PyDict) return container.has(item)
  if (container instanceof PyRange) {
    if (!isNum(item)) return false
    const n = num(item)
    const k = (n - container.start) / container.step
    return Number.isInteger(k) && k >= 0 && k < container.length
  }
  throw err('TypeError', `argument of type '${typeName(container)}' is not iterable`)
}

export function compare(op: string, a: Value, b: Value): boolean {
  switch (op) {
    case '==': return eq(a, b)
    case '!=': return !eq(a, b)
    case '<': return order(a, b, op) < 0
    case '>': return order(a, b, op) > 0
    case '<=': return order(a, b, op) <= 0
    case '>=': return order(a, b, op) >= 0
    case 'in': return contains(b, a)
    case 'not in': return !contains(b, a)
    case 'is': return a === b || (a instanceof PyFloat && b instanceof PyFloat && a.v === b.v)
    case 'is not': return !(a === b || (a instanceof PyFloat && b instanceof PyFloat && a.v === b.v))
  }
  throw err('SyntaxError', `unknown comparison ${op}`)
}

export function sortValues(xs: Value[], keys?: Value[]): Value[] {
  const idx = xs.map((_, i) => i)
  const k = keys ?? xs
  idx.sort((i, j) => order(k[i], k[j], '<') || i - j)
  return idx.map((i) => xs[i])
}

// ------------------------------------------------------------ iteration

export function* iterate(v: Value): Generator<Value, void, unknown> {
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) yield v[i]
    return
  }
  if (typeof v === 'string') {
    for (const c of v) yield c
    return
  }
  if (v instanceof PyTuple) {
    yield* v.items
    return
  }
  if (v instanceof PyRange) {
    const n = v.length
    for (let i = 0; i < n; i++) yield v.at(i)
    return
  }
  if (v instanceof PyDict) {
    yield* v.keys()
    return
  }
  throw err('TypeError', `'${typeName(v)}' object is not iterable`)
}
export function toList(v: Value): Value[] {
  return [...iterate(v)]
}

export function len(v: Value): number {
  if (typeof v === 'string') return [...v].length
  if (Array.isArray(v)) return v.length
  if (v instanceof PyTuple) return v.items.length
  if (v instanceof PyDict) return v.map.size
  if (v instanceof PyRange) return v.length
  throw err('TypeError', `object of type '${typeName(v)}' has no len()`)
}

function normIndex(i: Value, n: number, what: string): number {
  if (!isInt(i)) throw err('TypeError', `${what} indices must be integers, not ${typeName(i)}`)
  let k = num(i)
  if (k < 0) k += n
  if (k < 0 || k >= n) throw err('IndexError', `${what} index out of range`)
  return k
}

export interface SliceSpec {
  lo: Value
  hi: Value
  step: Value
}
function sliceRange(s: SliceSpec, n: number): number[] {
  const step = s.step === null ? 1 : int(s.step, 'slice step')
  if (step === 0) throw err('ValueError', 'slice step cannot be zero')
  const clamp = (v: Value, dflt: number, lo: number, hi: number) => {
    if (v === null) return dflt
    let k = int(v, 'slice index')
    if (k < 0) k += n
    return Math.min(hi, Math.max(lo, k))
  }
  const out: number[] = []
  if (step > 0) {
    const a = clamp(s.lo, 0, 0, n)
    const b = clamp(s.hi, n, 0, n)
    for (let i = a; i < b; i += step) out.push(i)
  } else {
    const a = clamp(s.lo, n - 1, -1, n - 1)
    const b = clamp(s.hi, -1, -1, n - 1)
    for (let i = a; i > b; i += step) out.push(i)
  }
  return out
}

export function getItem(v: Value, i: Value | SliceSpec): Value {
  const slice = i !== null && typeof i === 'object' && 'lo' in i && 'hi' in i && 'step' in i && !(i instanceof PyObj) ? (i as SliceSpec) : null
  if (typeof v === 'string') {
    const chars = [...v]
    if (slice) return sliceRange(slice, chars.length).map((k) => chars[k]).join('')
    return chars[normIndex(i as Value, chars.length, 'string')]
  }
  if (Array.isArray(v)) {
    if (slice) return sliceRange(slice, v.length).map((k) => v[k])
    return v[normIndex(i as Value, v.length, 'list')]
  }
  if (v instanceof PyTuple) {
    if (slice) return new PyTuple(sliceRange(slice, v.items.length).map((k) => v.items[k]))
    return v.items[normIndex(i as Value, v.items.length, 'tuple')]
  }
  if (v instanceof PyRange) {
    if (slice) return sliceRange(slice, v.length).map((k) => v.at(k))
    return v.at(normIndex(i as Value, v.length, 'range object'))
  }
  if (v instanceof PyDict) {
    if (slice) throw err('TypeError', "unhashable type: 'slice'")
    const got = v.get(i as Value)
    if (got === undefined) throw err('KeyError', repr(i as Value))
    return got
  }
  throw err('TypeError', `'${typeName(v)}' object is not subscriptable`)
}

export function setItem(v: Value, i: Value | SliceSpec, x: Value): void {
  if (Array.isArray(v)) {
    if (i !== null && typeof i === 'object' && 'lo' in (i as object)) {
      const s = i as SliceSpec
      const idx = sliceRange(s, v.length)
      const items = toList(x)
      if (s.step === null || int(s.step) === 1) {
        const a = idx.length ? idx[0] : Math.min(v.length, Math.max(0, s.lo === null ? 0 : int(s.lo) < 0 ? int(s.lo) + v.length : int(s.lo)))
        v.splice(a, idx.length, ...items)
      } else {
        if (items.length !== idx.length) throw err('ValueError', `attempt to assign sequence of size ${items.length} to extended slice of size ${idx.length}`)
        idx.forEach((k, j) => (v[k] = items[j]))
      }
      return
    }
    v[normIndex(i as Value, v.length, 'list assignment')] = x
    return
  }
  if (v instanceof PyDict) {
    v.set(i as Value, x)
    return
  }
  if (typeof v === 'string') throw err('TypeError', "'str' object does not support item assignment (strings cannot be changed — build a new one)")
  if (v instanceof PyTuple) throw err('TypeError', "'tuple' object does not support item assignment")
  throw err('TypeError', `'${typeName(v)}' object does not support item assignment`)
}

// ------------------------------------------------------------ formatting

/** format(value, spec): [[fill]align][sign][#][0][width][,|_][.precision][type] */
export function formatSpec(v: Value, spec: string): string {
  if (!spec) return str(v)
  const m = /^(?:(.)?([<>=^]))?([+\- ])?(#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bcdeEfFgGnosxX%])?$/.exec(spec)
  if (!m) throw err('ValueError', `Invalid format specifier '${spec}'`)
  let [, fill, align] = m
  const [, , , sign, alt, zero, width, group, prec, type] = m
  let s: string
  const isNumber = isNum(v)
  if (type && 'bcdoxX'.includes(type)) {
    if (!isInt(v)) {
      if (type === 'd' && v instanceof PyFloat) throw err('ValueError', "Unknown format code 'd' for object of type 'float' — use :.0f or int(x)")
      throw err('ValueError', `Unknown format code '${type}' for object of type '${typeName(v)}'`)
    }
    const n = num(v)
    const base = type === 'b' ? 2 : type === 'o' ? 8 : type === 'x' || type === 'X' ? 16 : 10
    if (type === 'c') s = String.fromCharCode(n)
    else {
      s = Math.abs(n).toString(base)
      if (type === 'X') s = s.toUpperCase()
      if (alt && base !== 10) s = (type === 'b' ? '0b' : type === 'o' ? '0o' : type === 'x' ? '0x' : '0X') + s
      if (n < 0) s = '-' + s
    }
  } else if (type && 'eEfFgGn%'.includes(type)) {
    if (!isNumber) throw err('ValueError', `Unknown format code '${type}' for object of type '${typeName(v)}'`)
    let n = num(v)
    const p = prec === undefined ? 6 : Number(prec)
    if (type === '%') {
      n *= 100
      s = n.toFixed(p) + '%'
    } else if (type === 'f' || type === 'F') s = n.toFixed(p)
    else if (type === 'e' || type === 'E') {
      s = n.toExponential(p).replace(/e([+-])(\d)$/, 'e$10$2')
      if (type === 'E') s = s.toUpperCase()
    } else {
      s = String(Number(n.toPrecision(Math.max(1, p))))
    }
  } else if (isNumber && prec !== undefined && !type) {
    s = v instanceof PyFloat ? String(Number(num(v).toPrecision(Math.max(1, Number(prec))))) : str(v)
  } else {
    s = str(v)
    if (prec !== undefined && typeof v === 'string') s = s.slice(0, Number(prec))
  }
  if (group && isNumber) {
    const [ip, fp] = s.split('.')
    const neg = ip.startsWith('-')
    const digits = neg ? ip.slice(1) : ip
    s = (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, group) + (fp !== undefined ? '.' + fp : '')
  }
  if (sign && isNumber && !s.startsWith('-')) s = (sign === ' ' ? ' ' : sign === '+' ? '+' : '') + s
  const w = width ? Number(width) : 0
  if (zero && !align) {
    fill = '0'
    align = '='
  }
  if (s.length < w) {
    const f = fill ?? ' '
    const a = align ?? (isNumber ? '>' : '<')
    const pad = w - s.length
    if (a === '<') s = s + f.repeat(pad)
    else if (a === '>') s = f.repeat(pad) + s
    else if (a === '^') s = f.repeat(Math.floor(pad / 2)) + s + f.repeat(Math.ceil(pad / 2))
    else {
      const signCh = /^[+\- ]/.test(s) ? s[0] : ''
      s = signCh + f.repeat(pad) + s.slice(signCh.length)
    }
  }
  return s
}

/** "%d items, %.2f V" % (n, v) */
export function percentFormat(fmt: string, args: Value): string {
  const list = args instanceof PyTuple ? args.items : [args]
  let k = 0
  const out = fmt.replace(/%(\(\w+\))?([-+ #0]*)(\d+|\*)?(?:\.(\d+))?([diouxXeEfFgGcrsa%])/g, (_m, key: string | undefined, flags: string, width: string | undefined, prec: string | undefined, t: string) => {
    if (t === '%') return '%'
    let a: Value
    if (key) {
      if (!(args instanceof PyDict)) throw err('TypeError', 'format requires a mapping')
      a = args.get(key.slice(1, -1)) ?? null
    } else {
      if (k >= list.length) throw err('TypeError', 'not enough arguments for format string')
      a = list[k++]
    }
    let spec = ''
    if (flags.includes('-')) spec += '<'
    else if (flags.includes('0') && 'diouxXeEfFgG'.includes(t)) spec += '0'
    if (flags.includes('+')) spec = (spec.startsWith('<') ? '<+' : '+' + spec)
    spec += width ?? ''
    if (prec !== undefined) spec += '.' + prec
    if (t === 's' || t === 'a') return formatSpec(str(a), spec.replace(/^0/, ''))
    if (t === 'r') return formatSpec(repr(a), spec.replace(/^0/, ''))
    if (t === 'i' || t === 'u' || t === 'd') {
      if (!isNum(a)) throw err('TypeError', `%${t} format: a real number is required, not ${typeName(a)}`)
      return formatSpec(Math.trunc(num(a)), spec)
    }
    if (!isNum(a)) throw err('TypeError', `%${t} format: a real number is required, not ${typeName(a)}`)
    return formatSpec('xXo'.includes(t) ? Math.trunc(num(a)) : a instanceof PyFloat ? a : F(num(a)), spec + t)
  })
  if (k < list.length && !(args instanceof PyDict)) throw err('TypeError', 'not all arguments converted during string formatting')
  return out
}

/** "{} is {:.1f}".format(a, b) */
export function strFormat(fmt: string, args: Value[], kw: Kw): string {
  let auto = 0
  return fmt.replace(/\{\{|\}\}|\{([^{}]*)\}/g, (m, field: string | undefined) => {
    if (m === '{{') return '{'
    if (m === '}}') return '}'
    const f = field ?? ''
    const colon = f.indexOf(':')
    let name = colon >= 0 ? f.slice(0, colon) : f
    const spec = colon >= 0 ? f.slice(colon + 1) : ''
    let conv: string | null = null
    const bang = name.indexOf('!')
    if (bang >= 0) {
      conv = name.slice(bang + 1)
      name = name.slice(0, bang)
    }
    let v: Value
    if (name === '') {
      if (auto >= args.length) throw err('IndexError', 'Replacement index out of range for positional args tuple')
      v = args[auto++]
    } else if (/^\d+$/.test(name)) {
      const i = Number(name)
      if (i >= args.length) throw err('IndexError', `Replacement index ${i} out of range for positional args tuple`)
      v = args[i]
    } else {
      if (!(name in kw)) throw err('KeyError', strRepr(name))
      v = kw[name]
    }
    if (conv === 'r') v = repr(v)
    else if (conv === 's') v = str(v)
    return formatSpec(v, spec)
  })
}

/** Python 3 round(): halves go to the even neighbour */
export function pyRound(x: number, nd = 0): number {
  const m = 10 ** nd
  const y = x * m
  const r = Math.round(y)
  const out = Math.abs(y % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r
  return out / m
}
