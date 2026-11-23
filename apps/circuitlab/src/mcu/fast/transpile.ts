/**
 * Instant mode: turn an Arduino sketch (a C++ subset) into JavaScript
 * generator functions that run against the simulated pins.
 *
 * The idea comes from OpenCircuit 3D's fast Arduino runtime (MIT, see
 * NOTICE): rewrite declarations and calls with patterns instead of compiling.
 * Ours emits GENERATORS instead of async functions, so the program runs in
 * SIMULATION time: delay() and every loop iteration yield to the scheduler,
 * which resumes the sketch at the right sim time inside the solver loop.
 * Each yield carries its source line, which the code panel highlights.
 *
 * Supported: globals and locals of the usual types (int/long/byte/float/
 * bool/char/String/uint8_t…, unsigned/const/static/volatile), arrays and
 * brace initialisers, #define constants and simple macros, functions with
 * typed parameters, if/else/for/while/do/switch, casts, integer division on
 * int variables, char literals, the Arduino core API and the libraries the
 * lab's parts need (Serial, Wire, Servo, LiquidCrystal_I2C, Adafruit_SSD1306,
 * Adafruit_NeoPixel, DHT) plus ESP32 LEDC/DAC. Not supported: classes and
 * structs of your own, pointers beyond `const char*`, templates, goto.
 */

export interface TranspileResult {
  js: string
  /** user function names (called with yield*) */
  functions: string[]
  includes: string[]
}

const BASE_TYPES = [
  'int', 'long', 'short', 'char', 'byte', 'word', 'bool', 'boolean', 'float', 'double', 'String', 'void', 'size_t',
  'uint8_t', 'int8_t', 'uint16_t', 'int16_t', 'uint32_t', 'int32_t', 'uint64_t', 'int64_t', 'unsigned', 'signed',
]
const INT_TYPES = new Set([
  'int', 'long', 'short', 'byte', 'word', 'size_t', 'uint8_t', 'int8_t', 'uint16_t', 'int16_t', 'uint32_t', 'int32_t',
  'uint64_t', 'int64_t', 'unsigned', 'signed',
])
/** library classes a sketch may instantiate */
export const KNOWN_CLASSES = ['Servo', 'LiquidCrystal_I2C', 'Adafruit_SSD1306', 'Adafruit_NeoPixel', 'DHT']
/** core functions that take time: called as (yield* __rt.fn(line, …)) */
const BLOCKING = ['delay', 'delayMicroseconds', 'pulseIn', 'pulseInLong', 'yield']

const TYPE_WORD = `(?:${BASE_TYPES.join('|')})`
// "unsigned long", "long long", "const char*", "static volatile int" …
const TYPE_RE = `(?:(?:static|volatile|const|register|inline|unsigned|signed)\\s+)*${TYPE_WORD}(?:\\s+(?:long|int|char|short))*`

// ------------------------------------------------------------ scanning

/** Replace comments with blanks (newlines kept) and string/char literals with placeholders. */
function protect(src: string): { code: string; strings: string[] } {
  const strings: string[] = []
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && n === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') out += '\n'
        i++
      }
      i += 2
      continue
    }
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1
      const lit = src.slice(i, j + 1)
      strings.push(lit)
      out += `\u0001${strings.length - 1}\u0002`
      i = j + 1
      continue
    }
    out += c
    i++
  }
  return { code: out, strings }
}

function restore(code: string, strings: string[]): string {
  return code.replace(/\u0001(\d+)\u0002/g, (_, k) => {
    const lit = strings[Number(k)]
    if (lit.startsWith("'")) {
      // char literal → an interned char value (prints as a character, compares as its code)
      const body = lit.slice(1, -1)
      // eslint-disable-next-line no-new-func
      const ch = body.startsWith('\\') ? (new Function(`return "${body}"`)() as string) : body
      return `__c(${ch.charCodeAt(0) || 0})`
    }
    return lit
  })
}

