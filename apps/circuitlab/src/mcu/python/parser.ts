/**
 * Parser for the lab's teaching subset of Python 3 → a small AST.
 *
 * Statements: assignment (chained, tuple unpacking, a[i] = …, obj.x = …),
 * augmented assignment, if / elif / else, while, for … in, break, continue,
 * pass, def (defaults, keyword arguments), return, global, import / from …
 * import, try / except / else / finally, raise, assert, del.
 * Expressions: the usual operators with Python precedence, chained
 * comparisons, `in` / `is`, conditional expressions, lambda, calls with
 * keyword arguments, attributes, indexing and slices, list / tuple / dict
 * literals, list comprehensions and f-strings.
 *
 * Anything outside the subset (class, with, yield, async…) is a SyntaxError
 * that names the line and says what the lab's Python understands.
 */
import { PyError, tokenize, unescape, type Tok } from './lexer'

export type Expr =
  | { k: 'num'; v: number; float: boolean; line: number }
  | { k: 'str'; v: string; line: number }
  | { k: 'fstr'; parts: (string | { e: Expr; conv?: string; spec: string })[]; line: number }
  | { k: 'const'; v: boolean | null; line: number }
  | { k: 'name'; id: string; line: number }
  | { k: 'list' | 'tuple'; items: Expr[]; line: number }
  | { k: 'dict'; keys: Expr[]; values: Expr[]; line: number }
  | { k: 'bin'; op: string; l: Expr; r: Expr; line: number }
  | { k: 'unary'; op: string; e: Expr; line: number }
  | { k: 'bool'; op: 'and' | 'or'; l: Expr; r: Expr; line: number }
  | { k: 'not'; e: Expr; line: number }
  | { k: 'cmp'; ops: string[]; items: Expr[]; line: number }
  | { k: 'ifexp'; c: Expr; a: Expr; b: Expr; line: number }
  | { k: 'call'; f: Expr; args: Expr[]; star: Expr | null; kw: { name: string; e: Expr }[]; line: number }
  | { k: 'attr'; e: Expr; name: string; line: number }
  | { k: 'index'; e: Expr; i: Expr; line: number }
  | { k: 'slice'; lo: Expr | null; hi: Expr | null; step: Expr | null; line: number }
  | { k: 'lambda'; params: Param[]; body: Expr; line: number }
  | { k: 'comp'; e: Expr; target: Expr; iter: Expr; conds: Expr[]; line: number }

export interface Param {
  name: string
  def: Expr | null
  /** *args */
  star?: boolean
}

export type Stmt =
  | { k: 'expr'; e: Expr; line: number }
  | { k: 'assign'; targets: Expr[]; value: Expr; line: number }
  | { k: 'aug'; target: Expr; op: string; value: Expr; line: number }
  | { k: 'if'; tests: [Expr, Stmt[]][]; orelse: Stmt[] | null; line: number }
  | { k: 'while'; c: Expr; body: Stmt[]; orelse: Stmt[] | null; line: number }
  | { k: 'for'; target: Expr; iter: Expr; body: Stmt[]; orelse: Stmt[] | null; line: number }
  | { k: 'break' | 'continue' | 'pass'; line: number }
  | { k: 'def'; name: string; params: Param[]; body: Stmt[]; locals: Set<string>; globals: Set<string>; line: number }
  | { k: 'return'; e: Expr | null; line: number }
  | { k: 'global'; names: string[]; line: number }
  | { k: 'import'; names: { mod: string; as: string | null }[]; line: number }
  | { k: 'from'; mod: string; names: { name: string; as: string | null }[] | '*'; line: number }
  | { k: 'try'; body: Stmt[]; handlers: { types: Expr | null; as: string | null; body: Stmt[]; line: number }[]; orelse: Stmt[] | null; final: Stmt[] | null; line: number }
  | { k: 'raise'; e: Expr | null; line: number }
  | { k: 'assert'; c: Expr; msg: Expr | null; line: number }
  | { k: 'del'; targets: Expr[]; line: number }

