/**
 * Compiled mode: a real ATmega328P (Uno, Nano) running the compiled HEX on
 * avr8js (Wokwi, MIT), clocked by the circuit simulation.
 *
 * Each solver step runs exactly the CPU cycles of that step (16 MHz × dt).
 * Port writes become pin changes at their exact cycle (so PWM from the
 * hardware timers, Servo pulses and tone() are real waveforms), input pins
 * read the solved node voltages (and exact edges from fast parts like the
 * HC-SR04), the ADC samples node voltages, the USART is the serial monitor
 * and the TWI peripheral talks to the I²C parts on A4/A5.
 *
 * The bridge pattern follows OpenCircuit 3D's AVR8Runner (MIT, see NOTICE).
 */
import {
  AVRADC,
  AVRIOPort,
  AVRTimer,
  AVRTWI,
  AVRUSART,
  CPU,
  PinState,
  adcConfig,
  avrInstruction,
  portBConfig,
  portCConfig,
  portDConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  twiConfig,
  usart0Config,
  type TWIEventHandler,
} from 'avr8js'
import { boardDef, type BoardDef } from '../../model/boards'
import type { McuIO, McuRuntime } from '../types'

export const AVR_HZ = 16e6

/** Intel HEX → program memory */
export function loadHex(hex: string, target: Uint8Array): number {
  let base = 0
  let bytes = 0
  for (const raw of hex.split(/\r?\n/)) {
    const line = raw.trim()
    if (line[0] !== ':') continue
    const count = parseInt(line.slice(1, 3), 16)
    const addr = parseInt(line.slice(3, 7), 16)
    const type = parseInt(line.slice(7, 9), 16)
    if (type === 0x00) {
      for (let i = 0; i < count; i++) target[base + addr + i] = parseInt(line.slice(9 + i * 2, 11 + i * 2), 16)
      bytes += count
    } else if (type === 0x02) {
      base = parseInt(line.slice(9, 13), 16) << 4
    } else if (type === 0x04) {
      base = parseInt(line.slice(9, 13), 16) << 16
    }
  }
  return bytes
}

type PortName = 'B' | 'C' | 'D'

class TwiBridge implements TWIEventHandler {
  io: McuIO | null = null
  private addr = 0
  private writing = true
  private buf: number[] = []
  private rx: number[] = []
  constructor(private readonly twi: AVRTWI) {}
  start(): void {
    this.flush()
    this.twi.completeStart()
  }
  stop(): void {
    this.flush()
    this.twi.completeStop()
  }
  connectToSlave(addr: number, write: boolean): void {
    this.flush()
    this.addr = addr
    this.writing = write
    this.buf = []
    const ack = this.io ? this.io.i2cWrite(addr, []) : false
    if (ack && !write) this.rx = this.io?.i2cRead(addr, 32) ?? []
    this.twi.completeConnect(ack)
  }
  writeByte(value: number): void {
    this.buf.push(value)
    this.twi.completeWrite(true)
  }
  readByte(_ack: boolean): void {
    this.twi.completeRead(this.rx.length ? (this.rx.shift() as number) : 0xff)
  }
  private flush(): void {
    if (this.writing && this.buf.length && this.io) this.io.i2cWrite(this.addr, this.buf)
    this.buf = []
  }
}

export class AvrRuntime implements McuRuntime {
  readonly kind = 'avr' as const
  state: McuRuntime['state'] = 'running'
  error?: string
  line?: number
  private readonly cpu: CPU
  private readonly ports: Record<PortName, AVRIOPort>
  private readonly usart: AVRUSART
  private readonly adc: AVRADC
  private readonly twi: TwiBridge
  private readonly board: BoardDef
  private io: McuIO | null = null
  private t0 = 0
  private cycle0 = 0
  private rx: number[] = []
  /** last published state per port bit */
  private last = new Map<string, number>()

