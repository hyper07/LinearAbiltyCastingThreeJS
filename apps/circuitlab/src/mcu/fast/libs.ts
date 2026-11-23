/**
 * Instant-mode library shims: the Arduino libraries the lab's parts need,
 * written against the board's pin interface (McuIO). The display and bus
 * libraries really talk to the parts over the wires: LiquidCrystal_I2C
 * sends the PCF8574 byte stream an HD44780 decodes, Adafruit_SSD1306 sends
 * SSD1306 commands and its frame over I²C — so a miswired SDA shows nothing,
 * exactly like on the bench. Patterned on OpenCircuit 3D's helpers (MIT).
 */
import { glyph } from './font5x7'
import type { FastHost } from './runtime'

export function makeLibraries(rt: FastHost) {
  const now = () => rt.now()
  const pin = (p: unknown) => rt.pin(p)

  class Servo {
    private pinName: string | null = null
    private us = 1500
    private min = 544
    private max = 2400
    attach(p: unknown, min = 544, max = 2400): number {
      this.pinName = pin(p)
      this.min = min
      this.max = max
      if (this.pinName) rt.io.servo(this.pinName, this.us, now())
      return this.pinName ? 1 : 0
    }
    write(v: number): void {
      const n = Number(v)
      this.us = n < 200 ? this.min + ((this.max - this.min) * Math.max(0, Math.min(180, n))) / 180 : n
      if (this.pinName) rt.io.servo(this.pinName, this.us, now())
    }
    writeMicroseconds(us: number): void {
      this.write(Math.max(200, Number(us)))
    }
    read(): number {
      return Math.round(((this.us - this.min) * 180) / (this.max - this.min))
    }
    readMicroseconds(): number {
      return Math.round(this.us)
    }
    attached(): boolean {
      return this.pinName !== null
    }
    detach(): void {
      if (this.pinName) rt.io.servo(this.pinName, null, now())
      this.pinName = null
    }
  }

  /** HD44780 over a PCF8574 backpack: P0=RS P1=RW P2=E P3=backlight P4..P7=D4..D7 */
  class LiquidCrystal_I2C {
    private bl = 0x08
    private ctrl = 0x04 // display on, cursor off, blink off
    constructor(
      private addr = 0x27,
      private cols = 16,
      private rows = 2,
    ) {}
    private nibble(v: number): boolean {
      const b = (v | this.bl) & 0xff
      return rt.io.i2cWrite(this.addr, [b, b | 0x04, b & ~0x04])
    }
    private send(value: number, rs: number): void {
      this.nibble((value & 0xf0) | rs)
      this.nibble(((value << 4) & 0xf0) | rs)
    }
    command(v: number): void {
      this.send(v, 0)
    }
    private data(v: number): void {
      this.send(v, 1)
    }
    init(): void {
      this.begin()
    }
    begin(cols?: number, rows?: number): void {
      if (cols) this.cols = cols
      if (rows) this.rows = rows
      this.nibble(0x30)
      this.nibble(0x30)
      this.nibble(0x30)
      this.nibble(0x20)
      this.command(0x28)
      this.command(0x08 | this.ctrl)
      this.command(0x01)
      this.command(0x06)
    }
    clear(): void {
      this.command(0x01)
    }
    home(): void {
      this.command(0x02)
    }
    setCursor(c: number, r: number): void {
      const offs = [0x00, 0x40, 0x14, 0x54]
      const row = Math.max(0, Math.min(this.rows - 1, Math.trunc(r)))
      this.command(0x80 | ((Math.trunc(c) + offs[row]) & 0x7f))
    }
    print(v: unknown, fmt?: unknown): number {
      const s = rt.format(v, fmt)
      for (const ch of s) if (ch !== '\n' && ch !== '\r') this.data(lcdCode(ch))
      return s.length
    }
    println(v: unknown = '', fmt?: unknown): number {
      return this.print(v, fmt)
    }
    write(v: unknown): number {
      this.data(typeof v === 'string' ? lcdCode(v) : Number(v) & 0xff)
      return 1
    }
    backlight(): void {
      this.bl = 0x08
      rt.io.i2cWrite(this.addr, [this.bl])
    }
    noBacklight(): void {
      this.bl = 0
      rt.io.i2cWrite(this.addr, [0])
    }
    setBacklight(on: unknown): void {
      if (on) this.backlight()
      else this.noBacklight()
    }
    display(): void {
      this.ctrl |= 0x04
      this.command(0x08 | this.ctrl)
    }
    noDisplay(): void {
      this.ctrl &= ~0x04
      this.command(0x08 | this.ctrl)
    }
    cursor(): void {
      this.ctrl |= 0x02
      this.command(0x08 | this.ctrl)
    }
    noCursor(): void {
      this.ctrl &= ~0x02
      this.command(0x08 | this.ctrl)
    }
    blink(): void {
      this.ctrl |= 0x01
      this.command(0x08 | this.ctrl)
    }
    noBlink(): void {
      this.ctrl &= ~0x01
      this.command(0x08 | this.ctrl)
    }
    scrollDisplayLeft(): void {
      this.command(0x18)
    }
    scrollDisplayRight(): void {
      this.command(0x1c)
    }
    createChar(loc: number, bytes: number[]): void {
      this.command(0x40 | ((loc & 7) << 3))
      for (let i = 0; i < 8; i++) this.data(Number(bytes?.[i] ?? 0))
    }
  }

  /** Adafruit_SSD1306 + the parts of Adafruit_GFX sketches use */
  class Adafruit_SSD1306 {
    private buf: Uint8Array
    private addr = 0x3c
    private cx = 0
    private cy = 0
    private size = 1
    private color = 1
    private bg = -1
    private wrap = true
    constructor(
      private w = 128,
      private h = 64,
    ) {
      this.buf = new Uint8Array((w * h) / 8)
    }
    begin(_vcc?: unknown, addr = 0x3c): boolean {
      this.addr = Number(addr) || 0x3c
      return rt.io.i2cWrite(this.addr, [
        0x00, 0xae, 0xd5, 0x80, 0xa8, this.h - 1, 0xd3, 0x00, 0x40, 0x8d, 0x14, 0x20, 0x00, 0xa1, 0xc8, 0xda, 0x12,
        0x81, 0xcf, 0xd9, 0xf1, 0xdb, 0x40, 0xa4, 0xa6, 0x2e, 0xaf,
      ])
    }
    display(): void {
      rt.io.i2cWrite(this.addr, [0x00, 0x22, 0x00, 0xff, 0x21, 0x00, this.w - 1])
      rt.io.i2cWrite(this.addr, [0x40, ...this.buf])
    }
    clearDisplay(): void {
      this.buf.fill(0)
      this.cx = 0
      this.cy = 0
    }
    invertDisplay(i: unknown): void {
      rt.io.i2cWrite(this.addr, [0x00, i ? 0xa7 : 0xa6])
    }
    dim(d: unknown): void {
      rt.io.i2cWrite(this.addr, [0x00, 0x81, d ? 0x00 : 0xcf])
    }
    width(): number {
      return this.w
    }
    height(): number {
      return this.h
    }
    drawPixel(x: number, y: number, c: number = 1): void {
      x = Math.round(x)
      y = Math.round(y)
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
      const i = x + (y >> 3) * this.w
      const bit = 1 << (y & 7)
      if (c === 2) this.buf[i] ^= bit
      else if (c) this.buf[i] |= bit
      else this.buf[i] &= ~bit
    }
    fillScreen(c: number): void {
      this.buf.fill(c ? 0xff : 0)
    }
    drawFastHLine(x: number, y: number, w: number, c: number): void {
      for (let i = 0; i < w; i++) this.drawPixel(x + i, y, c)
    }
    drawFastVLine(x: number, y: number, h: number, c: number): void {
      for (let i = 0; i < h; i++) this.drawPixel(x, y + i, c)
    }
    drawLine(x0: number, y0: number, x1: number, y1: number, c: number): void {
      const dx = Math.abs(x1 - x0)
      const dy = -Math.abs(y1 - y0)
      const sx = x0 < x1 ? 1 : -1
      const sy = y0 < y1 ? 1 : -1
      let err = dx + dy
      for (let guard = 0; guard < 4096; guard++) {
        this.drawPixel(x0, y0, c)
        if (x0 === x1 && y0 === y1) break
        const e2 = 2 * err
        if (e2 >= dy) {
          err += dy
          x0 += sx
        }
        if (e2 <= dx) {
          err += dx
          y0 += sy
        }
      }
    }
    drawRect(x: number, y: number, w: number, h: number, c: number): void {
      this.drawFastHLine(x, y, w, c)
      this.drawFastHLine(x, y + h - 1, w, c)
      this.drawFastVLine(x, y, h, c)
      this.drawFastVLine(x + w - 1, y, h, c)
    }
    fillRect(x: number, y: number, w: number, h: number, c: number): void {
      for (let j = 0; j < h; j++) this.drawFastHLine(x, y + j, w, c)
    }
    drawRoundRect(x: number, y: number, w: number, h: number, _r: number, c: number): void {
      this.drawRect(x, y, w, h, c)
    }
    fillRoundRect(x: number, y: number, w: number, h: number, _r: number, c: number): void {
      this.fillRect(x, y, w, h, c)
    }
    drawCircle(x0: number, y0: number, r: number, c: number): void {
      for (let a = 0; a < 360; a += 2) {
        const t = (a * Math.PI) / 180
        this.drawPixel(x0 + Math.round(r * Math.cos(t)), y0 + Math.round(r * Math.sin(t)), c)
      }
    }
    fillCircle(x0: number, y0: number, r: number, c: number): void {
      for (let y = -r; y <= r; y++) {
        const half = Math.round(Math.sqrt(r * r - y * y))
        this.drawFastHLine(x0 - half, y0 + y, 2 * half + 1, c)
      }
    }
    drawTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number): void {
      this.drawLine(x0, y0, x1, y1, c)
      this.drawLine(x1, y1, x2, y2, c)
      this.drawLine(x2, y2, x0, y0, c)
    }
    drawBitmap(x: number, y: number, bmp: number[], w: number, h: number, c: number): void {
      const bw = (w + 7) >> 3
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) if ((bmp[j * bw + (i >> 3)] ?? 0) & (0x80 >> (i & 7))) this.drawPixel(x + i, y + j, c)
    }
    setTextSize(s: number): void {
      this.size = Math.max(1, Math.trunc(s))
    }
    setTextColor(c: number, bg?: number): void {
      this.color = c
      this.bg = bg === undefined ? -1 : bg
    }
    setTextWrap(w: unknown): void {
      this.wrap = !!w
    }
    setCursor(x: number, y: number): void {
      this.cx = x
      this.cy = y
    }
    getCursorX(): number {
      return this.cx
    }
    getCursorY(): number {
      return this.cy
    }
    setRotation(): void {}
    cp437(): void {}
    write(v: unknown): number {
      const code = typeof v === 'string' ? v.charCodeAt(0) : Number(v)
      if (code === 10) {
        this.cx = 0
        this.cy += 8 * this.size
        return 1
      }
      if (code === 13) return 1
      if (this.wrap && this.cx + 6 * this.size > this.w) {
        this.cx = 0
        this.cy += 8 * this.size
      }
      const g = glyph(code)
      for (let col = 0; col < 6; col++) {
        const bits = col < 5 ? g[col] : 0
        for (let row = 0; row < 8; row++) {
          const on = (bits >> row) & 1
          if (!on && this.bg < 0) continue
          const c = on ? this.color : this.bg
          if (this.size === 1) this.drawPixel(this.cx + col, this.cy + row, c)
          else this.fillRect(this.cx + col * this.size, this.cy + row * this.size, this.size, this.size, c)
        }
      }
      this.cx += 6 * this.size
      return 1
    }
    print(v: unknown, fmt?: unknown): number {
      const s = rt.format(v, fmt)
      for (const ch of s) this.write(ch)
      return s.length
    }
    println(v: unknown = '', fmt?: unknown): number {
      const n = this.print(v, fmt)
      this.write('\n')
      return n + 1
    }
  }

  class Adafruit_NeoPixel {
    private px: number[]
    private bright = 255
    private pinName: string | null
    constructor(
      private n = 8,
      p: unknown = 6,
      _type?: unknown,
    ) {
      this.px = new Array(Math.max(0, n)).fill(0)
      this.pinName = pin(p)
    }
    begin(): void {}
    show(): void {
      if (!this.pinName) return
      const k = this.bright / 255
      const scaled = this.px.map((c) => {
        const r = Math.round(((c >> 16) & 255) * k)
        const g = Math.round(((c >> 8) & 255) * k)
        const b = Math.round((c & 255) * k)
        return (r << 16) | (g << 8) | b
      })
      rt.io.neopixel(this.pinName, scaled)
    }
    setPixelColor(i: number, r: number, g?: number, b?: number): void {
      if (i < 0 || i >= this.n) return
      this.px[Math.trunc(i)] = g === undefined ? Number(r) >>> 0 : Adafruit_NeoPixel.Color(r, g, b ?? 0)
    }
    getPixelColor(i: number): number {
      return this.px[i] ?? 0
    }
    fill(c = 0, first = 0, count = 0): void {
      const end = count > 0 ? Math.min(this.n, first + count) : this.n
      for (let i = first; i < end; i++) this.px[i] = c
    }
    clear(): void {
      this.px.fill(0)
    }
    setBrightness(b: number): void {
      this.bright = Math.max(0, Math.min(255, b))
    }
    getBrightness(): number {
      return this.bright
    }
    numPixels(): number {
      return this.n
    }
    Color(r: number, g: number, b: number): number {
      return Adafruit_NeoPixel.Color(r, g, b)
    }
    ColorHSV(h: number, s = 255, v = 255): number {
      return Adafruit_NeoPixel.ColorHSV(h, s, v)
    }
    gamma32(c: number): number {
      return c
    }
    static Color(r: number, g: number, b: number): number {
      const k = (x: number) => Math.max(0, Math.min(255, Math.trunc(x)))
      return (k(r) << 16) | (k(g) << 8) | k(b)
    }
    static ColorHSV(h: number, s = 255, v = 255): number {
      const hh = (((h % 65536) + 65536) % 65536) / 65536
      const i = Math.floor(hh * 6)
      const f = hh * 6 - i
      const S = s / 255
      const V = v / 255
      const p = V * (1 - S)
      const q = V * (1 - f * S)
      const t = V * (1 - (1 - f) * S)
      const [r, g, b] = [[V, t, p], [q, V, p], [p, V, t], [p, q, V], [t, p, V], [V, p, q]][i % 6]
      return Adafruit_NeoPixel.Color(r * 255, g * 255, b * 255)
    }
  }

  class DHT {
    private pinName: string | null
    constructor(p: unknown, _type?: unknown) {
      this.pinName = pin(p)
    }
    begin(): void {}
    readTemperature(f: unknown = false): number {
      const r = this.pinName ? rt.io.dht(this.pinName) : null
      if (!r) return NaN
      return f ? (r.temperature * 9) / 5 + 32 : r.temperature
    }
    readHumidity(): number {
      const r = this.pinName ? rt.io.dht(this.pinName) : null
      return r ? r.humidity : NaN
    }
    computeHeatIndex(t: number, h: number, f: unknown = true): number {
      const tf = f ? t : (t * 9) / 5 + 32
      const hi = 0.5 * (tf + 61 + (tf - 68) * 1.2 + h * 0.094)
      return f ? hi : ((hi - 32) * 5) / 9
    }
  }

  const Wire = (() => {
    let addr = 0
    let tx: number[] = []
    let rx: number[] = []
    return {
      begin(): void {},
      setClock(): void {},
      beginTransmission(a: number): void {
        addr = Number(a)
        tx = []
      },
      write(v: unknown): number {
        if (typeof v === 'string') for (const ch of v) tx.push(ch.charCodeAt(0))
        else if (Array.isArray(v)) tx.push(...v.map(Number))
        else tx.push(Number(v) & 0xff)
        return 1
      },
      endTransmission(): number {
        return rt.io.i2cWrite(addr, tx) ? 0 : 2
      },
      requestFrom(a: number, n: number): number {
        rx = rt.io.i2cRead(Number(a), Number(n)) ?? []
        return rx.length
      },
      available(): number {
        return rx.length
      },
      read(): number {
        return rx.length ? (rx.shift() as number) : -1
      },
    }
  })()

  return { Servo, LiquidCrystal_I2C, Adafruit_SSD1306, Adafruit_NeoPixel, DHT, Wire }
}

/** HD44780 character code for a JS character (°, common Latin) */
function lcdCode(ch: string): number {
  if (ch === '°') return 0xdf
  const c = ch.charCodeAt(0)
  return c < 128 ? c : 0x3f
}