const SUBSET =
  "The lab's Python understands variables, if / elif / else, while, for … in, def, lists, dicts, f-strings, try / except and the gpiozero, RPi.GPIO, time, signal, random and math modules."

const UNSUPPORTED: Record<string, string> = {
  class: 'classes (`class`) are not supported in the lab\'s Python — use functions and variables instead',
  with: '`with` blocks are not supported in the lab\'s Python',
  yield: 'generators (`yield`) are not supported in the lab\'s Python',
  async: '`async` is not supported in the lab\'s Python',
  await: '`await` is not supported in the lab\'s Python',
  nonlocal: '`nonlocal` is not supported in the lab\'s Python — use `global` or return a value',
  match: '`match` statements are not supported in the lab\'s Python — use if / elif',
}

const KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
  'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
  'return', 'try', 'while', 'with', 'yield', 'async', 'await',
])

class Parser {
  private p = 0
  constructor(private readonly toks: Tok[]) {}

  private get t(): Tok {
    return this.toks[this.p]
  }
  private peek(n = 1): Tok {
    return this.toks[Math.min(this.p + n, this.toks.length - 1)]
  }
  private next(): Tok {
    return this.toks[this.p++]
  }
  private isOp(v: string): boolean {
    return this.t.k === 'op' && this.t.v === v
  }
  private isKw(v: string): boolean {
    return this.t.k === 'name' && this.t.v === v
  }
  private err(msg: string, tok: Tok = this.t): never {
    throw new PyError('SyntaxError', msg, tok.line)
  }
  private describe(tok: Tok): string {
    if (tok.k === 'nl') return 'the end of the line'
    if (tok.k === 'eof') return 'the end of the program'
    if (tok.k === 'indent') return 'an indented line'
    if (tok.k === 'dedent') return 'the end of the block'
    if (tok.k === 'str' || tok.k === 'fstr') return 'a string'
    return `'${tok.v}'`
  }
  private expectOp(v: string, what?: string): Tok {
    if (!this.isOp(v)) {
      if (v === ':' && (this.t.k === 'nl' || this.t.k === 'eof')) this.err(`expected ':' at the end of the line${what ? ` (after ${what})` : ''}`)
      if (v === ')' || v === ']' || v === '}') this.err(`'${v}' was never closed — expected '${v}' but found ${this.describe(this.t)}`)
      this.err(`expected '${v}' but found ${this.describe(this.t)}`)
    }
    return this.next()
  }
  private expectKw(v: string): void {
    if (!this.isKw(v)) this.err(`expected '${v}' but found ${this.describe(this.t)}`)
    this.next()
  }
  private name(): string {
    const t = this.t
    if (t.k !== 'name' || KEYWORDS.has(t.v)) this.err(`expected a name but found ${this.describe(t)}`)
    this.next()
    return t.v
  }
  private endStmt(): void {
    if (this.isOp(';')) {
      this.next()
      return
    }
    if (this.t.k === 'nl') {
      this.next()
      return
    }
    if (this.t.k === 'eof' || this.t.k === 'dedent') return
    if (this.t.k === 'name' && this.toks[this.p - 1]?.k === 'name' && !KEYWORDS.has(this.t.v)) {
      this.err(`invalid syntax — two names in a row ('${this.toks[this.p - 1].v} ${this.t.v}'). A missing operator, comma or quote?`)
    }
    this.err(`invalid syntax near ${this.describe(this.t)}`)
  }

  // ---------------------------------------------------------- statements

  program(): Stmt[] {
    const out: Stmt[] = []
    while (this.t.k !== 'eof') {
      if (this.t.k === 'nl') {
        this.next()
        continue
      }
      if (this.t.k === 'indent') this.err('unexpected indent — this line starts further right than the one above it', this.t)
      out.push(...this.statement())
    }
    return out
  }

  private block(what: string): Stmt[] {
    this.expectOp(':', what)
    if (this.t.k !== 'nl') {
      // one-line body: `if x: y = 1`
      return this.simpleLine()
    }
    this.next()
    if ((this.t as Tok).k !== 'indent') this.err(`expected an indented block after ${what}`, this.t)
    this.next()
    const body: Stmt[] = []
    while ((this.t as Tok).k !== 'dedent' && (this.t as Tok).k !== 'eof') {
      if (this.t.k === 'nl') {
        this.next()
        continue
      }
      body.push(...this.statement())
    }
    if ((this.t as Tok).k === 'dedent') this.next()
    return body
  }

