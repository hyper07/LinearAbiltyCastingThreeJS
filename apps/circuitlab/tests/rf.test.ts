/** Measurement instruments, filters and the radio link model (catalog-rf, devices-rf, rf-link, rf-measure). */
import { describe, expect, it } from 'vitest'
import type { CircuitLayout, ComponentInstance } from '../src/model/types'
import { SimEngine } from '../src/sim/engine'
import { captureSpectrum, lcrMeasure, vnaSweep } from '../src/bench/rf-measure'
import { benchPose, fsplDb, linkCoupling, mismatch, antennaZ } from '../src/sim/rf-link'
import { RfWorld, linkTable } from '../src/sim/rf-world'
import { antennaModel } from '../src/model/rf-data'
import { ferriteValues, ferriteZ } from '../src/sim/devices-rf'
import { layout, wire } from './helpers'

const gen = (params: Record<string, number | string | boolean> = {}): ComponentInstance => ({ id: 'SG1', type: 'signal_generator', pos: { x: -20, z: 22 }, params: { waveform: 'sine', frequency: 1000, vpp: 2, ...params } })
const at = (id: string, type: string, x: number, z: number, params?: Record<string, number | string | boolean>, rotation?: 0 | 90 | 180 | 270): ComponentInstance => ({ id, type, pos: { x, z }, ...(params ? { params } : {}), ...(rotation ? { rotation } : {}) })

describe('measurement instruments', () => {
  it('the frequency counter reads 1 kHz to better than 0.1 %', () => {
    const l = layout([gen(), at('FC1', 'freq_counter', 20, 22)], [wire('SG1:out', 'FC1:IN'), wire('SG1:gnd', 'FC1:GND')])
    const e = new SimEngine(l)
    e.advance(0.35, e.preferredDt())
    const f = Number(e.componentTelemetry('FC1')!.extra!.freq)
    expect(Math.abs(f - 1000) / 1000).toBeLessThan(0.001)
  })
  it('the true-RMS voltmeter reads a square wave and its duty cycle', () => {
    const l = layout([gen({ waveform: 'pulse', duty: 25, vpp: 4, offset: 2 }), at('VM1', 'rms_voltmeter', 20, 22, { mode: 'AC+DC rms' })], [wire('SG1:out', 'VM1:HI'), wire('SG1:gnd', 'VM1:LO')])
    const e = new SimEngine(l)
    e.advance(0.5, e.preferredDt())
    const x = e.componentTelemetry('VM1')!.extra!
    // 0/4 V at 25 % duty: rms = 4·√0.25 = 2 V
    expect(Number(x.rms)).toBeCloseTo(2, 1)
    expect(Number(x.duty)).toBeCloseTo(0.25, 2)
  })
  it('the spectrum analyzer shows its peak at the generator frequency, at the right level', () => {
    const l = layout([gen({ frequency: 1000, vpp: 2 }), at('SA1', 'spectrum_analyzer', 20, 22)], [wire('SG1:out', 'SA1:IN'), wire('SG1:gnd', 'SA1:GND')])
    const e = new SimEngine(l)
    e.advance(0.01, e.preferredDt())
    const s = captureSpectrum(e, 'SA1:IN', 'SA1:GND', 5000, 20, e.preferredDt())
    expect(Math.abs(s.peaks[0].f - 1000)).toBeLessThan(s.rbw)
    // 1 V amplitude = 0.707 Vrms = +10 dBm into 50 Ω (Hann scalloping < 1.5 dB)
    expect(s.peaks[0].dbm).toBeGreaterThan(8.4)
    expect(s.peaks[0].dbm).toBeLessThan(10.2)
  })
  it('the LCR meter reads a 10 µH inductor', () => {
    const l = layout([{ id: 'L1', type: 'inductor', params: { inductance: 1e-5 }, holes: ['a5', 'a10'] }, at('LCR1', 'lcr_meter', 5, 24, { testFreq: '100 kHz' })], [wire('LCR1:HI', 'b5'), wire('LCR1:LO', 'b10')])
    const r = lcrMeasure(l, 'LCR1')!
    expect(r.kind).toBe('L')
    expect(r.ls! / 1e-5).toBeCloseTo(1, 2)
    expect(r.primary).toMatch(/µH/)
  })
  it('the LCR meter reads a capacitor and its ESR through a resistor in series', () => {
    const l = layout(
      [{ id: 'C1', type: 'capacitor', params: { capacitance: 1e-6 }, holes: ['a5', 'a10'] }, { id: 'R1', type: 'resistor', params: { resistance: 2 }, holes: ['c10', 'c14'] }, at('LCR1', 'lcr_meter', 5, 24, { testFreq: '1 kHz' })],
      [wire('LCR1:HI', 'b5'), wire('LCR1:LO', 'b14')],
    )
    const r = lcrMeasure(l, 'LCR1', undefined, 'series')!
    expect(r.kind).toBe('C')
    expect(r.cs! / 1e-6).toBeCloseTo(1, 2)
    expect(r.rs).toBeCloseTo(2, 1)
  })
})

