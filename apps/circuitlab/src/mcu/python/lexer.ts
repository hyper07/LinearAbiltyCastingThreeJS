/**
 * Tokenizer for the lab's teaching subset of Python 3: names, numbers,
 * strings (single / double / triple quoted, r'' and f'' prefixes),
 * operators, NEWLINE and INDENT / DEDENT from the leading whitespace.
 * Brackets join lines; a backslash at the end of a line continues it.
 */

export type TokKind = 'name' | 'num' | 'str' | 'fstr' | 'op' | 'nl' | 'indent' | 'dedent' | 'eof'

export interface Tok {
  k: TokKind
  v: string
  line: number
  col: number
}

/** a Python exception raised by the lab's interpreter (SyntaxError, NameError, …) */
export class PyError extends Error {
  constructor(
    readonly type: string,
    readonly msg: string,
    public line?: number,
    /** the Python exception object a `raise` statement threw (user code) */
    readonly value?: unknown,
  ) {
    super(`${type}: ${msg}`)
  }
}

const OPS = [
  '**=', '//=', '>>=', '<<=', '...',
  '**', '//', '==', '!=', '<=', '>=', '<<', '>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '->', ':=',
  '+', '-', '*', '/', '%', '<', '>', '=', '(', ')', '[', ']', '{', '}', ',', ':', '.', ';', '@', '&', '|', '^', '~',
]

export function unescape(s: string, line: number): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c !== '\\') {
      out += c
      continue
    }
    const n = s[++i]
    switch (n) {
      case 'n': out += '\n'; break
      case 't': out += '\t'; break
      case 'r': out += '\r'; break
      case '0': out += '\0'; break
      case '\\': out += '\\'; break
      case "'": out += "'"; break
      case '"': out += '"'; break
      case '\n': break
      case 'x': {
        const h = s.slice(i + 1, i + 3)
        if (!/^[0-9a-fA-F]{2}$/.test(h)) throw new PyError('SyntaxError', 'bad \\x escape in a string', line)
        out += String.fromCharCode(parseInt(h, 16))
        i += 2
        break
      }
      case 'u': {
        const h = s.slice(i + 1, i + 5)
        if (!/^[0-9a-fA-F]{4}$/.test(h)) throw new PyError('SyntaxError', 'bad \\u escape in a string', line)
        out += String.fromCharCode(parseInt(h, 16))
        i += 4
        break
      }
      default:
        out += '\\' + (n ?? '')
    }
  }
  return out
}

export function tokenize(src: string): Tok[] {
  const toks: Tok[] = []
  const indents = [0]
  let i = 0
  let line = 1
  let lineStart = 0
  let depth = 0 // open brackets
  let atLineStart = true
  const push = (k: TokKind, v: string, col = i - lineStart) => toks.push({ k, v, line, col })

  while (i < src.length) {
    if (atLineStart && depth === 0) {
      // measure indentation; skip blank / comment-only lines
      let w = 0
      let j = i
      for (; j < src.length; j++) {
        if (src[j] === ' ') w++
        else if (src[j] === '\t') w = (Math.floor(w / 8) + 1) * 8
        else if (src[j] === '\f') w = 0
        else break
      }
      if (j >= src.length) {
        i = j
        break
      }
      if (src[j] === '\n' || src[j] === '#' || src[j] === '\r') {
        // blank line: skip to its end
        while (j < src.length && src[j] !== '\n') j++
        i = j + 1
        line++
        lineStart = i
        continue
      }
      i = j
      atLineStart = false
      const cur = indents[indents.length - 1]
      if (w > cur) {
        indents.push(w)
        push('indent', '')
      } else if (w < cur) {
        while (indents[indents.length - 1] > w) {
          indents.pop()
          push('dedent', '')
        }
        if (indents[indents.length - 1] !== w) throw new PyError('IndentationError', 'unindent does not match any outer indentation level', line)
      }
    }
    const c = src[i]
    if (c === '\n') {
      if (depth === 0) {
        if (toks.length && toks[toks.length - 1].k !== 'nl') push('nl', '')
        atLineStart = true
      }
      i++
      line++
      lineStart = i
      continue
    }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f') {
      i++
      continue
    }
    if (c === '#') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '\\' && src[i + 1] === '\n') {
      i += 2
      line++
      lineStart = i
      continue
    }
    // strings (with optional prefixes)
    const pm = /^([rRfFbBuU]{0,2})(['"])/.exec(src.slice(i, i + 3))
    if (pm && (pm[1] === '' || /^(r|f|b|u|rf|fr|rb|br)$/i.test(pm[1]))) {
      const prefix = pm[1].toLowerCase()
      const startLine = line
      const col = i - lineStart
      i += prefix.length
      const q = src[i]
      const triple = src.slice(i, i + 3) === q.repeat(3)
      const delim = triple ? q.repeat(3) : q
      i += delim.length
      let body = ''
      for (;;) {
        if (i >= src.length) throw new PyError('SyntaxError', triple ? 'unterminated triple-quoted string' : 'unterminated string literal', startLine)
        if (src.startsWith(delim, i)) {
          i += delim.length
          break
        }
        const ch = src[i]
        if (ch === '\n') {
          if (!triple) throw new PyError('SyntaxError', 'unterminated string literal (a string must end on the line it starts — check the quotes)', startLine)
          line++
          lineStart = i + 1
        }
        if (ch === '\\' && i + 1 < src.length) {
          body += ch + src[i + 1]
          if (src[i + 1] === '\n') {
            line++
            lineStart = i + 2
          }
          i += 2
          continue
        }
        body += ch
        i++
      }
      const raw = prefix.includes('r')
      const isF = prefix.includes('f')
      const v = raw ? body : isF ? body : unescape(body, startLine)
      toks.push({ k: isF ? 'fstr' : 'str', v: isF && !raw ? `\u0001${v}` : v, line: startLine, col })
      continue
    }
    // numbers
    const nm = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?j?)/.exec(src.slice(i, i + 64))
    if (nm && /[\d.]/.test(c) && !(c === '.' && !/\d/.test(src[i + 1] ?? ''))) {
      if (nm[1].endsWith('j')) throw new PyError('SyntaxError', 'complex numbers are not supported in the lab', line)
      push('num', nm[1].replace(/_/g, ''))
      i += nm[1].length
      continue
    }
    // names
    const id = /^[A-Za-z_À-￿][A-Za-z0-9_À-￿]*/.exec(src.slice(i, i + 128))
    if (id) {
      push('name', id[0])
      i += id[0].length
      continue
    }
    const op = OPS.find((o) => src.startsWith(o, i))
    if (op) {
      if (op === '(' || op === '[' || op === '{') depth++
      if (op === ')' || op === ']' || op === '}') depth = Math.max(0, depth - 1)
      push('op', op)
      i += op.length
      continue
    }
    throw new PyError('SyntaxError', `invalid character '${c}'`, line)
  }
  if (toks.length && toks[toks.length - 1].k !== 'nl') push('nl', '')
  while (indents.length > 1) {
    indents.pop()
    push('dedent', '')
  }
  push('eof', '')
  return toks
}