  private statement(): Stmt[] {
    const t = this.t
    if (t.k === 'op' && t.v === '@') this.err('decorators (@…) are not supported in the lab\'s Python')
    if (t.k === 'name') {
      if (UNSUPPORTED[t.v] && !(t.v === 'match' && !(this.peek().k === 'name' || this.peek().k === 'num'))) this.err(UNSUPPORTED[t.v])
      switch (t.v) {
        case 'if':
          return [this.ifStmt()]
        case 'while': {
          this.next()
          const c = this.expr()
          const body = this.block("'while'")
          const orelse = this.isKw('else') ? (this.next(), this.block("'else'")) : null
          return [{ k: 'while', c, body, orelse, line: t.line }]
        }
        case 'for': {
          this.next()
          const target = this.targetList()
          this.expectKw('in')
          const iter = this.exprList()
          const body = this.block("'for'")
          const orelse = this.isKw('else') ? (this.next(), this.block("'else'")) : null
          return [{ k: 'for', target, iter, body, orelse, line: t.line }]
        }
        case 'def':
          return [this.defStmt()]
        case 'try':
          return [this.tryStmt()]
        case 'elif':
        case 'else':
        case 'except':
        case 'finally':
          this.err(`'${t.v}' without a matching ${t.v === 'except' || t.v === 'finally' ? "'try'" : "'if'"} above it (check the indentation)`)
      }
    }
    return this.simpleLine()
  }

  private simpleLine(): Stmt[] {
    const out: Stmt[] = [this.simple()]
    while (this.isOp(';') && this.peek().k !== 'nl') {
      this.next()
      out.push(this.simple())
    }
    this.endStmt()
    return out
  }

  private ifStmt(): Stmt {
    const line = this.t.line
    this.next()
    const tests: [Expr, Stmt[]][] = [[this.expr(), this.block("'if'")]]
    let orelse: Stmt[] | null = null
    for (;;) {
      if (this.isKw('elif')) {
        this.next()
        tests.push([this.expr(), this.block("'elif'")])
      } else if (this.isKw('else')) {
        this.next()
        orelse = this.block("'else'")
        break
      } else break
    }
    return { k: 'if', tests, orelse, line }
  }

  private params(close: string): Param[] {
    const ps: Param[] = []
    while (!this.isOp(close)) {
      if (this.isOp('*')) {
        this.next()
        ps.push({ name: this.name(), def: null, star: true })
      } else {
        if (this.isOp('**')) this.err('**kwargs parameters are not supported in the lab\'s Python')
        const name = this.name()
        if (this.isOp(':') && close === ')') {
          // type hint: skip it
          this.next()
          this.expr()
        }
        const def = this.isOp('=') ? (this.next(), this.expr()) : null
        ps.push({ name, def })
      }
      if (!this.isOp(',')) break
      this.next()
    }
    return ps
  }

  private defStmt(): Stmt {
    const line = this.t.line
    this.next()
    const name = this.name()
    this.expectOp('(')
    const params = this.params(')')
    this.expectOp(')')
    if (this.isOp('->')) {
      this.next()
      this.expr()
    }
    const body = this.block(`'def ${name}(…)'`)
    const globals = new Set<string>()
    const locals = new Set<string>(params.map((p) => p.name))
    collectLocals(body, locals, globals)
    for (const g of globals) locals.delete(g)
    return { k: 'def', name, params, body, locals, globals, line }
  }