describe('filters and the VNA', () => {
  it('a dipole shows its S11 dip at resonance', () => {
    const l = layout([at('VNA1', 'vna', -20, 22), at('A1', 'ant_dipole', 10, 30)], [wire('VNA1:PORT1', 'A1:RF'), wire('VNA1:GND', 'A1:GND')])
    const r = vnaSweep(l, 'VNA1', 300e6, 600e6, 301, false)!
    const f0 = antennaModel('ant_dipole', () => undefined)!.f0
    expect(Math.abs(r.best.f - f0) / f0).toBeLessThan(0.01)
    // 73 Ω on a 50 Ω port: |Γ| = 23/123 → −14.6 dB, VSWR 1.46
    expect(r.best.s11db).toBeCloseTo(-14.6, 0)
    expect(r.best.vswr).toBeCloseTo(1.46, 1)
    // a longer dipole resonates lower
    const longer = layout([at('VNA1', 'vna', -20, 22), at('A1', 'ant_dipole', 10, 30, { length: 36 })], [wire('VNA1:PORT1', 'A1:RF'), wire('VNA1:GND', 'A1:GND')])
    expect(vnaSweep(longer, 'VNA1', 300e6, 600e6, 301, false)!.best.f).toBeLessThan(r.best.f)
  })
  it('the π filter passes DC and audio and takes > 50 dB off 100 kHz ripple', () => {
    const l = layout([at('VNA1', 'vna', -20, 22), { id: 'F1', type: 'pi_filter', holes: ['a5', 'a6', 'a7'] }], [wire('VNA1:PORT1', 'b5'), wire('VNA1:GND', 'b6'), wire('VNA1:PORT2', 'b7')])
    const r = vnaSweep(l, 'VNA1', 100, 1e6, 241)!
    const near = (f: number) => r.points.reduce((a, b) => (Math.abs(Math.log(b.f / f)) < Math.abs(Math.log(a.f / f)) ? b : a))
    // (into 50 Ω the input capacitor already loads the source above ≈ 300 Hz)
    expect(near(100).s21db).toBeGreaterThan(-2)
    expect(near(1e5).s21db).toBeLessThan(-50)
  })
  it('the common-mode choke: the differential path sees only leakage, the common-mode path the full inductance', () => {
    // differential: through L1 forward and back through L2 (fluxes cancel)
    const diff = layout([{ id: 'L1', type: 'cm_choke', at: 'e10' }, at('LCR1', 'lcr_meter', 5, 24, { testFreq: '10 kHz' })], [wire('LCR1:HI', 'a10'), wire('a13', 'j13'), wire('j10', 'LCR1:LO')])
    // common mode: both windings side by side in the same direction
    const cm = layout([{ id: 'L1', type: 'cm_choke', at: 'e10' }, at('LCR1', 'lcr_meter', 5, 24, { testFreq: '10 kHz' })], [wire('LCR1:HI', 'a10'), wire('b10', 'j10'), wire('a13', 'LCR1:LO'), wire('b13', 'j13')])
    const ld = lcrMeasure(diff, 'LCR1', undefined, 'series')!.ls!
    const lc = lcrMeasure(cm, 'LCR1', undefined, 'series')!.ls!
    // 10 mH, k = 0.995: L_dm = 2L(1 − k) = 100 µH, L_cm = L(1 + k)/2 ≈ 10 mH
    expect(ld / 1e-4).toBeCloseTo(1, 1)
    expect(lc / 1e-2).toBeCloseTo(1, 1)
  })
  it('a ferrite bead is ≈ 600 Ω at 100 MHz and almost nothing at 1 kHz', () => {
    const v = ferriteValues(600)
    const z = (f: number) => Math.hypot(...ferriteZ(v, 2 * Math.PI * f))
    expect(z(100e6)).toBeGreaterThan(540)
    expect(z(100e6)).toBeLessThan(660)
    expect(z(1e3)).toBeLessThan(0.3)
  })
})

