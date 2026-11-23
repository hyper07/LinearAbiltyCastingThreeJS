/**
 * Circuit Lab: behavioural models of the parts that need a microcontroller,
 * as chips in ohmlet's mixed-signal bridge. Each part is powered from its
 * VCC pin (no power → it does nothing and says so) and talks to the board
 * the way the real one does:
 *
 *  - Servo: measures the width of the pulses on SIG (exact edges when the
 *    board publishes them, the averaged drive otherwise) → horn angle.
 *  - LCD 16×2 I²C: a PCF8574 expander decoded into an HD44780 controller.
 *  - OLED 128×64: SSD1306 command/data stream over I²C → its frame memory.
 *  - NeoPixel stick: the colours of each show() on DIN.
 *  - HC-SR04: a 10 µs TRIG pulse → an ECHO pulse 58 µs long per cm.
 *  - DHT22: answers the DHT library with its temperature and humidity.
 *
 * Behaviour modelled after OpenCircuit 3D's helpers (MIT, see NOTICE),
 * rebuilt as pin-level/bus-level devices.
 */
import type { ComponentInstance, ComponentTelemetry, ParamValue } from '../../model/types'
import { registerChip } from '../chip-api'
import type { ChipInstance, ChipStepCtx, I2cDevice, PinEdge } from '../chip-api'

function num(comp: ComponentInstance, key: string, fallback: number): number {
  const v = Number(comp.params?.[key])
  return Number.isFinite(v) ? v : fallback
}

/** supply voltage across VCC and GND (0 when unconnected) */
function supply(ctx: ChipStepCtx, vcc = 'VCC', gnd = 'GND'): number {
  const v = ctx.readPin(vcc)
  const g = ctx.readPin(gnd)
  // no GND wire → no current can flow → the part is off (a classic mistake)
  if (Number.isNaN(v) || Number.isNaN(g)) return 0
  return v - g
}

/** the part's supply current, as a resistor from VCC to ground */
function load(ctx: ChipStepCtx, ohms: number, on: boolean): void {
  ctx.drivePin('VCC', on ? { v: 0, rout: ohms } : null)
}

// ------------------------------------------------------------------ servo

class ServoChip implements ChipInstance {
  private angle = 90
  private target = 90
  private width = 0
  private inPulse = false
  private lastV = 0
  private powered = false
  private pulseStart = 0
  /** once the driver publishes exact edges, the averaged estimate is not needed */
  private exact = false
  constructor(readonly comp: ComponentInstance) {}

  step(ctx: ChipStepCtx): void {
    const vcc = supply(ctx)
    this.powered = vcc > 3.5
    load(ctx, 500, this.powered)
    const sig = ctx.readPin('SIG')
    const edges = ctx.pinEdges?.('SIG') ?? []
    if (edges.length) this.exact = true
    if (this.exact) {
      for (const e of edges) {
        if (e.high) this.pulseStart = e.t
        else if (this.pulseStart > 0) this.accept((e.t - this.pulseStart) * 1e6)
      }
    } else if (!Number.isNaN(sig)) {
      // averaged drive: integrate the fraction of the logic level
      const frac = Math.max(0, Math.min(1, sig / Math.max(3, vcc > 1 ? Math.min(vcc, 5) : 5)))
      if (frac > 0.02) {
        this.inPulse = true
        this.width += frac * ctx.dt * 1e6
      } else if (this.inPulse) {
        this.inPulse = false
        this.accept(this.width)
        this.width = 0
      }
      this.lastV = sig
    }
    // ~0.1 s per 60° (SG90)
    if (this.powered) {
      const maxStep = 600 * ctx.dt
      this.angle += Math.max(-maxStep, Math.min(maxStep, this.target - this.angle))
    }
  }

  private accept(us: number): void {
    if (us < 400 || us > 2700) return
    this.target = Math.max(0, Math.min(180, ((us - 544) / (2400 - 544)) * 180))
  }

  fillTelemetry(t: ComponentTelemetry): void {
    t.angle = this.angle
    if (!this.powered) t.unpowered = true
  }
}

// -------------------------------------------------------------- HD44780