  private tryStmt(): Stmt {
    const line = this.t.line
    this.next()
    const body = this.block("'try'")
    const handlers: { types: Expr | null; as: string | null; body: Stmt[]; line: number }[] = []
    while (this.isKw('except')) {
      const hl = this.t.line
      this.next()
      let types: Expr | null = null
      let as: string | null = null
      if (!this.isOp(':')) {
        types = this.expr()
        if (this.isKw('as')) {
          this.next()
          as = this.name()
        }
      }
      handlers.push({ types, as, body: this.block("'except'"), line: hl })
    }
    const orelse = this.isKw('else') ? (this.next(), this.block("'else'")) : null
    const final = this.isKw('finally') ? (this.next(), this.block("'finally'")) : null
    if (!handlers.length && !final) this.err("'try' needs an 'except' or a 'finally' block")
    return { k: 'try', body, handlers, orelse, final, line }
  }

  private dotted(): string {
    let s = this.name()
    while (this.isOp('.')) {
      this.next()
      s += '.' + this.name()
    }
    return s
  }

  private simple(): Stmt {
    const t = this.t
    const line = t.line
    if (t.k === 'name') {
      switch (t.v) {
        case 'pass':
        case 'break':
        case 'continue':
          this.next()
          return { k: t.v, line }
        case 'return': {
          this.next()
          const e = this.t.k === 'nl' || this.isOp(';') || this.t.k === 'eof' ? null : this.exprList()
          return { k: 'return', e, line }
        }
        case 'global': {
          this.next()
          const names = [this.name()]
          while (this.isOp(',')) {
            this.next()
            names.push(this.name())
          }
          return { k: 'global', names, line }
        }
        case 'import': {
          this.next()
          const names: { mod: string; as: string | null }[] = []
          do {
            if (this.isOp(',')) this.next()
            const mod = this.dotted()
            const as = this.isKw('as') ? (this.next(), this.name()) : null
            names.push({ mod, as })
          } while (this.isOp(','))
          return { k: 'import', names, line }
        }
        case 'from': {
          this.next()
          const mod = this.dotted()
          this.expectKw('import')
          if (this.isOp('*')) {
            this.next()
            return { k: 'from', mod, names: '*', line }
          }
          const paren = this.isOp('(')
          if (paren) this.next()
          const names: { name: string; as: string | null }[] = []
          do {
            if (this.isOp(',')) this.next()
            if (paren && this.isOp(')')) break
            const name = this.name()
            const as = this.isKw('as') ? (this.next(), this.name()) : null
            names.push({ name, as })
          } while (this.isOp(','))
          if (paren) this.expectOp(')')
          return { k: 'from', mod, names, line }
        }
        case 'raise': {
          this.next()
          const e = this.t.k === 'nl' || this.t.k === 'eof' ? null : this.expr()
          if (this.isKw('from')) {
            this.next()
            this.expr()
          }
          return { k: 'raise', e, line }
        }
        case 'assert': {
          this.next()
          const c = this.expr()
          const msg = this.isOp(',') ? (this.next(), this.expr()) : null
          return { k: 'assert', c, msg, line }
        }
        case 'del': {
          this.next()
          const targets = [this.expr()]
          while (this.isOp(',')) {
            this.next()
            targets.push(this.expr())
          }
          return { k: 'del', targets, line }
        }
      }
    }
    const first = this.exprList()
    if (this.t.k === 'op') {
      const op = this.t.v
      if (op === '=') {
        const targets = [first]
        let value: Expr = first
        while (this.isOp('=')) {
          this.next()
          value = this.exprList()
          targets.push(value)
        }
        targets.pop()
        for (const tg of targets) checkTarget(tg)
        return { k: 'assign', targets, value, line }
      }
      if (/^(\+|-|\*|\/|\/\/|%|\*\*|&|\||\^|<<|>>)=$/.test(op)) {
        this.next()
        checkTarget(first)
        if (first.k === 'tuple' || first.k === 'list') this.err('an augmented assignment (+= …) needs a single target', t)
        return { k: 'aug', target: first, op: op.slice(0, -1), value: this.exprList(), line }
      }
      if (op === ':' && first.k === 'name') {
        // annotated assignment: x: int = 5
        this.next()
        this.expr()
        if (this.isOp('=')) {
          this.next()
          return { k: 'assign', targets: [first], value: this.exprList(), line }
        }
        return { k: 'pass', line }
      }
    }
    return { k: 'expr', e: first, line }
  }

  // --------------------------------------------------------- expressions