/** index of the bracket matching the one at `open` (code is literal-free) */
function matchBracket(code: string, open: number): number {
  const o = code[open]
  const c = o === '(' ? ')' : o === '[' ? ']' : '}'
  let depth = 0
  for (let i = open; i < code.length; i++) {
    if (code[i] === o) depth++
    else if (code[i] === c) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/** split at top-level commas */
function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur.trim() !== '' || out.length) out.push(cur)
  return out
}

function lineAt(code: string, index: number): number {
  let n = 1
  for (let i = 0; i < index && i < code.length; i++) if (code[i] === '\n') n++
  return n
}

/** end of the statement starting at `from`: the ';' at depth 0 */
function statementEnd(code: string, from: number): number {
  let depth = 0
  for (let i = from; i < code.length; i++) {
    const ch = code[i]
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) return i
      depth--
    } else if (ch === ';' && depth === 0) return i
  }
  return code.length
}

// ------------------------------------------------------------- passes

function preprocess(code: string, includes: string[]): string {
  return code
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (!t.startsWith('#')) return line
      const inc = /^#\s*include\s*[<"]([^>"]+)[>"]/.exec(t)
      if (inc) {
        includes.push(inc[1])
        return ''
      }
      const fn = /^#\s*define\s+([A-Za-z_]\w*)\(([^)]*)\)\s+(.+)$/.exec(t)
      if (fn) return `const ${fn[1]} = (${fn[2]}) => (${fn[3]});`
      const def = /^#\s*define\s+([A-Za-z_]\w*)\s*(.*)$/.exec(t)
      if (def) return def[2].trim() ? `const ${def[1]} = ${def[2].trim()};` : ''
      return ''
    })
    .join('\n')
}

function literals(code: string): string {
  return code
    .replace(/\b(0[xX][0-9a-fA-F]+)(?:[uU][lL]{0,2}|[lL]{1,2}[uU]?)\b/g, '$1')
    .replace(/\b(\d+\.\d*(?:[eE][+-]?\d+)?|\d+(?:[eE][+-]?\d+)?|\.\d+)(?:[uU][lL]{0,2}|[lL]{1,2}[uU]?|[fF])\b/g, '$1')
    .replace(/\bB([01]{1,8})\b/g, '0b$1')
    .replace(/\bPROGMEM\b/g, '')
    .replace(/\bnullptr\b|\bNULL\b/g, 'null')
    .replace(/->/g, '.')
    .replace(/::/g, '.')
    .replace(/\.length\(\)/g, '.length')
}