export class Hd44780 {
  ddram = new Uint8Array(128).fill(0x20)
  addr = 0
  shift = 0
  displayOn = true
  cursorOn = false
  blinkOn = false
  fourBit = false
  private half: number | null = null
  increment = true
  version = 0

  /** one bus cycle latched on E falling: rs, and D4..D7 in the high nibble */
  latch(rs: boolean, nibble: number): void {
    if (!this.fourBit) {
      // 8-bit power-up: only D4..D7 are wired, D0..D3 read as 0
      if (!rs) this.command(nibble & 0xf0)
      return
    }
    if (this.half === null) {
      this.half = nibble & 0xf0
      return
    }
    const v = this.half | ((nibble >> 4) & 0x0f)
    this.half = null
    if (rs) this.data(v)
    else this.command(v)
  }

  command(v: number): void {
    if (v & 0x80) {
      this.addr = v & 0x7f
    } else if (v & 0x40) {
      // CGRAM address — custom characters are not drawn
    } else if (v & 0x20) {
      const dl = (v & 0x10) !== 0
      if (!dl && !this.fourBit) {
        this.fourBit = true
        this.half = null
      } else if (dl) {
        this.fourBit = false
      }
    } else if (v & 0x10) {
      if (v & 0x08) this.shift += v & 0x04 ? -1 : 1
      else this.addr = (this.addr + (v & 0x04 ? 1 : -1) + 128) % 128
    } else if (v & 0x08) {
      this.displayOn = (v & 0x04) !== 0
      this.cursorOn = (v & 0x02) !== 0
      this.blinkOn = (v & 0x01) !== 0
    } else if (v & 0x04) {
      this.increment = (v & 0x02) !== 0
    } else if (v & 0x02) {
      this.addr = 0
      this.shift = 0
    } else if (v & 0x01) {
      this.ddram.fill(0x20)
      this.addr = 0
      this.shift = 0
    }
    this.version++
  }

  data(v: number): void {
    this.ddram[this.addr & 0x7f] = v
    this.addr = (this.addr + (this.increment ? 1 : -1) + 128) % 128
    this.version++
  }

  lines(cols = 16, rows = 2): string[] {
    const starts = [0x00, 0x40, 0x14, 0x54]
    const out: string[] = []
    for (let r = 0; r < rows; r++) {
      let s = ''
      for (let c = 0; c < cols; c++) {
        const a = starts[r] + ((((c + this.shift) % 40) + 40) % 40)
        const code = this.ddram[a]
        s += code === 0xdf ? '°' : code >= 32 && code < 127 ? String.fromCharCode(code) : ' '
      }
      out.push(s)
    }
    return out
  }
}

class LcdChip implements ChipInstance {
  readonly hd = new Hd44780()
  private powered = false
  private lastE = false
  private backlight = true
  private everTalked = false
  readonly i2c: I2cDevice
  constructor(readonly comp: ComponentInstance) {
    const address = parseInt(String(comp.params?.address ?? '0x27'), 16) || 0x27
    this.i2c = {
      address,
      ready: () => this.powered,
      write: (bytes) => {
        this.everTalked = true
        for (const b of bytes) this.expander(b)
      },
    }
  }
  private expander(b: number): void {
    this.backlight = (b & 0x08) !== 0
    const e = (b & 0x04) !== 0
    if (this.lastE && !e) this.hd.latch((b & 0x01) !== 0, b & 0xf0)
    this.lastE = e
  }
  step(ctx: ChipStepCtx): void {
    const was = this.powered
    this.powered = supply(ctx) > 4
    if (was && !this.powered) {
      this.hd.ddram.fill(0x20)
      this.hd.fourBit = false
    }
    load(ctx, 300, this.powered)
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.lines = this.powered && this.hd.displayOn ? this.hd.lines() : ['', '']
    t.backlight = this.powered && this.backlight
    if (!this.powered) t.unpowered = true
    t.frameVersion = this.hd.version + (this.powered ? 0 : 1e6) + (this.backlight ? 0 : 5e5) + (this.everTalked ? 0 : 3e5)
  }
}

// --------------------------------------------------------------- SSD1306

export class Ssd1306 {
  readonly ram = new Uint8Array(1024)
  on = false
  inverted = false
  version = 0
  private colStart = 0
  private colEnd = 127
  private pageStart = 0
  private pageEnd = 7
  private col = 0
  private page = 0
  private pending: number[] = []
  private need = 0
  private mode = 0 // 0 horizontal, 2 page