  /** `a, b` → tuple; a single expression otherwise */
  exprList(): Expr {
    const line = this.t.line
    const first = this.isOp('*') ? this.err('starred expressions are not supported in the lab\'s Python') : this.expr()
    if (!this.isOp(',')) return first
    const items = [first]
    while (this.isOp(',')) {
      this.next()
      if (this.t.k === 'nl' || this.isOp('=') || this.isOp(')') || this.t.k === 'eof' || this.isOp(';')) break
      items.push(this.expr())
    }
    return { k: 'tuple', items, line }
  }

  /** for-loop targets: names / tuples, stops before `in` */
  private targetList(): Expr {
    const line = this.t.line
    const one = (): Expr => {
      if (this.isOp('(') || this.isOp('[')) {
        const close = this.isOp('(') ? ')' : ']'
        this.next()
        const inner = this.targetList()
        this.expectOp(close)
        return inner
      }
      return { k: 'name', id: this.name(), line: this.t.line }
    }
    const first = one()
    if (!this.isOp(',')) return first
    const items = [first]
    while (this.isOp(',')) {
      this.next()
      if (this.isKw('in')) break
      items.push(one())
    }
    return { k: 'tuple', items, line }
  }

  expr(): Expr {
    const line = this.t.line
    if (this.isKw('lambda')) {
      this.next()
      const params = this.params(':')
      this.expectOp(':')
      return { k: 'lambda', params, body: this.expr(), line }
    }
    const a = this.orExpr()
    if (this.isKw('if') ) {
      this.next()
      const c = this.orExpr()
      if (!this.isKw('else')) this.err("a conditional expression needs 'else' (x if condition else y)")
      this.next()
      return { k: 'ifexp', c, a, b: this.expr(), line }
    }
    return a
  }

  private orExpr(): Expr {
    let l = this.andExpr()
    while (this.isKw('or')) {
      const line = this.next().line
      l = { k: 'bool', op: 'or', l, r: this.andExpr(), line }
    }
    return l
  }
  private andExpr(): Expr {
    let l = this.notExpr()
    while (this.isKw('and')) {
      const line = this.next().line
      l = { k: 'bool', op: 'and', l, r: this.notExpr(), line }
    }
    return l
  }
  private notExpr(): Expr {
    if (this.isKw('not')) {
      const line = this.next().line
      return { k: 'not', e: this.notExpr(), line }
    }
    return this.comparison()
  }
  private comparison(): Expr {
    const line = this.t.line
    const first = this.bitOr()
    const ops: string[] = []
    const items = [first]
    for (;;) {
      let op: string | null = null
      if (this.t.k === 'op' && ['<', '>', '==', '>=', '<=', '!='].includes(this.t.v)) op = this.next().v
      else if (this.isKw('in')) {
        this.next()
        op = 'in'
      } else if (this.isKw('not') && this.peek().k === 'name' && this.peek().v === 'in') {
        this.next()
        this.next()
        op = 'not in'
      } else if (this.isKw('is')) {
        this.next()
        if (this.isKw('not')) {
          this.next()
          op = 'is not'
        } else op = 'is'
      } else if (this.isOp('=') && this.peek().k !== 'op') {
        // `if x = 5:` — a classic slip
        if (this.toks[this.p + 2]?.k === 'op' && this.toks[this.p + 2].v === ':') this.err("'=' assigns a value; to compare use '=='")
        break
      } else break
      ops.push(op)
      items.push(this.bitOr())
    }
    return ops.length ? { k: 'cmp', ops, items, line } : first
  }
  private binLevel(ops: string[], sub: () => Expr): Expr {
    let l = sub()
    while (this.t.k === 'op' && ops.includes(this.t.v)) {
      const t = this.next()
      l = { k: 'bin', op: t.v, l, r: sub(), line: t.line }
    }
    return l
  }
  private bitOr = (): Expr => this.binLevel(['|'], this.bitXor)
  private bitXor = (): Expr => this.binLevel(['^'], this.bitAnd)
  private bitAnd = (): Expr => this.binLevel(['&'], this.shift)
  private shift = (): Expr => this.binLevel(['<<', '>>'], this.arith)
  private arith = (): Expr => this.binLevel(['+', '-'], this.term)
  private term = (): Expr => this.binLevel(['*', '/', '//', '%', '@'], this.factor)
  private factor = (): Expr => {
    if (this.t.k === 'op' && (this.t.v === '-' || this.t.v === '+' || this.t.v === '~')) {
      const t = this.next()
      return { k: 'unary', op: t.v, e: this.factor(), line: t.line }
    }
    return this.power()
  }
  private power(): Expr {
    const base = this.primary()
    if (this.isOp('**')) {
      const t = this.next()
      return { k: 'bin', op: '**', l: base, r: this.factor(), line: t.line }
    }
    return base
  }