  constructor(boardType: string, hex: string) {
    this.board = boardDef(boardType) as BoardDef
    const program = new Uint16Array(0x4000)
    const n = loadHex(hex, new Uint8Array(program.buffer))
    if (n === 0) {
      this.state = 'error'
      this.error = 'The compiled program is empty.'
    }
    this.cpu = new CPU(program)
    new AVRTimer(this.cpu, timer0Config)
    new AVRTimer(this.cpu, timer1Config)
    new AVRTimer(this.cpu, timer2Config)
    this.ports = {
      B: new AVRIOPort(this.cpu, portBConfig),
      C: new AVRIOPort(this.cpu, portCConfig),
      D: new AVRIOPort(this.cpu, portDConfig),
    }
    this.usart = new AVRUSART(this.cpu, usart0Config, AVR_HZ)
    this.usart.onByteTransmit = (b) => this.io?.serialWrite(String.fromCharCode(b))
    this.adc = new AVRADC(this.cpu, adcConfig)
    const twi = new AVRTWI(this.cpu, twiConfig, AVR_HZ)
    this.twi = new TwiBridge(twi)
    twi.eventHandler = this.twi
    for (const name of ['B', 'C', 'D'] as PortName[]) {
      this.ports[name].addListener(() => this.publish(name))
    }
  }

  private now(): number {
    return this.t0 + (this.cpu.cycles - this.cycle0) / AVR_HZ
  }

  /** port register change → pin modes and levels in the bank */
  private publish(port: PortName): void {
    const io = this.io
    const map = this.board.avrPorts?.[port]
    if (!io || !map) return
    const p = this.ports[port]
    const t = this.now()
    for (let bit = 0; bit < 8; bit++) {
      const pin = map[bit]
      if (!pin) continue
      const st = p.pinState(bit)
      const key = `${port}${bit}`
      if (this.last.get(key) === st) continue
      const prev = this.last.get(key)
      this.last.set(key, st)
      if (st === PinState.High || st === PinState.Low) {
        if (prev !== PinState.High && prev !== PinState.Low) io.pinMode(pin, 'output', t)
        io.digitalWrite(pin, st === PinState.High, t)
      } else {
        io.pinMode(pin, st === PinState.InputPullUp ? 'pullup' : 'input', t)
      }
    }
  }

  serialIn(text: string): void {
    for (const ch of text) this.rx.push(ch.charCodeAt(0) & 0xff)
  }

  run(t0: number, t1: number, io: McuIO): void {
    if (this.state === 'error' || this.state === 'stopped') return
    this.io = io
    this.twi.io = io
    this.t0 = t0
    this.cycle0 = this.cpu.cycles
    const ports = this.board.avrPorts
    if (!ports) return
    // inputs: levels and ADC from the last solve
    const pending: { cycle: number; port: PortName; bit: number; high: boolean }[] = []
    const dt = t1 - t0
    for (const name of ['B', 'C', 'D'] as PortName[]) {
      const p = this.ports[name]
      ports[name].forEach((pin, bit) => {
        if (!pin) return
        const st = p.pinState(bit)
        if (st === PinState.High || st === PinState.Low) return
        p.setPin(bit, io.digitalRead(pin))
        for (const e of io.edgesOn(pin)) {
          const at = e.t < t0 ? e.t + dt : e.t // edges from the previous step land one step later
          if (at >= t0 && at < t1) pending.push({ cycle: this.cycle0 + Math.round((at - t0) * AVR_HZ), port: name, bit, high: e.high })
        }
      })
    }
    pending.sort((a, b) => a.cycle - b.cycle)
    for (const [pin, ch] of Object.entries(this.board.adc)) {
      const v = io.voltage(pin)
      this.adc.channelValues[ch] = Number.isNaN(v) ? 0 : Math.max(0, Math.min(5, v))
    }
    if (this.rx.length && this.usart.writeByte(this.rx[0])) this.rx.shift()

    const target = this.cycle0 + Math.round(dt * AVR_HZ)
    const cpu = this.cpu
    let k = 0
    try {
      while (cpu.cycles < target) {
        while (k < pending.length && pending[k].cycle <= cpu.cycles) {
          const e = pending[k++]
          this.ports[e.port].setPin(e.bit, e.high)
        }
        avrInstruction(cpu)
        cpu.tick()
      }
    } catch (err) {
      this.state = 'error'
      this.error = `The AVR stopped: ${err instanceof Error ? err.message : String(err)}`
    }
  }
}