  write(bytes: number[]): void {
    if (!bytes.length) return
    const ctrl = bytes[0]
    const isData = (ctrl & 0x40) !== 0
    for (let i = 1; i < bytes.length; i++) {
      if (isData) this.data(bytes[i])
      else this.cmdByte(bytes[i])
    }
    this.version++
  }

  private cmdByte(b: number): void {
    if (this.need > 0) {
      this.pending.push(b)
      this.need--
      if (this.need === 0) this.finish()
      return
    }
    this.pending = [b]
    if (b === 0x20 || b === 0x81 || b === 0x8d || b === 0xa8 || b === 0xd3 || b === 0xd5 || b === 0xd9 || b === 0xda || b === 0xdb) this.need = 1
    else if (b === 0x21 || b === 0x22) this.need = 2
    else if (b === 0x26 || b === 0x27) this.need = 6
    else if (b === 0x29 || b === 0x2a) this.need = 5
    else this.finish()
  }

  private finish(): void {
    const [c, a, b] = this.pending
    if (c === 0xae) this.on = false
    else if (c === 0xaf) this.on = true
    else if (c === 0xa6) this.inverted = false
    else if (c === 0xa7) this.inverted = true
    else if (c === 0x20) this.mode = a & 3
    else if (c === 0x21) {
      this.colStart = a & 127
      this.colEnd = b & 127
      this.col = this.colStart
    } else if (c === 0x22) {
      this.pageStart = a & 7
      this.pageEnd = b & 7
      this.page = this.pageStart
    } else if (c >= 0xb0 && c <= 0xb7) this.page = c & 7
    else if (c <= 0x0f) this.col = (this.col & 0xf0) | c
    else if (c >= 0x10 && c <= 0x1f) this.col = ((c & 0x0f) << 4) | (this.col & 0x0f)
    this.pending = []
  }

  private data(v: number): void {
    this.ram[this.page * 128 + this.col] = v
    if (this.mode === 2) {
      this.col = (this.col + 1) & 127
      return
    }
    this.col++
    if (this.col > this.colEnd) {
      this.col = this.colStart
      this.page++
      if (this.page > this.pageEnd) this.page = this.pageStart
    }
  }
}

class OledChip implements ChipInstance {
  readonly dev = new Ssd1306()
  private powered = false
  readonly i2c: I2cDevice
  constructor(readonly comp: ComponentInstance) {
    this.i2c = { address: 0x3c, ready: () => this.powered, write: (bytes) => this.dev.write(bytes) }
  }
  step(ctx: ChipStepCtx): void {
    const was = this.powered
    this.powered = supply(ctx) > 2.8
    load(ctx, 330, this.powered)
    if (was && !this.powered) {
      this.dev.ram.fill(0)
      this.dev.on = false
      this.dev.version++
    }
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.frame = this.dev.ram
    t.frameVersion = this.dev.version * 4 + (this.dev.on && this.powered ? 1 : 0) + (this.dev.inverted ? 2 : 0)
    t.backlight = this.dev.on && this.powered
    if (!this.powered) t.unpowered = true
  }
}

// -------------------------------------------------------------- NeoPixel

class NeoPixelChip implements ChipInstance {
  private pixels: number[]
  private powered = false
  constructor(readonly comp: ComponentInstance) {
    this.pixels = new Array(Math.max(1, Math.min(8, Math.round(num(comp, 'count', 8))))).fill(0)
  }
  step(ctx: ChipStepCtx): void {
    this.powered = supply(ctx) > 3.5
    load(ctx, 5000, this.powered)
    if (!this.powered) this.pixels.fill(0)
  }
  neopixelShow(px: number[]): void {
    if (!this.powered) return
    for (let i = 0; i < this.pixels.length; i++) this.pixels[i] = px[i] ?? 0
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.pixels = this.pixels.slice()
    if (!this.powered) t.unpowered = true
  }
}

// --------------------------------------------------------------- HC-SR04