  private primary(): Expr {
    let e = this.atom()
    for (;;) {
      if (this.isOp('(')) {
        const line = this.next().line
        const args: Expr[] = []
        const kw: { name: string; e: Expr }[] = []
        let star: Expr | null = null
        while (!this.isOp(')')) {
          if (this.isOp('*')) {
            this.next()
            star = this.expr()
          } else if (this.isOp('**')) {
            this.err('**kwargs in calls are not supported in the lab\'s Python')
          } else if (this.t.k === 'name' && this.peek().k === 'op' && this.peek().v === '=') {
            const name = this.next().v
            this.next()
            kw.push({ name, e: this.expr() })
          } else {
            if (kw.length) this.err('a positional argument cannot follow a keyword argument')
            const a = this.expr()
            if (this.isKw('for')) args.push(this.comprehension(a, line, ')'))
            else args.push(a)
          }
          if (!this.isOp(',')) break
          this.next()
        }
        this.expectOp(')')
        e = { k: 'call', f: e, args, star, kw, line }
      } else if (this.isOp('[')) {
        const line = this.next().line
        const i = this.subscript()
        this.expectOp(']')
        e = { k: 'index', e, i, line }
      } else if (this.isOp('.')) {
        const line = this.next().line
        e = { k: 'attr', e, name: this.name(), line }
      } else return e
    }
  }

  private subscript(): Expr {
    const line = this.t.line
    const part = (): Expr | null => (this.isOp(':') || this.isOp(']') ? null : this.expr())
    const lo = part()
    if (!this.isOp(':')) {
      if (this.isOp(',')) {
        const items = [lo as Expr]
        while (this.isOp(',')) {
          this.next()
          if (this.isOp(']')) break
          items.push(this.expr())
        }
        return { k: 'tuple', items, line }
      }
      if (!lo) this.err('empty [] — put an index inside')
      return lo as Expr
    }
    this.next()
    const hi = part()
    let step: Expr | null = null
    if (this.isOp(':')) {
      this.next()
      step = part()
    }
    return { k: 'slice', lo, hi, step, line }
  }

  private comprehension(e: Expr, line: number, close: string): Expr {
    this.expectKw('for')
    const target = this.targetList()
    this.expectKw('in')
    const iter = this.orExpr()
    const conds: Expr[] = []
    while (this.isKw('if')) {
      this.next()
      conds.push(this.orExpr())
    }
    if (this.isKw('for')) this.err('nested comprehensions are not supported in the lab\'s Python — use a for loop')
    if (!this.isOp(close)) this.err(`expected '${close}' after the comprehension`)
    return { k: 'comp', e, target, iter, conds, line }
  }