describe('the radio link model', () => {
  it('Friis: 1 m at 2.4 GHz is ≈ 40 dB', () => {
    expect(fsplDb(1, 2.4e9)).toBeCloseTo(40.05, 1)
    // +6 dB per doubling of distance
    expect(fsplDb(2, 2.4e9) - fsplDb(1, 2.4e9)).toBeCloseTo(6.02, 1)
  })
  it('a dipole on its own resonance is matched; off resonance it reflects', () => {
    const m = antennaModel('ant_rubber_duck', () => undefined)!
    expect(mismatch(antennaZ(m, m.f0)).mlDb).toBeLessThan(0.01)
    expect(mismatch(antennaZ(m, m.f0 * 0.6)).mlDb).toBeGreaterThan(3)
  })
  it('turning one antenna 90° about the line of sight loses the link to polarization', () => {
    const m = antennaModel('ant_dipole', () => undefined)!
    const tx = { model: m, pose: benchPose([0, 0, 0], 0, 0) }
    const rx0 = { model: m, pose: benchPose([3, 0, 0], 180, 0) }
    const rx90 = { model: m, pose: benchPose([3, 0, 0], 180, 90) }
    const rx45 = { model: m, pose: benchPose([3, 0, 0], 180, 45) }
    const a = linkCoupling({ tx, rx: rx0 }, m.f0)
    expect(a.polDb).toBeCloseTo(0, 3)
    expect(linkCoupling({ tx, rx: rx45 }, m.f0).polDb).toBeCloseTo(-3.01, 1)
    expect(linkCoupling({ tx, rx: rx90 }, m.f0).couplingDb).toBeLessThan(a.couplingDb - 20)
  })
  it('a Yagi turned away loses its gain; a helix loses 3 dB to a linear antenna at any tilt', () => {
    const y = antennaModel('ant_yagi', () => undefined)!
    const d = antennaModel('ant_dipole', () => undefined)!
    const rx = { model: d, pose: benchPose([5, 0, 0], 180, 0) }
    const facing = linkCoupling({ tx: { model: y, pose: benchPose([0, 0, 0], 0, 0) }, rx }, y.f0)
    const away = linkCoupling({ tx: { model: y, pose: benchPose([0, 0, 0], 180, 0) }, rx }, y.f0)
    expect(facing.gtDbi).toBeCloseTo(7.5, 1)
    expect(away.couplingDb).toBeLessThan(facing.couplingDb - 14)
    const h = antennaModel('ant_helical', () => undefined)!
    const duck = antennaModel('ant_rubber_duck', () => undefined)!
    for (const tilt of [0, 30, 90]) expect(linkCoupling({ tx: { model: h, pose: benchPose([0, 0, 0], 0, 0) }, rx: { model: duck, pose: benchPose([2, 0, 0], 180, tilt) } }, h.f0).polDb).toBeCloseTo(-3.01, 1)
  })
  it('on the bench: SDR → rubber duck … rubber duck → power meter, tilt and distance', () => {
    const mk = (tilt: number, distance = 0): CircuitLayout =>
      layout(
        [
          at('SDR1', 'usrp_b210', -40, 24, { frequency: 2440, txOn: true, txGain: 89.75, toneOffset: 0 }),
          at('A1', 'ant_rubber_duck', 0, 30),
          at('A2', 'ant_rubber_duck', 40, 30, { tilt, distance }, 180),
          at('PM1', 'rf_power_meter', 50, 40),
        ],
        [wire('SDR1:TX/RX A', 'A1:RF'), wire('SDR1:GND', 'A1:GND'), wire('A2:RF', 'PM1:RF'), wire('A2:GND', 'PM1:GND')],
      )
    const rxDbm = (l: CircuitLayout) => linkTable(l).find((r) => r.rx.compId === 'PM1')!.best!.dbm
    const near = rxDbm(mk(0))
    expect(rxDbm(mk(90))).toBeLessThan(near - 20)
    // 10 m and 100 m: −20 dB per decade in free space
    expect(rxDbm(mk(0, 10)) - rxDbm(mk(0, 100))).toBeCloseTo(20, 1)
    // the running engine agrees with the static table
    const e = new SimEngine(mk(0))
    e.advance(0.05)
    expect(Number(e.componentTelemetry('PM1')!.extra!.sensorDbm)).toBeCloseTo(near, 1)
  })
  it('433 MHz: data passes when the link closes and is lost far beyond its range', () => {
    const mk = (distance: number): CircuitLayout =>
      layout(
        [
          { id: 'PS1', type: 'bench_supply', pos: { x: -40, z: 24 }, params: { v1: 5 } },
          gen({ waveform: 'square', frequency: 500, vpp: 5, offset: 2.5 }),
          at('TX1', 'tx433', 0, 30),
          at('RX1', 'rx433', 40, 30, { distance, environment: 'outdoors, near ground (n ≈ 2.7)' }),
        ],
        [
          wire('PS1:+', 'TX1:VCC'), wire('PS1:COM', 'TX1:GND'), wire('PS1:+', 'RX1:VCC'), wire('PS1:COM', 'RX1:GND'),
          wire('SG1:out', 'TX1:DATA'), wire('SG1:gnd', 'PS1:COM'),
        ],
      )
    const agree = (l: CircuitLayout) => {
      const e = new SimEngine(l)
      e.advance(0.03, e.preferredDt())
      let same = 0
      let n = 0
      for (let i = 0; i < 400; i++) {
        e.advance(1e-4, e.preferredDt())
        const a = e.netVoltage('TX1:DATA') > 2.5
        const b = e.netVoltage('RX1:DATA') > 2.5
        same += a === b ? 1 : 0
        n++
      }
      return same / n
    }
    // (the receiver lags the transmitter by a step or two at each edge)
    expect(agree(mk(50))).toBeGreaterThan(0.85)
    expect(agree(mk(50000))).toBeLessThan(0.75)
    const w = new RfWorld(mk(50))
    expect(linkTable(mk(50), w).find((r) => r.rx.compId === 'RX1')!.marginDb!).toBeGreaterThan(10)
  })
})