class UltrasonicChip implements ChipInstance {
  private distance: number
  private powered = false
  private trigStart = -1
  private lastTrigHigh = false
  private echoFrom = -1
  private echoTo = -1
  private out: PinEdge[] = []
  constructor(readonly comp: ComponentInstance) {
    this.distance = num(comp, 'distance', 25)
  }
  setRuntimeParam(key: string, value: ParamValue): void {
    if (key === 'distance') this.distance = Math.max(0, Number(value) || 0)
  }
  step(ctx: ChipStepCtx): void {
    const vcc = supply(ctx)
    this.powered = vcc > 4
    load(ctx, 330, this.powered)
    const t0 = ctx.time
    const t1 = ctx.time + ctx.dt
    this.out = []
    if (!this.powered) {
      ctx.drivePin('ECHO', null)
      return
    }
    // trigger: a high pulse of at least ~8 µs on TRIG
    const edges = ctx.pinEdges?.('TRIG') ?? []
    const trigV = ctx.readPin('TRIG')
    let fell = -1
    if (edges.length) {
      for (const e of edges) {
        if (e.high) this.trigStart = e.t
        else if (this.trigStart >= 0 && e.t - this.trigStart >= 8e-6) fell = e.t
      }
    } else {
      const high = !Number.isNaN(trigV) && trigV > 2
      if (high && !this.lastTrigHigh) this.trigStart = t0
      if (!high && this.lastTrigHigh) fell = t0
      this.lastTrigHigh = high
    }
    if (fell >= 0 && (this.echoTo < 0 || fell > this.echoTo)) {
      const cm = this.distance
      const width = cm >= 2 && cm <= 400 ? cm * 58.3e-6 : 38e-3
      this.echoFrom = Math.max(fell + 250e-6, t0)
      this.echoTo = this.echoFrom + width
    }
    // drive ECHO: the fraction of this step it is high, and its exact edges
    let high = 0
    if (this.echoTo > t0 && this.echoFrom < t1) {
      high = (Math.min(this.echoTo, t1) - Math.max(this.echoFrom, t0)) / ctx.dt
      if (this.echoFrom >= t0) this.out.push({ t: this.echoFrom, high: true })
      if (this.echoTo < t1) this.out.push({ t: this.echoTo, high: false })
    }
    ctx.drivePin('ECHO', { v: Math.min(5, vcc) * Math.max(0, Math.min(1, high)), rout: 50 })
  }
  edges(pin: string): readonly PinEdge[] | null {
    return pin === 'ECHO' && this.out.length ? this.out : null
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.distance = this.distance
    if (!this.powered) t.unpowered = true
  }
}

// ------------------------------------------------------------------ DHT22

class DhtChip implements ChipInstance {
  private temperature: number
  private humidity: number
  private powered = false
  constructor(readonly comp: ComponentInstance) {
    this.temperature = num(comp, 'temperature', 22.5)
    this.humidity = num(comp, 'humidity', 45)
  }
  setRuntimeParam(key: string, value: ParamValue): void {
    if (key === 'temperature') this.temperature = Number(value) || 0
    if (key === 'humidity') this.humidity = Math.max(0, Math.min(100, Number(value) || 0))
  }
  step(ctx: ChipStepCtx): void {
    this.powered = supply(ctx) > 3
    load(ctx, 3300, this.powered)
    // the data line idles high through the module's own 10 kΩ pull-up
    const vcc = ctx.readPin('VCC')
    ctx.drivePin('DATA', this.powered ? { v: Number.isNaN(vcc) ? 0 : vcc, rout: 10000 } : null)
  }
  dhtRead(): { temperature: number; humidity: number } | null {
    if (!this.powered) return null
    return { temperature: Math.round(this.temperature * 10) / 10, humidity: Math.round(this.humidity * 10) / 10 }
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.temperature = this.temperature
    t.humidity = this.humidity
    if (!this.powered) t.unpowered = true
  }
}

registerChip('servo', (c) => new ServoChip(c))
registerChip('lcd1602_i2c', (c) => new LcdChip(c))
registerChip('oled_ssd1306', (c) => new OledChip(c))
registerChip('neopixel', (c) => new NeoPixelChip(c))
registerChip('hcsr04', (c) => new UltrasonicChip(c))
registerChip('dht22', (c) => new DhtChip(c))