  private atom(): Expr {
    const t = this.t
    const line = t.line
    switch (t.k) {
      case 'num': {
        this.next()
        const s = t.v
        if (/^0[xX]/.test(s)) return { k: 'num', v: parseInt(s.slice(2), 16), float: false, line }
        if (/^0[bB]/.test(s)) return { k: 'num', v: parseInt(s.slice(2), 2), float: false, line }
        if (/^0[oO]/.test(s)) return { k: 'num', v: parseInt(s.slice(2), 8), float: false, line }
        const float = /[.eE]/.test(s)
        if (!float && /^0\d/.test(s)) this.err('leading zeros in a number are not allowed (write 8, not 08; use 0o10 for octal)', t)
        return { k: 'num', v: Number(s), float, line }
      }
      case 'str':
      case 'fstr': {
        // adjacent string literals join: "a" "b"
        const parts: (string | { e: Expr; conv?: string; spec: string })[] = []
        let anyF = false
        while (this.t.k === 'str' || this.t.k === 'fstr') {
          const s = this.next()
          if (s.k === 'str') parts.push(s.v)
          else {
            anyF = true
            parts.push(...parseFString(s.v, s.line))
          }
        }
        if (!anyF) return { k: 'str', v: parts.join(''), line }
        return { k: 'fstr', parts, line }
      }
      case 'name': {
        if (t.v === 'True' || t.v === 'False' || t.v === 'None') {
          this.next()
          return { k: 'const', v: t.v === 'None' ? null : t.v === 'True', line }
        }
        if (UNSUPPORTED[t.v] && t.v !== 'match') this.err(UNSUPPORTED[t.v])
        if (KEYWORDS.has(t.v)) this.err(`'${t.v}' cannot be used here`)
        this.next()
        return { k: 'name', id: t.v, line }
      }
      case 'op': {
        if (t.v === '(') {
          this.next()
          if (this.isOp(')')) {
            this.next()
            return { k: 'tuple', items: [], line }
          }
          const first = this.expr()
          if (this.isKw('for')) {
            const c = this.comprehension(first, line, ')')
            this.expectOp(')')
            return { k: 'call', f: { k: 'name', id: 'list', line }, args: [c], star: null, kw: [], line }
          }
          if (this.isOp(')')) {
            this.next()
            return first
          }
          const items = [first]
          while (this.isOp(',')) {
            this.next()
            if (this.isOp(')')) break
            items.push(this.expr())
          }
          this.expectOp(')')
          return { k: 'tuple', items, line }
        }
        if (t.v === '[') {
          this.next()
          const items: Expr[] = []
          if (!this.isOp(']')) {
            const first = this.expr()
            if (this.isKw('for')) {
              const c = this.comprehension(first, line, ']')
              this.expectOp(']')
              return c
            }
            items.push(first)
            while (this.isOp(',')) {
              this.next()
              if (this.isOp(']')) break
              items.push(this.expr())
            }
          }
          this.expectOp(']')
          return { k: 'list', items, line }
        }
        if (t.v === '{') {
          this.next()
          const keys: Expr[] = []
          const values: Expr[] = []
          while (!this.isOp('}')) {
            keys.push(this.expr())
            if (!this.isOp(':')) this.err('sets ({1, 2}) are not supported in the lab\'s Python — use a list [1, 2]')
            this.next()
            values.push(this.expr())
            if (!this.isOp(',')) break
            this.next()
          }
          this.expectOp('}')
          return { k: 'dict', keys, values, line }
        }
        if (t.v === '...') {
          this.next()
          return { k: 'const', v: null, line }
        }
        break
      }
      case 'indent':
        this.err('unexpected indent')
    }
    this.err(`invalid syntax near ${this.describe(t)}`)
  }
}

function checkTarget(e: Expr): void {
  if (e.k === 'name' || e.k === 'attr' || e.k === 'index') return
  if (e.k === 'tuple' || e.k === 'list') {
    e.items.forEach(checkTarget)
    return
  }
  const what = e.k === 'call' ? 'a function call' : e.k === 'num' || e.k === 'str' ? 'a literal' : 'an expression'
  throw new PyError('SyntaxError', `cannot assign to ${what} — the left side of '=' must be a variable name`, e.line)
}

