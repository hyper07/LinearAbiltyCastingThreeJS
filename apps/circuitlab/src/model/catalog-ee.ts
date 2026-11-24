/**
 * Circuit Lab: the EE Lab I bench — instruments (function generator, triple
 * supply, 2-channel scope, DAQ, curve tracer, decade boxes), the LM741,
 * rectifier and Zener diodes, trimmers, logic switches and probe, the
 * common-anode display and the 74-series logic the experiments use.
 */
import type { CatalogEntry } from './catalog'
import { registerOffboardGeometry } from './breadboard'

const E = (e: CatalogEntry) => e

/** a compact bench unit: body w × d, posts along its front face */
function unit(type: string, w: number, d: number, h: number, posts: number[], y = 1.4): void {
  registerOffboardGeometry(type, {
    rect: { x0: 0, x1: w, z0: 0, z1: d + 0.8 },
    height: h,
    terminals: posts.map((dx) => ({ dx, dz: d + 0.4, y, exitDir: { x: 0, z: 1 } })),
  })
}

unit('signal_generator', 13, 7, 5, [9.5, 11.5])
unit('bench_supply', 16, 7, 5, [3, 5, 7, 11, 13])
unit('oscilloscope', 16, 8, 6, [10, 12.5, 15])
unit('daq', 15, 5, 2.4, [0.8, 2, 3.2, 4.4, 5.6, 6.8, 8, 9.6, 10.8, 12, 13.2, 14.4], 1.6)
unit('curve_tracer', 11, 7, 4.5, [6, 8, 10])

const dip = (type: string, label: string, pins: string[], doc: string): CatalogEntry =>
  E({ type, label, category: 'ic', placement: 'dip', pins, sim: { kind: 'chip', model: type }, visual: { shape: 'dip' }, bodyFootprint: 'auto', doc })

