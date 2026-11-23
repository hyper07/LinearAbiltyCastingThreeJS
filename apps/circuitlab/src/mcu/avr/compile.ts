/**
 * Compile an Arduino sketch to Intel HEX in the browser, with AVR-GCC built
 * for WebAssembly (@horang-corp/avr-gcc-wasm, GPL toolchain + Arduino core
 * objects, loaded lazily from the jsDelivr CDN — never bundled with our code).
 * Like OpenCircuit 3D (MIT), the compiler runs in a same-origin blob Worker
 * that imports the package from the CDN.
 *
 * The sketch is prepared the way the Arduino IDE does it: Arduino.h first,
 * #includes hoisted, prototypes for every function, and a #line directive so
 * compiler errors point at the student's own line numbers. The lab adds a
 * small LiquidCrystal_I2C (the compiler package ships no LCD library).
 */

export const GCC_VERSION = '0.2.0'
export const GCC_BASE = `https://cdn.jsdelivr.net/npm/@horang-corp/avr-gcc-wasm@${GCC_VERSION}/`

export interface CompileResult {
  ok: boolean
  hex?: string
  flashBytes?: number
  errors: { line: number | null; message: string }[]
  log: string
}

/** Header-only LiquidCrystal_I2C (PCF8574 backpack), written for the lab. */
export const LIQUIDCRYSTAL_I2C = `
#include <Wire.h>
#include <Print.h>
class LiquidCrystal_I2C : public Print {
 public:
  LiquidCrystal_I2C(uint8_t addr, uint8_t cols, uint8_t rows) : _addr(addr), _cols(cols), _rows(rows), _bl(0x08), _ctrl(0x04) {}
  void init() { begin(_cols, _rows); }
  void begin(uint8_t c = 16, uint8_t r = 2) {
    _cols = c; _rows = r;
    Wire.begin(); delay(50); expander(0); delay(1);
    write4(0x30); delayMicroseconds(4500); write4(0x30); delayMicroseconds(4500); write4(0x30); delayMicroseconds(150); write4(0x20);
    command(0x28); command(0x08 | _ctrl); clear(); command(0x06); home();
  }
  void clear() { command(0x01); delayMicroseconds(2000); }
  void home() { command(0x02); delayMicroseconds(2000); }
  void setCursor(uint8_t c, uint8_t r) { static const uint8_t o[4] = {0x00, 0x40, 0x14, 0x54}; if (r >= _rows) r = _rows - 1; command(0x80 | (c + o[r])); }
  void backlight() { _bl = 0x08; expander(0); }
  void noBacklight() { _bl = 0; expander(0); }
  void display() { _ctrl |= 0x04; command(0x08 | _ctrl); }
  void noDisplay() { _ctrl &= ~0x04; command(0x08 | _ctrl); }
  void cursor() { _ctrl |= 0x02; command(0x08 | _ctrl); }
  void noCursor() { _ctrl &= ~0x02; command(0x08 | _ctrl); }
  void blink() { _ctrl |= 0x01; command(0x08 | _ctrl); }
  void noBlink() { _ctrl &= ~0x01; command(0x08 | _ctrl); }
  void scrollDisplayLeft() { command(0x18); }
  void scrollDisplayRight() { command(0x1C); }
  void createChar(uint8_t loc, uint8_t m[]) { command(0x40 | ((loc & 7) << 3)); for (int i = 0; i < 8; i++) send(m[i], 1); }
  void command(uint8_t v) { send(v, 0); }
  virtual size_t write(uint8_t v) { send(v, 1); return 1; }
  using Print::write;
 private:
  void send(uint8_t v, uint8_t mode) { write4((v & 0xF0) | mode); write4(((v << 4) & 0xF0) | mode); }
  void write4(uint8_t v) { expander(v); expander(v | 0x04); delayMicroseconds(1); expander(v & ~0x04); delayMicroseconds(50); }
  void expander(uint8_t d) { Wire.beginTransmission(_addr); Wire.write(d | _bl); Wire.endTransmission(); }
  uint8_t _addr, _cols, _rows, _bl, _ctrl;
};
`

const UNSUPPORTED: Record<string, string> = {
  'Adafruit_NeoPixel.h': 'NeoPixels are not available in Compiled mode yet — switch this board to Instant mode.',
  'LiquidCrystal.h': 'The parallel LiquidCrystal library is not available — use the I²C LCD with LiquidCrystal_I2C.',
}