/** names a function assigns (its locals) and the ones it declares global */
function collectLocals(body: Stmt[], locals: Set<string>, globals: Set<string>): void {
  const target = (e: Expr) => {
    if (e.k === 'name') locals.add(e.id)
    else if (e.k === 'tuple' || e.k === 'list') e.items.forEach(target)
  }
  for (const s of body) {
    switch (s.k) {
      case 'assign':
        s.targets.forEach(target)
        break
      case 'aug':
        target(s.target)
        break
      case 'for':
        target(s.target)
        collectLocals(s.body, locals, globals)
        if (s.orelse) collectLocals(s.orelse, locals, globals)
        break
      case 'while':
        collectLocals(s.body, locals, globals)
        if (s.orelse) collectLocals(s.orelse, locals, globals)
        break
      case 'if':
        for (const [, b] of s.tests) collectLocals(b, locals, globals)
        if (s.orelse) collectLocals(s.orelse, locals, globals)
        break
      case 'try':
        collectLocals(s.body, locals, globals)
        for (const h of s.handlers) {
          if (h.as) locals.add(h.as)
          collectLocals(h.body, locals, globals)
        }
        if (s.orelse) collectLocals(s.orelse, locals, globals)
        if (s.final) collectLocals(s.final, locals, globals)
        break
      case 'def':
        locals.add(s.name)
        break
      case 'import':
        for (const n of s.names) locals.add(n.as ?? n.mod.split('.')[0])
        break
      case 'from':
        if (s.names !== '*') for (const n of s.names) locals.add(n.as ?? n.name)
        break
      case 'global':
        for (const n of s.names) globals.add(n)
        break
    }
  }
}

/** split an f-string body into literal text and {expression!conv:spec} fields */
function parseFString(raw: string, line: number): (string | { e: Expr; conv?: string; spec: string })[] {
  const escaped = raw.startsWith('\u0001')
  const s = escaped ? raw.slice(1) : raw
  const lit = (x: string) => (escaped ? unescape(x, line) : x)
  const out: (string | { e: Expr; conv?: string; spec: string })[] = []
  let buf = ''
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === '{' && s[i + 1] === '{') {
      buf += '{'
      i += 2
      continue
    }
    if (c === '}' && s[i + 1] === '}') {
      buf += '}'
      i += 2
      continue
    }
    if (c === '}') throw new PyError('SyntaxError', "f-string: single '}' is not allowed", line)
    if (c !== '{') {
      buf += c
      i++
      continue
    }
    if (buf) out.push(lit(buf))
    buf = ''
    // find the matching close brace, respecting nesting and quotes
    let depth = 0
    let j = i + 1
    let quote: string | null = null
    let exprEnd = -1
    let convAt = -1
    let specAt = -1
    for (; j < s.length; j++) {
      const ch = s[j]
      if (quote) {
        if (ch === quote) quote = null
        continue
      }
      if (ch === "'" || ch === '"') quote = ch
      else if (ch === '(' || ch === '[' || ch === '{') depth++
      else if ((ch === ')' || ch === ']' || ch === '}') && depth > 0) depth--
      else if (depth === 0 && ch === '!' && s[j + 1] !== '=' && convAt < 0 && specAt < 0) convAt = j
      else if (depth === 0 && ch === ':' && specAt < 0) specAt = j
      else if (depth === 0 && ch === '}') {
        exprEnd = j
        break
      }
    }
    if (exprEnd < 0) throw new PyError('SyntaxError', "f-string: expecting '}'", line)
    const eEnd = convAt >= 0 ? convAt : specAt >= 0 ? specAt : exprEnd
    let src = s.slice(i + 1, eEnd)
    const selfDoc = /=\s*$/.test(src) && !/[=!<>]=\s*$/.test(src)
    if (selfDoc) src = src.replace(/=\s*$/, '')
    if (!src.trim()) throw new PyError('SyntaxError', 'f-string: empty expression not allowed', line)
    const conv = convAt >= 0 ? s.slice(convAt + 1, specAt >= 0 ? specAt : exprEnd) : undefined
    const spec = specAt >= 0 ? s.slice(specAt + 1, exprEnd) : ''
    const toks = tokenize(src.trim()).map((t) => ({ ...t, line }))
    const p = new Parser(toks)
    const e = p.exprList()
    if (selfDoc) out.push(src + '=')
    out.push({ e, conv: conv ?? (selfDoc && !spec ? 'r' : undefined), spec })
    i = exprEnd + 1
  }
  if (buf) out.push(lit(buf))
  return out
}

export function parse(src: string): Stmt[] {
  const toks = tokenize(src.replace(/\r\n?/g, '\n'))
  return new Parser(toks).program()
}

export { SUBSET }