function casts(code: string): string {
  const intT = '(?:unsigned\\s+)?(?:long\\s+long|int|long|short|byte|word|size_t|u?int(?:8|16|32|64)_t)'
  return code
    .replace(new RegExp(`\\(\\s*${intT}\\s*\\)\\s*`, 'g'), '~~')
    .replace(/\(\s*(?:float|double)\s*\)\s*/g, '+')
    .replace(/\(\s*(?:char|bool|boolean)\s*\)\s*/g, '')
    .replace(/\b(?:int|long|word)\s*\(/g, '__int(')
    .replace(/\bbyte\s*\(/g, '__byte(')
    .replace(/\b(?:float|double)\s*\(/g, 'Number(')
    .replace(/\bchar\s*\(/g, '__c(')
    .replace(/\bsizeof\s*\(\s*([A-Za-z_]\w*)\s*\)\s*\/\s*sizeof\s*\(\s*\1\s*\[\s*0\s*\]\s*\)/g, '$1.length')
    .replace(/\bsizeof\s*\(/g, '__sizeof(')
}

/** function definitions and prototypes */
function functions(code: string, names: string[], intFns: string[]): string {
  const def = new RegExp(`(^|[;}\\n])(\\s*)${TYPE_RE}[\\s*&]+([A-Za-z_]\\w*)\\s*\\(([^()]*)\\)\\s*(\\{|;)`, 'g')
  return code.replace(def, (m, pre: string, ws: string, name: string, params: string, end: string) => {
    if (['if', 'for', 'while', 'switch', 'return'].includes(name)) return m
    if (end === ';') {
      // a prototype: drop it (functions are hoisted), keep the newlines
      return pre + ws + m.slice(pre.length + ws.length).replace(/[^\n]/g, ' ')
    }
    if (!names.includes(name)) names.push(name)
    if (new RegExp(`^\\s*(?:(?:static|inline)\\s+)*(?:unsigned\\s+)?(?:int|long|short|byte|word|uint\\d+_t|int\\d+_t)\\b`).test(m.slice(pre.length))) intFns.push(name)
    const ps = params.trim() === 'void' ? [] : splitTop(params)
    const clean = ps
      .map((p) => {
        const eq = p.indexOf('=')
        const head = eq >= 0 ? p.slice(0, eq) : p
        const def = eq >= 0 ? ` = ${p.slice(eq + 1).trim()}` : ''
        const id = /([A-Za-z_]\w*)\s*(?:\[\s*\d*\s*\])*\s*$/.exec(head.trim())
        return id ? id[1] + def : ''
      })
      .filter(Boolean)
    return `${pre}${ws}function* ${name}(${clean.join(', ')}) {`
  })
}

/** library object declarations: `Servo s;`, `LiquidCrystal_I2C lcd(0x27, 16, 2);` */
function objects(code: string): string {
  const cls = `(${KNOWN_CLASSES.join('|')})`
  return code
    .replace(new RegExp(`\\b${cls}\\s+([A-Za-z_]\\w*)\\s*=\\s*\\1\\s*\\(`, 'g'), 'let $2 = new $1(')
    .replace(new RegExp(`\\b${cls}\\s+([A-Za-z_]\\w*)\\s*\\(([^;]*)\\)\\s*;`, 'g'), (_m, c, n, a) => `let ${n} = new ${c}(${String(a).replace(/&\s*/g, '')});`)
    .replace(new RegExp(`\\b${cls}\\s+([A-Za-z_]\\w*)\\s*;`, 'g'), 'let $2 = new $1();')
}

interface VarInfo {
  ints: Set<string>
  chars: Set<string>
  floats: Set<string>
  strings: Set<string>
}

/** variable declarations → let/const */
function declarations(code: string, vars: VarInfo): string {
  const start = new RegExp(`(^|[;{}(\\n]|\\bfor\\s*\\()(\\s*)((?:(?:static|volatile|const|register|unsigned|signed)\\s+)*)(${TYPE_WORD}(?:\\s+(?:long|int|char|short))*)\\s*([*&]\\s*)?(?=[A-Za-z_])`, 'g')
  let out = ''
  let last = 0
  let m: RegExpExecArray | null
  while ((m = start.exec(code))) {
    const declStart = m.index + m[1].length + m[2].length
    const after = m.index + m[0].length
    // a function definition was already rewritten; make sure this is a declarator list
    const end = statementEnd(code, after)
    const body = code.slice(after, end)
    if (/^\s*[A-Za-z_]\w*\s*\(/.test(body) && !/=/.test(body.split('(')[0])) continue // call/ctor — leave
    if (/^\s*(?:if|for|while|switch|return|else|new)\b/.test(body)) continue
    const quals = m[3]
    const type = m[4].replace(/\s+/g, ' ')
    const isConst = /\bconst\b/.test(quals)
    const base = type.split(' ').pop() as string
    const isInt = INT_TYPES.has(base) || INT_TYPES.has(type.split(' ')[0])
    const isChar = base === 'char' && !m[5]
    const isString = base === 'String' || (base === 'char' && !!m[5])
    const isFloat = base === 'float' || base === 'double'
    const decls = splitTop(body).map((d) => {
      const eq = d.indexOf('=')
      const lhs = (eq >= 0 ? d.slice(0, eq) : d).trim()
      let init = eq >= 0 ? d.slice(eq + 1).trim() : ''
      const nm = /^[*&]?\s*([A-Za-z_]\w*)((?:\s*\[[^\]]*\])*)$/.exec(lhs)
      if (!nm) return d
      const name = nm[1]
      const dims = [...nm[2].matchAll(/\[([^\]]*)\]/g)].map((x) => x[1].trim())
      if (dims.length) {
        if (init) {
          if (init.startsWith('{')) init = init.replace(/\{/g, '[').replace(/\}/g, ']')
          else if (base === 'char' && /^\u0001/.test(init)) init = init // "text" stays a string
        } else {
          init = dims.length === 1 ? `__arr(${dims[0] || 0})` : `__arr2(${dims[0] || 0}, ${dims[1] || 0})`
        }
        return ` ${name} = ${init}`
      }
      if (isInt) vars.ints.add(name)
      if (isChar) vars.chars.add(name)
      if (isFloat) vars.floats.add(name)
      if (isString) vars.strings.add(name)
      if (!init) init = isString ? '""' : base === 'bool' || base === 'boolean' ? 'false' : isChar ? '__c(0)' : '0'
      else if (init.startsWith('{')) init = init.replace(/\{/g, '[').replace(/\}/g, ']')
      else if (isChar) init = `__c(${init})`
      else if (base === 'byte' || base === 'uint8_t') init = `__byte(${init})`
      else if (isInt && !/^-?(?:0[xXbB])?[0-9a-fA-F]+$/.test(init)) init = `__int(${init})`
      return ` ${name} = ${init}`
    })
    out += code.slice(last, declStart) + `${isConst ? 'const' : 'let'}${decls.join(',')}`
    last = end
    start.lastIndex = end
  }
  return out + code.slice(last)
}

/** `x = expr;` on int/char variables keeps C semantics (truncation, char values) */
function assignments(code: string, vars: VarInfo): string {
  const names = [...vars.ints, ...vars.chars, ...vars.strings]
  if (!names.length) return code
  const re = new RegExp(`(^|[;{}\\n]\\s*|\\)\\s*)\\b(${names.join('|')})\\s*([*/+]?=)(?!=)`, 'g')
  let out = ''
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(code))) {
    const prev = code.slice(Math.max(0, m.index - 4), m.index + m[1].length)
    if (/let\s*$|const\s*$/.test(prev)) continue
    const rhsStart = m.index + m[0].length
    const end = statementEnd(code, rhsStart)
    const rhs = code.slice(rhsStart, end)
    const name = m[2]
    const op = m[3]
    if (vars.strings.has(name)) {
      if (op !== '+=') continue
      out += code.slice(last, m.index) + `${m[1]}${name} = __cat(${name}, ${rhs.trim()})`
    } else {
      if (op === '+=') continue
      const expr = op === '=' ? rhs : `${name} ${op[0]} (${rhs})`
      const wrap = vars.chars.has(name) ? '__c' : '__int'
      out += code.slice(last, m.index) + `${m[1]}${name} = ${wrap}(${expr.trim()})`
    }
    last = end
    re.lastIndex = end
  }
  return out + code.slice(last)
}

/** wrap calls: user functions and blocking built-ins become yield* expressions */
function calls(code: string, userFns: string[], base = 1): string {
  const names = new Set([...userFns, ...BLOCKING])
  let out = ''
  let i = 0
  const ident = /[A-Za-z_]\w*/y
  while (i < code.length) {
    ident.lastIndex = i
    const m = ident.exec(code)
    if (!m) {
      out += code[i]
      i++
      continue
    }
    const name = m[0]
    let j = i + name.length
    while (code[j] === ' ' || code[j] === '\t') j++
    const before = out.replace(/\s+$/, '')
    const isMember = before.endsWith('.')
    const isDef = /function\*$/.test(before)
    if (code[j] === '(' && names.has(name) && !isMember && !isDef) {
      const close = matchBracket(code, j)
      if (close < 0) {
        out += name
        i += name.length
        continue
      }
      const line = base - 1 + lineAt(code, i)
      const inner = calls(code.slice(j + 1, close), userFns, base - 1 + lineAt(code, j + 1))
      if (BLOCKING.includes(name) && !userFns.includes(name)) {
        out += `(yield* __rt.${name}(${line}${inner.trim() ? ', ' + inner : ''}))`
      } else {
        out += `(yield* ${name}(${inner}))`
      }
      i = close + 1
      continue
    }
    out += name
    i += name.length
  }
  return out
}

/** loops yield every iteration (a busy loop must not freeze the simulator) */
function loops(code: string, base = 1): string {
  let out = ''
  let i = 0
  const doEnds = new Set<number>()
  const kw = /\b(while|for)\s*\(|\bdo\s*\{/y
  while (i < code.length) {
    kw.lastIndex = i
    const prevCh = i > 0 ? code[i - 1] : ' '
    const m = /[A-Za-z0-9_]/.test(prevCh) ? null : kw.exec(code)
    if (!m) {
      out += code[i]
      i++
      continue
    }
    const line = base - 1 + lineAt(code, i)
    if (m[0].startsWith('do')) {
      const brace = i + m[0].length - 1
      doEnds.add(matchBracket(code, brace))
      out += `${m[0]} yield __L(${line});`
      i += m[0].length
      continue
    }
    const open = i + m[0].length - 1
    const close = matchBracket(code, open)
    if (close < 0) {
      out += code[i]
      i++
      continue
    }
    const head = code.slice(i, close + 1)
    let k = close + 1
    while (/\s/.test(code[k] ?? '')) k++
    // `} while (cond);` closing a do-loop: leave it
    let p = i - 1
    while (p >= 0 && /\s/.test(code[p])) p--
    if (m[1] === 'while' && code[p] === '}' && doEnds.has(p)) {
      out += head
      i = close + 1
      continue
    }
    if (code[k] === '{') {
      out += `${head} { yield __L(${line});`
      i = k + 1
    } else if (code[k] === ';') {
      out += `${head} { yield __L(${line}); }`
      i = k + 1
    } else {
      const end = statementEnd(code, k)
      out += `${head} { yield __L(${line}); ${loops(code.slice(k, end + 1), base - 1 + lineAt(code, k))} }`
      i = end + 1
    }
  }
  return out
}

/** switch on chars: case labels compare by code */
function switches(code: string): string {
  return code.replace(/\bswitch\s*\(/g, 'switch (+').replace(/\bcase\s+__c\((\d+)\)\s*:/g, 'case $1:')
}

/** Serial.print(floatVar) prints two decimals like Arduino */
function floatPrints(code: string, vars: VarInfo): string {
  if (!vars.floats.size) return code
  const names = [...vars.floats].join('|')
  return code.replace(new RegExp(`\\.(print|println)\\(\\s*(${names})\\s*([,)])`, 'g'), '.$1(__F($2)$3')
}

/** int-returning functions truncate their results */
function intReturns(code: string, intFns: string[]): string {
  if (!intFns.length) return code
  let out = code
  for (const name of intFns) {
    const at = out.indexOf(`function* ${name}(`)
    if (at < 0) continue
    const open = out.indexOf('{', at)
    const close = matchBracket(out, open)
    if (open < 0 || close < 0) continue
    const body = out.slice(open, close + 1).replace(/\breturn\s+([^;]+);/g, 'return __int($1);')
    out = out.slice(0, open) + body + out.slice(close + 1)
  }
  return out
}

export function transpile(source: string): TranspileResult {
  const includes: string[] = []
  const { code: protectedCode, strings } = protect(source.replace(/\r\n?/g, '\n'))
  let code = preprocess(protectedCode, includes)
  code = literals(code)
  code = casts(code)
  const fnNames: string[] = []
  const intFns: string[] = []
  code = functions(code, fnNames, intFns)
  code = objects(code)
  const vars: VarInfo = { ints: new Set(), chars: new Set(), floats: new Set(), strings: new Set() }
  code = declarations(code, vars)
  code = assignments(code, vars)
  code = intReturns(code, intFns)
  code = loops(code)
  code = calls(code, fnNames)
  code = floatPrints(code, vars)
  code = code.replace(/\bF\s*\(\s*(\u0001\d+\u0002)\s*\)/g, '$1')
  const js = switches(restore(code, strings))
  return { js, functions: fnNames, includes }
}