/** Prepare a sketch like the Arduino IDE: includes first, prototypes, #line. */
export function prepareSketch(source: string): { code: string; sensors: string[]; problems: string[] } {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const includes: string[] = []
  const problems: string[] = []
  const sensors: string[] = []
  const body = lines.map((line) => {
    const m = /^\s*#\s*include\s*[<"]([^>"]+)[>"]/.exec(line)
    if (!m) return line
    const name = m[1]
    if (UNSUPPORTED[name]) problems.push(UNSUPPORTED[name])
    if (name === 'LiquidCrystal_I2C.h') includes.push(LIQUIDCRYSTAL_I2C)
    else includes.push(`#include <${name}>`)
    if (name === 'Adafruit_SSD1306.h' || name === 'Adafruit_GFX.h') sensors.push('OLED')
    return ''
  })
  // prototypes: return-type name(params) { at the start of a line, outside braces
  const protos: string[] = []
  let depth = 0
  const noComments = body.join('\n').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, '')
  for (const line of noComments.split('\n')) {
    if (depth === 0) {
      const m = /^\s*((?:static\s+|inline\s+)*[A-Za-z_][\w<>:]*(?:\s+[A-Za-z_][\w<>:]*)*[\s*&]+)([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:\{.*)?$/.exec(line)
      if (m && !['if', 'for', 'while', 'switch', 'else', 'return'].includes(m[2]) && !/^\s*(?:else|return)\b/.test(m[1])) {
        const params = m[3].replace(/=[^,]*/g, '')
        protos.push(`${m[1].trim()} ${m[2]}(${params});`)
      }
    }
    for (const ch of line) {
      if (ch === '{') depth++
      else if (ch === '}') depth = Math.max(0, depth - 1)
    }
  }
  const head = ['#include <Arduino.h>', ...includes, ...protos.filter((p) => !/^(?:void|int)\s+(?:setup|loop)\(\s*\);$/.test(p)), '#line 1 "sketch.ino"']
  return { code: `${head.join('\n')}\n${body.join('\n')}\n`, sensors: [...new Set(sensors)], problems }
}

/** gcc stderr → student-facing errors with sketch line numbers */
export function parseErrors(stderr: string): { line: number | null; message: string }[] {
  const out: { line: number | null; message: string }[] = []
  for (const raw of stderr.split('\n')) {
    const m = /sketch\.ino:(\d+)(?::\d+)?:\s*(?:fatal\s+)?error:\s*(.+)$/.exec(raw)
    if (m) out.push({ line: Number(m[1]), message: m[2].trim() })
  }
  if (!out.length) {
    const first = stderr.split('\n').find((l) => /error/i.test(l))
    if (first) out.push({ line: null, message: first.replace(/^\[[^\]]+\]\s*/, '').trim() })
  }
  return out
}

// ---------------------------------------------------------------- cache

const memory = new Map<string, string>()
const LS_PREFIX = 'circuitlab.hex.'

export function sketchKey(boardType: string, source: string): string {
  let h = 2166136261
  const s = `${boardType}\u0000${source}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36) + s.length.toString(36)
}

export function cachedHex(boardType: string, source: string): string | null {
  const key = sketchKey(boardType, source)
  const hit = memory.get(key)
  if (hit) return hit
  try {
    const stored = globalThis.localStorage?.getItem(LS_PREFIX + key)
    if (stored) {
      memory.set(key, stored)
      return stored
    }
  } catch {
    /* storage blocked */
  }
  return null
}

export function storeHex(boardType: string, source: string, hex: string): void {
  const key = sketchKey(boardType, source)
  memory.set(key, hex)
  try {
    const ls = globalThis.localStorage
    if (!ls) return
    const keys: string[] = []
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i)
      if (k?.startsWith(LS_PREFIX)) keys.push(k)
    }
    while (keys.length >= 12) ls.removeItem(keys.shift() as string)
    ls.setItem(LS_PREFIX + key, hex)
  } catch {
    /* storage full or blocked — memory cache still works */
  }
}

// -------------------------------------------------------------- compile

let workerUrl: string | null = null
function compilerWorker(): Worker {
  if (!workerUrl) {
    const src = `import { buildFirmware } from ${JSON.stringify(GCC_BASE + 'index.js')};
self.onmessage = async (e) => {
  try {
    const result = await buildFirmware({ source: e.data.source, sensors: e.data.sensors, assetsBase: e.data.assetsBase });
    self.postMessage({ ok: true, hex: result.hex, flashBytes: result.flashBytes, fits: result.fitsTarget, stderr: (result.stderr || []).join('\\n') });
  } catch (err) {
    self.postMessage({ ok: false, error: String((err && err.message) || err) });
  }
};`
    workerUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
  }
  return new Worker(workerUrl, { type: 'module' })
}

/** Compile in the browser. The first compile downloads the compiler (~55 MB, then cached). */
export async function compileSketch(boardType: string, source: string, onStatus?: (s: string) => void): Promise<CompileResult> {
  const cached = cachedHex(boardType, source)
  if (cached) return { ok: true, hex: cached, errors: [], log: 'Using the program compiled earlier.' }
  const prep = prepareSketch(source)
  if (prep.problems.length) return { ok: false, errors: prep.problems.map((message) => ({ line: null, message })), log: prep.problems.join('\n') }
  onStatus?.('Loading the AVR-GCC compiler (about 55 MB the first time)…')
  const worker = compilerWorker()
  try {
    const res = await new Promise<{ ok: boolean; hex?: string; flashBytes?: number; fits?: boolean; error?: string; stderr?: string }>((resolve, reject) => {
      worker.onmessage = (e) => resolve(e.data)
      worker.onerror = (e) => reject(new Error(e.message || 'The compiler could not start (offline?).'))
      onStatus?.('Compiling C++ → HEX in your browser…')
      worker.postMessage({ source: prep.code, sensors: prep.sensors, assetsBase: GCC_BASE })
    })
    if (!res.ok || !res.hex) {
      const log = res.error ?? 'The compiler returned no program.'
      const errors = parseErrors(log)
      return { ok: false, errors: errors.length ? errors : [{ line: null, message: log.split('\n')[0] }], log }
    }
    if (res.fits === false) return { ok: false, errors: [{ line: null, message: `The program is ${res.flashBytes} bytes — more than the 32 KB an ATmega328P holds.` }], log: '' }
    storeHex(boardType, source, res.hex)
    return { ok: true, hex: res.hex, flashBytes: res.flashBytes, errors: [], log: res.stderr ?? '' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, errors: [{ line: null, message }], log: message }
  } finally {
    worker.terminate()
  }
}