export const EE_PARTS: Record<string, CatalogEntry> = {
  // ------------------------------------------------------------ instruments
  signal_generator: E({
    type: 'signal_generator',
    label: 'Function generator (bench)',
    category: 'instrument',
    placement: 'offboard',
    pins: ['out', 'gnd'],
    params: [
      { key: 'waveform', label: 'Waveform', kind: 'select', default: 'sine', options: ['sine', 'square', 'triangle', 'pulse', 'dc'], runtime: true },
      { key: 'frequency', label: 'Frequency', kind: 'number', default: 1000, min: 0.01, max: 1e6, unit: 'Hz', runtime: true },
      { key: 'vpp', label: 'Amplitude', kind: 'number', default: 2, min: 0, max: 20, step: 0.01, unit: 'Vpp', runtime: true },
      { key: 'offset', label: 'DC offset', kind: 'number', default: 0, min: -10, max: 10, step: 0.01, unit: 'V', runtime: true },
      { key: 'duty', label: 'Duty cycle', kind: 'number', default: 50, min: 1, max: 99, step: 1, unit: '%', runtime: true },
      { key: 'load', label: 'Display for', kind: 'select', default: 'High-Z', options: ['High-Z', '50Ω'], runtime: true },
      { key: 'output', label: 'Output on', kind: 'boolean', default: true, runtime: true },
    ],
    sim: { kind: 'device', model: 'signal_generator' },
    visual: { shape: 'bench' },
    doc: 'Bench function generator with a 50 Ω output: sine, square, triangle, pulse (duty) or DC. Amplitude is the DISPLAYED Vpp: set "Display for" to 50Ω and a high-impedance circuit sees twice that.',
  }),
  bench_supply: E({
    type: 'bench_supply',
    label: 'Triple bench supply (±30 V, 5 V)',
    category: 'power',
    placement: 'offboard',
    pins: ['+', 'COM', '-', '5V', 'GND5'],
    internalBridges: [['COM', 'GND5']],
    groundPin: 'COM',
    params: [
      { key: 'v1', label: 'CH1 voltage (+ to COM)', kind: 'number', default: 12, min: 0, max: 30, step: 0.1, unit: 'V', runtime: true },
      { key: 'i1', label: 'CH1 current limit', kind: 'number', default: 0.2, min: 0.001, max: 3, step: 0.001, unit: 'A', runtime: true },
      { key: 'v2', label: 'CH2 voltage (COM to −)', kind: 'number', default: 12, min: 0, max: 30, step: 0.1, unit: 'V', runtime: true },
      { key: 'i2', label: 'CH2 current limit', kind: 'number', default: 0.2, min: 0.001, max: 3, step: 0.001, unit: 'A', runtime: true },
      { key: 'output', label: 'Output on', kind: 'boolean', default: true, runtime: true },
    ],
    sim: { kind: 'device', model: 'bench_supply' },
    visual: { shape: 'bench' },
    doc: 'Triple bench supply: CH1 between + and COM, CH2 between COM and − (so +V/−V for op-amps), and a fixed 5 V between 5V and COM. Each channel is constant-voltage until its current limit, then constant-current (CC). COM is circuit ground.',
  }),
  oscilloscope: E({
    type: 'oscilloscope',
    label: 'Oscilloscope (2 channels)',
    category: 'instrument',
    placement: 'offboard',
    pins: ['CH1', 'CH2', 'GND'],
    params: [
      { key: 'probe1', label: 'CH1 probe', kind: 'select', default: '10x', options: ['1x', '10x'], runtime: true },
      { key: 'probe2', label: 'CH2 probe', kind: 'select', default: '10x', options: ['1x', '10x'], runtime: true },
    ],
    sim: { kind: 'device', model: 'scope_inputs' },
    visual: { shape: 'bench' },
    doc: 'Two-channel oscilloscope. Clip each probe to a node (wire "SCOPE:CH1") and its ground clip to circuit ground ("SCOPE:GND"). Inputs are 1 MΩ (×1 probe) or 10 MΩ (×10 probe). Operate it from the Bench panel.',
  }),
  daq: E({
    type: 'daq',
    label: 'DAQ device (USB)',
    category: 'instrument',
    placement: 'offboard',
    pins: ['AI0+', 'AI0-', 'AI1+', 'AI1-', 'AO0', 'AO1', 'AGND', 'DIO0', 'DIO1', 'DIO2', 'DIO3', 'DGND'],
    internalBridges: [['AGND', 'DGND']],
    groundPin: 'AGND',
    params: [
      { key: 'ao0', label: 'AO0', kind: 'number', default: 0, min: -10, max: 10, step: 0.01, unit: 'V', runtime: true },
      { key: 'ao1', label: 'AO1', kind: 'number', default: 0, min: -10, max: 10, step: 0.01, unit: 'V', runtime: true },
      { key: 'dio', label: 'DIO (0/1/z)', kind: 'text', default: 'zzzz', runtime: true, hidden: true },
    ],
    sim: { kind: 'device', model: 'daq' },
    visual: { shape: 'bench' },
    doc: 'USB data-acquisition device: 2 differential analog inputs, 2 analog outputs (±10 V), 4 digital I/O lines. AGND is the computer\'s ground. Record and export from the VI panel.',
  }),
  curve_tracer: E({
    type: 'curve_tracer',
    label: 'Curve tracer',
    category: 'instrument',
    placement: 'offboard',
    pins: ['C', 'B', 'E'],
    groundPin: 'E',
    params: [{ key: 'mode', label: 'Device', kind: 'select', default: 'diode', options: ['off', 'diode', 'npn', 'pnp', 'nmos'], runtime: true }],
    sim: { kind: 'device', model: 'curve_tracer' },
    visual: { shape: 'bench' },
    doc: 'Curve tracer for I–V curves. Diode: anode to C, cathode to E. BJT: collector C, base B, emitter E (steps base current). MOSFET: drain C, gate B, source E (steps gate voltage).',
  }),
  decade_resistor: E({
    type: 'decade_resistor',
    label: 'Decade resistor box',
    category: 'passive',
    placement: 'leads',
    pins: ['p1', 'p2'],
    params: [{ key: 'resistance', label: 'Resistance', kind: 'number', default: 1000, min: 1, max: 9999999, step: 1, unit: 'Ω', runtime: true }],
    sim: { kind: 'device', model: 'resistor' },
    visual: { shape: 'decade' },
    doc: 'Decade resistance box, 1 Ω … 9.999999 MΩ in 1 Ω steps. Its two leads go into any two holes; change the value while running (load sweeps).',
  }),
  decade_capacitor: E({
    type: 'decade_capacitor',
    label: 'Decade capacitor box',
    category: 'passive',
    placement: 'leads',
    pins: ['p1', 'p2'],
    params: [{ key: 'capacitance', label: 'Capacitance', kind: 'number', default: 1e-7, min: 1e-10, max: 1e-5, unit: 'F' }],
    sim: { kind: 'device', model: 'capacitor' },
    visual: { shape: 'decade' },
    doc: 'Decade capacitance box, 100 pF … 10 µF.',
  }),

  // ---------------------------------------------------------------- parts
  lm741: E({
    type: 'lm741',
    label: 'LM741 op-amp',
    category: 'ic',
    placement: 'dip',
    pins: ['NULL1', 'IN-', 'IN+', 'V-', 'NULL2', 'OUT', 'V+', 'NC'],
    sim: { kind: 'device', model: 'opamp741' },
    visual: { shape: 'dip' },
    bodyFootprint: 'auto',
    doc: 'LM741 general-purpose op-amp (DIP-8): 2 IN−, 3 IN+, 4 V−, 6 OUT, 7 V+. Use a dual supply (±12 V). Gain 200 000, GBW 1 MHz, slew 0.5 V/µs; the output saturates about 1.5 V inside the rails.',
  }),
  diode_1n4007: E({
    type: 'diode_1n4007',
    label: 'Rectifier diode (1N4007)',
    category: 'semiconductor',
    placement: 'leads',
    pins: ['anode', 'cathode'],
    sim: { kind: 'device', model: 'diode_1n4007' },
    visual: { shape: 'diode' },
    doc: '1 A rectifier diode, ~0.7 V at 10 mA. Band = cathode.',
  }),
  zener_1n4733: E({
    type: 'zener_1n4733',
    label: 'Zener 5.1 V (1N4733A)',
    category: 'semiconductor',
    placement: 'leads',
    pins: ['anode', 'cathode'],
    params: [{ key: 'vz', label: 'Zener voltage', kind: 'number', default: 5.1, min: 2, max: 30, step: 0.1, unit: 'V' }],
    sim: { kind: 'device', model: 'zener' },
    visual: { shape: 'diode' },
    doc: '5.1 V Zener diode. As a regulator: cathode to the positive side through a series resistor; it conducts in reverse above 5.1 V.',
  }),
  trimmer: E({
    type: 'trimmer',
    label: 'Trimmer potentiometer',
    category: 'passive',
    placement: 'leads',
    pins: ['ccw', 'wiper', 'cw'],
    params: [
      { key: 'resistance', label: 'Total resistance', kind: 'number', default: 10000, min: 100, max: 1e6, unit: 'Ω' },
      { key: 'position', label: 'Position', kind: 'number', default: 0.5, min: 0, max: 1, step: 0.01, runtime: true },
    ],
    sim: { kind: 'device', model: 'potentiometer' },
    visual: { shape: 'pot' },
    doc: 'Small multi-turn trimmer: ccw end, wiper, cw end.',
  }),
  logic_switch: E({
    type: 'logic_switch',
    label: 'Logic switch',
    category: 'switch',
    placement: 'leads',
    pins: ['VCC', 'OUT', 'GND'],
    params: [{ key: 'on', label: 'On (HIGH)', kind: 'boolean', default: false, runtime: true }],
    sim: { kind: 'device', model: 'logic_switch' },
    visual: { shape: 'slide' },
    doc: 'Logic level switch: OUT is tied to VCC when on, to GND when off — a clean 1 or 0 for a gate input.',
  }),
  logic_probe: E({
    type: 'logic_probe',
    label: 'Logic probe',
    category: 'instrument',
    placement: 'probe',
    pins: ['TIP'],
    sim: { kind: 'device', model: 'logic_probe' },
    visual: { shape: 'probe' },
    doc: 'Logic probe: shows HIGH (above 2.0 V), LOW (below 0.8 V) or nothing (an invalid or floating level), and blinks its pulse light on edges.',
  }),
  seven_segment_ca: E({
    type: 'seven_segment_ca',
    label: '7-segment display (common anode)',
    category: 'display',
    placement: 'dip',
    pins: ['E', 'D', 'COM1', 'C', 'DP', 'B', 'A', 'COM2', 'F', 'G'],
    internalBridges: [['COM1', 'COM2']],
    bodyFootprint: { dCols: [0, 4], rows: ['e', 'f'] },
    sim: { kind: 'device', model: 'seven_segment_ca' },
    visual: { shape: 'sevenseg' },
    doc: 'Common-anode 7-segment display: COM to +5 V, a segment lights when its pin is pulled LOW through ~330 Ω (pair it with a 74LS47).',
  }),
  sn7402: dip('sn7402', '7402 quad NOR', ['1Y', '1A', '1B', '2Y', '2A', '2B', 'GND', '3A', '3B', '3Y', '4A', '4B', '4Y', 'VCC'], 'Quad 2-input NOR gates (DIP-14). Note the outputs come first on each gate (1Y 1A 1B).'),
  sn74112: dip('sn74112', '74112 dual JK flip-flop', ['1CLK', '1K', '1J', '1PRE', '1Q', '1QN', '2QN', 'GND', '2Q', '2PRE', '2J', '2K', '2CLK', '2CLR', '1CLR', 'VCC'], 'Dual JK flip-flop, falling-edge clock, active-low PRE/CLR (tie high when unused). J=K=1 toggles.'),
  sn7490: dip('sn7490', '7490 decade counter', ['CKB', 'R01', 'R02', 'NC', 'VCC', 'R91', 'R92', 'QC', 'QB', 'GND', 'QD', 'QA', 'NC2', 'CKA'], 'Decade counter: CKA→QA divides by 2, CKB→QB..QD by 5; wire QA to CKB for BCD 0–9. R0(1)/R0(2) high clears, R9 high sets 9. Note VCC is pin 5, GND pin 10.'),
  sn74161: dip('sn74161', '74161 4-bit counter', ['CLR', 'CLK', 'A', 'B', 'C', 'D', 'ENP', 'GND', 'LOAD', 'ENT', 'QD', 'QC', 'QB', 'QA', 'RCO', 'VCC'], 'Synchronous 4-bit binary counter: counts on rising CLK when ENP=ENT=1; LOAD low presets A–D; CLR low clears; RCO high at 15.'),
  sn74164: dip('sn74164', '74164 shift register', ['A', 'B', 'QA', 'QB', 'QC', 'QD', 'GND', 'CLK', 'CLR', 'QE', 'QF', 'QG', 'QH', 'VCC'], '8-bit serial-in parallel-out shift register: data = A AND B, shifted in on rising CLK; CLR low clears.'),
  sn74595: dip('sn74595', '74595 shift register + latch', ['QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'GND', "QH'", 'SRCLR', 'SRCLK', 'RCLK', 'OE', 'SER', 'QA', 'VCC'], '8-bit shift register with an output latch: SER shifts in on SRCLK, RCLK copies to QA–QH, OE low enables the outputs.'),
  sn74138: dip('sn74138', '74138 3-to-8 decoder', ['A', 'B', 'C', 'G2A', 'G2B', 'G1', 'Y7', 'GND', 'Y6', 'Y5', 'Y4', 'Y3', 'Y2', 'Y1', 'Y0', 'VCC'], '3-to-8 decoder with active-low outputs; enabled when G1 is high and G2A, G2B are low.'),
  sn74151: dip('sn74151', '74151 8-to-1 mux', ['D3', 'D2', 'D1', 'D0', 'Y', 'W', 'G', 'GND', 'C', 'B', 'A', 'D7', 'D6', 'D5', 'D4', 'VCC'], '8-to-1 multiplexer: Y = D[CBA] when the strobe G is low; W = not Y.'),
  sn7447: dip('sn7447', '7447 BCD→7-seg (common anode)', ['B', 'C', 'LT', 'BI/RBO', 'RBI', 'D', 'A', 'GND', 'e', 'd', 'c', 'b', 'a', 'g', 'f', 'VCC'], 'BCD to 7-segment decoder with active-low open-collector outputs for a common-anode display (via ~330 Ω). Tie LT, BI/RBO and RBI high.'),
}
