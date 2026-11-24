/**
 * Lessons for noise, filters, measurement and wireless (senior design):
 * RC low/high-pass, a 60 Hz twin-T notch for a hum-ridden sensor signal, a
 * π filter on a switching supply, a 1 kHz Sallen-Key measured with the VNA,
 * antenna polarization, the 433 MHz link budget and a dipole's resonance.
 */
import type { CircuitLayout, ComponentInstance, Wire } from '../model/types'
import type { Callout, Preset } from './presets'

let n = 0
const w = (from: string, to: string, color: string): Wire => ({ id: `rw${++n}`, from, to, color })
const at = (id: string, type: string, x: number, z: number, params?: Record<string, number | string | boolean>, rotation?: 0 | 90 | 180 | 270): ComponentInstance => ({ id, type, pos: { x, z }, ...(params ? { params } : {}), ...(rotation ? { rotation } : {}) })
const part = (id: string, type: string, holes: string[], params?: Record<string, number | string | boolean>): ComponentInstance => ({ id, type, holes, ...(params ? { params } : {}) })
function layout(name: string, description: string, components: ComponentInstance[], wires: Wire[]): CircuitLayout {
  n = 0
  return { version: 1, name, description, board: 'half', components, wires }
}

const SCOPE = (x = 0, z = 22) => at('SC1', 'oscilloscope', x, z)

export const RF_PRESETS: Preset[] = [
  {
    id: 'rc-lowpass',
    title: 'RC low-pass filter',
    board: null,
    summary: '1 kΩ and 100 nF: highs are rolled off above f_c = 1/(2πRC) ≈ 1.6 kHz.',
    learn: [
      'At f_c the output is 0.707 of the input (−3 dB) and lags it by 45°.',
      'Above f_c it falls 20 dB per decade (×0.1 for every ×10 in frequency).',
      'Bench → Bode (CH1 in, CH2 out) sweeps it; the scope shows the lag live.',
    ],
    controls: [{ part: 'SG1', key: 'frequency', label: 'Generator frequency', kind: 'range', min: 50, max: 50000, step: 10, unit: 'Hz' }],
    layout: layout(
      'RC low-pass filter',
      'Generator → 1 kΩ → output, 100 nF from output to ground; scope CH1 on the input, CH2 on the output.',
      [
        at('SG1', 'signal_generator', -20, 22, { waveform: 'sine', frequency: 1600, vpp: 2 }),
        SCOPE(),
        at('FC1', 'freq_counter', 20, 22),
        part('R1', 'resistor', ['c10', 'c14'], { resistance: 1000 }),
        part('C1', 'capacitor', ['d14', 'd18'], { capacitance: 1e-7 }),
      ],
      [
        w('SG1:out', 'a10', 'yellow'),
        w('SG1:gnd', 'top-2', 'black'),
        w('a18', 'top-17', 'black'),
        w('SC1:CH1', 'b10', 'yellow'),
        w('SC1:CH2', 'b14', 'blue'),
        w('SC1:GND', 'top-12', 'black'),
        w('FC1:IN', 'e10', 'green'),
        w('FC1:GND', 'top-21', 'black'),
      ],
    ),
  },
  {
    id: 'rc-highpass',
    title: 'RC high-pass filter',
    board: null,
    summary: '100 nF then 1 kΩ to ground: lows are blocked below f_c ≈ 1.6 kHz.',
    learn: [
      'Swap R and C and the filter flips: DC is blocked, highs pass.',
      'At f_c the output leads the input by 45°.',
      'Coupling capacitors between amplifier stages are high-pass filters.',
    ],
    controls: [{ part: 'SG1', key: 'frequency', label: 'Generator frequency', kind: 'range', min: 50, max: 50000, step: 10, unit: 'Hz' }],
    layout: layout(
      'RC high-pass filter',
      'Generator → 100 nF → output, 1 kΩ from output to ground.',
      [
        at('SG1', 'signal_generator', -20, 22, { waveform: 'sine', frequency: 1600, vpp: 2 }),
        SCOPE(),
        at('FC1', 'freq_counter', 20, 22),
        part('C1', 'capacitor', ['c10', 'c14'], { capacitance: 1e-7 }),
        part('R1', 'resistor', ['d14', 'd18'], { resistance: 1000 }),
      ],
      [
        w('SG1:out', 'a10', 'yellow'),
        w('SG1:gnd', 'top-2', 'black'),
        w('a18', 'top-17', 'black'),
        w('SC1:CH1', 'b10', 'yellow'),
        w('SC1:CH2', 'b14', 'blue'),
        w('SC1:GND', 'top-12', 'black'),
        w('FC1:IN', 'e10', 'green'),
        w('FC1:GND', 'top-21', 'black'),
      ],
    ),
  },
  {
    id: 'hum-notch',
    title: 'Filter 60 Hz hum from a sensor',
    board: null,
    summary: 'A slow 5 Hz "sensor" signal picks up mains hum; a twin-T notch at 60 Hz removes it.',
    learn: [
      'Twin-T: R–R with 2C to ground, and C–C with R/2 to ground. f₀ = 1/(2πRC) = 60 Hz with 26.5 kΩ and 100 nF.',
      'Spectrum (FFT, stop 500 Hz): the 60 Hz line drops by 40 dB+; the 5 Hz signal stays.',
      'A passive notch is narrow-ish (Q = ¼): the 180 Hz harmonic only loses ≈ 5 dB. Shield and twist the wires first, filter second.',
    ],
    controls: [{ part: 'NS1', key: 'level', label: 'Hum level', kind: 'range', min: 0, max: 2, step: 0.05, unit: 'Vpp' }],
    layout: layout(
      'Filter 60 Hz hum',
      'Sensor (generator, 5 Hz) + hum (noise source) → twin-T notch at 60 Hz → scope CH2 and the spectrum analyzer.',
      [
        at('SG1', 'signal_generator', -20, 22, { waveform: 'sine', frequency: 5, vpp: 1 }),
        at('NS1', 'noise_source', -34, 22, { mode: 'hum 60 Hz', level: 0.6 }),
        SCOPE(),
        at('SA1', 'spectrum_analyzer', 18, 22),
        // the low-pass T (top block): R, R, 2C to ground
        part('R1', 'resistor', ['c5', 'c9'], { resistance: 26500 }),
        part('R2', 'resistor', ['d9', 'd13'], { resistance: 26500 }),
        part('C3', 'capacitor', ['b9', 'top-8'], { capacitance: 2e-7 }),
        // the high-pass T (bottom block): C, C, R/2 to ground
        part('C1', 'capacitor', ['g5', 'g9'], { capacitance: 1e-7 }),
        part('C2', 'capacitor', ['h9', 'h13'], { capacitance: 1e-7 }),
        part('R3', 'resistor', ['i9', 'bot-8'], { resistance: 13250 }),
      ],
      [
        w('SG1:out', 'NS1:IN', 'yellow'),
        w('SG1:gnd', 'top-1', 'black'),
        w('NS1:GND', 'top-3', 'black'),
        w('NS1:OUT', 'a5', 'orange'),
        w('e5', 'f5', 'orange'),
        w('e13', 'f13', 'blue'),
        w('top-0', 'bot-0', 'black'),
        w('SC1:CH1', 'd5', 'yellow'),
        w('SC1:CH2', 'b13', 'blue'),
        w('SC1:GND', 'top-20', 'black'),
        w('SA1:IN', 'a13', 'green'),
        w('SA1:GND', 'top-22', 'black'),
      ],
    ),
  },
  {
    id: 'pi-filter-supply',
    title: 'Clean a noisy supply (π filter)',
    board: null,
    summary: '12 V with 100 kHz switching ripple → C-L-C π filter → a clean rail for a 1 kΩ load.',
    learn: [
      'Scope: set both channels to AC and 0.1 V/div — CH1 (before) has ripple and spikes, CH2 (after) is flat.',
      'Spectrum (FFT, stop 500 kHz): the 100 kHz line and its harmonics drop by 60 dB+. Cut-off ≈ 16 kHz, −60 dB/decade.',
      'Decoupling: a 100 nF ceramic right at every chip supply pin and 10 µF bulk per section; a ferrite bead in series makes an LC filter.',
    ],
    controls: [{ part: 'NS1', key: 'level', label: 'Ripple', kind: 'range', min: 0, max: 2, step: 0.05, unit: 'Vpp' }],
    layout: layout(
      'π filter on a 12 V supply',
      'Bench supply 12 V → ripple injector (100 kHz) → π filter (10 µF, 10 µH, 10 µF) → 1 kΩ load.',
      [
        at('PS1', 'bench_supply', -38, 22, { v1: 12, i1: 0.2 }),
        at('NS1', 'noise_source', -20, 22, { mode: 'switching ripple', level: 0.5, frequency: 100000 }),
        SCOPE(),
        at('SA1', 'spectrum_analyzer', 18, 22),
        part('F1', 'pi_filter', ['c5', 'c6', 'c7']),
        part('R1', 'resistor', ['d7', 'd11'], { resistance: 1000 }),
      ],
      [
        w('PS1:+', 'NS1:IN', 'red'),
        w('PS1:COM', 'top-0', 'black'),
        w('NS1:GND', 'top-2', 'black'),
        w('NS1:OUT', 'a5', 'orange'),
        w('a6', 'top-5', 'black'),
        w('a11', 'top-10', 'black'),
        w('SC1:CH1', 'b5', 'yellow'),
        w('SC1:CH2', 'b7', 'blue'),
        w('SC1:GND', 'top-14', 'black'),
        w('SA1:IN', 'e7', 'green'),
        w('SA1:GND', 'top-16', 'black'),
      ],
    ),
  },
  {
    id: 'sallen-key',
    title: '1 kHz Sallen-Key low-pass',
    board: null,
    summary: 'An LM741 follower with two R and two C: a 2nd-order Butterworth-ish low-pass at ≈ 1 kHz, measured with the VNA.',
    learn: [
      'Unity gain, equal R = 10 kΩ: f₀ = 1/(2πR√(C1·C2)) ≈ 1.07 kHz and Q = ½√(C1/C2) ≈ 0.74 with C1 = 22 nF (feedback), C2 = 10 nF.',
      'Bench → VNA → "Audio filter" preset, view S21: flat, −3 dB near 1 kHz, then −40 dB/decade.',
      'Port 2 is set high-Z, so S21 is the voltage gain. Try 50 Ω: the 741\'s output resistance shows up.',
    ],
    controls: [],
    layout: layout(
      'Sallen-Key low-pass',
      'LM741 on ±12 V as a follower; R1, R2 = 10 kΩ; C1 = 22 nF from the middle node to the output; C2 = 10 nF from IN+ to ground; VNA port 1 at the input, port 2 (high-Z) at the output.',
      [
        at('PS1', 'bench_supply', -38, 22, { v1: 12, v2: 12, i1: 0.1, i2: 0.1 }),
        at('VNA1', 'vna', -20, 22, { port2: 'high-Z (1 MΩ)' }),
        { id: 'U1', type: 'lm741', at: 'f10' },
        part('R1', 'resistor', ['h3', 'h7'], { resistance: 10000 }),
        part('R2', 'resistor', ['i7', 'i12'], { resistance: 10000 }),
        part('C1', 'capacitor', ['g7', 'g9'], { capacitance: 2.2e-8 }),
        part('C2', 'capacitor', ['h12', 'bot-11'], { capacitance: 1e-8 }),
      ],
      [
        w('PS1:+', 'a11', 'red'),
        w('PS1:-', 'j13', 'blue'),
        w('PS1:COM', 'top-0', 'black'),
        w('top-1', 'bot-1', 'black'),
        w('j11', 'b12', 'green'),
        w('j9', 'a12', 'orange'),
        w('VNA1:PORT1', 'j3', 'yellow'),
        w('VNA1:PORT2', 'c12', 'blue'),
        w('VNA1:GND', 'top-5', 'black'),
      ],
    ),
  },
  {
    id: 'antenna-polarization',
    title: 'Antenna orientation and polarization',
    board: null,
    summary: 'The B210 sends a 2.44 GHz tone from one rubber duck; a second duck feeds a power meter. Tilt it and watch the power.',
    learn: [
      'Polarization loss = cos² of the angle between the two antennas: 45° costs 3 dB, 90° ≈ 25 dB (real antennas never cancel fully).',
      'Distance: free space loses 6 dB every time the distance doubles (Friis: 20·log10(4πd/λ)). Set a link distance to try it.',
      'Bench → RF link shows the whole budget: P_tx, gains, path loss, polarization, mismatch.',
    ],
    controls: [
      { part: 'A2', key: 'tilt', label: 'Receive antenna tilt', kind: 'range', min: 0, max: 90, step: 1, unit: '°' },
      { part: 'A2', key: 'distance', label: 'Link distance (0 = bench)', kind: 'range', min: 0, max: 100, step: 0.5, unit: 'm' },
    ],
    layout: layout(
      'Antenna polarization',
      'USRP B210 TX/RX A → rubber duck A1; rubber duck A2 (facing it) → RF power meter.',
      [
        at('SDR1', 'usrp_b210', -42, 24, { frequency: 2440, txOn: true, txGain: 89.75, toneOffset: 0 }),
        at('A1', 'ant_rubber_duck', -4, 30),
        at('A2', 'ant_rubber_duck', 40, 30, {}, 180),
        at('PM1', 'rf_power_meter', 46, 27),
      ],
      [w('SDR1:TX/RX A', 'A1:RF', 'yellow'), w('SDR1:GND', 'A1:GND', 'black'), w('A2:RF', 'PM1:RF', 'yellow'), w('A2:GND', 'PM1:GND', 'black')],
    ),
  },
  {
    id: 'link-433',
    title: 'Link budget: how far does 433 MHz go?',
    board: null,
    summary: 'A 500 Hz square wave crosses a 433 MHz ASK link. Raise the link distance until the receiver output turns to noise.',
    learn: [
      'Budget: +2.4 dBm (5 V) + 0 dBi + 0 dBi − path loss ≥ −105 dBm sensitivity → path loss ≤ ≈ 107 dB.',
      'Outdoors near the ground (n ≈ 2.7) that is about a kilometre; in free space over 10 km; indoors a few hundred metres.',
      'Without a carrier the receiver\'s gain winds up and DATA chatters — scope CH2. Bench → RF link shows the margin.',
    ],
    controls: [{ part: 'RX1', key: 'distance', label: 'Link distance (0 = bench)', kind: 'range', min: 0, max: 3000, step: 10, unit: 'm' }],
    layout: layout(
      '433 MHz link budget',
      '5 V rail; generator square wave → FS1000A DATA; XY-MK-5V DATA → scope CH2 (CH1 = the transmitted data).',
      [
        at('PS1', 'bench_supply', -38, 22),
        at('SG1', 'signal_generator', -20, 22, { waveform: 'square', frequency: 500, vpp: 5, offset: 2.5 }),
        at('TX1', 'tx433', 2, 24),
        at('RX1', 'rx433', 36, 24, { distance: 200, environment: 'outdoors, near ground (n ≈ 2.7)' }),
        at('SC1', 'oscilloscope', 52, 22),
      ],
      [
        w('PS1:5V', 'top+0', 'red'),
        w('PS1:COM', 'top-0', 'black'),
        w('TX1:VCC', 'top+4', 'red'),
        w('TX1:GND', 'top-4', 'black'),
        w('RX1:VCC', 'top+22', 'red'),
        w('RX1:GND', 'top-22', 'black'),
        w('SG1:out', 'TX1:DATA', 'yellow'),
        w('SG1:gnd', 'top-8', 'black'),
        w('SC1:CH1', 'TX1:DATA', 'yellow'),
        w('SC1:CH2', 'RX1:DATA', 'blue'),
        w('SC1:GND', 'top-24', 'black'),
      ],
    ),
  },
  {
    id: 'dipole-vna',
    title: "Measure a dipole's resonance",
    board: null,
    summary: 'This dipole was cut 35 cm long for 433 MHz. Sweep it with the VNA, find where it really resonates, and trim it.',
    learn: [
      'Bench → VNA → "433 MHz antenna": the S11 dip sits where the dipole is λ/2 long (× 0.95 end effect) — about 407 MHz.',
      'Trim: f ∝ 1/L, so L_new = 35 cm × 407/433.92 ≈ 32.8 cm. Set the length and sweep again.',
      'At resonance a dipole is ≈ 73 Ω: S11 ≈ −14.6 dB, VSWR 1.46 on a 50 Ω port. Smith chart: the trace crosses the real axis there.',
    ],
    controls: [{ part: 'A1', key: 'length', label: 'Dipole length', kind: 'range', min: 25, max: 40, step: 0.1, unit: 'cm' }],
    layout: layout(
      'Dipole resonance',
      'VNA PORT1 and GND → the dipole\'s SMA feed.',
      [at('VNA1', 'vna', -20, 22), at('A1', 'ant_dipole', 10, 26, { length: 35 })],
      [w('VNA1:PORT1', 'A1:RF', 'yellow'), w('VNA1:GND', 'A1:GND', 'black')],
    ),
  },
]

const CALLOUTS: Record<string, Callout[]> = {
  'rc-lowpass': [
    { part: 'R1', title: '1 kΩ', text: 'With C sets f_c = 1/(2πRC).', icon: 'resistor' },
    { part: 'C1', title: '100 nF', text: 'Shorts high frequencies to ground.', icon: 'resistor' },
    { part: 'SC1', title: 'SCOPE', text: 'CH2 shrinks and lags as f rises.', icon: 'wave' },
  ],
  'rc-highpass': [
    { part: 'C1', title: '100 nF', text: 'Blocks DC, passes the highs.', icon: 'resistor' },
    { part: 'SC1', title: 'SCOPE', text: 'CH2 leads CH1 below f_c.', icon: 'wave' },
  ],
  'hum-notch': [
    { part: 'NS1', title: 'HUM', text: 'Adds 60 Hz mains pickup to the sensor.', icon: 'wave' },
    { part: 'R1', title: 'TWIN-T', text: 'Two T networks cancel at exactly 60 Hz.', icon: 'resistor' },
    { part: 'SA1', title: 'SPECTRUM', text: 'The 60 Hz line drops away.', icon: 'meter' },
  ],
  'pi-filter-supply': [
    { part: 'NS1', title: 'RIPPLE', text: 'A buck regulator’s 100 kHz ripple.', icon: 'wave' },
    { part: 'F1', title: 'π FILTER', text: 'C-L-C: −60 dB/decade above 16 kHz.', icon: 'power' },
    { part: 'SA1', title: 'SPECTRUM', text: 'Compare before and after.', icon: 'meter' },
  ],
  'sallen-key': [
    { part: 'U1', title: 'LM741', text: 'A follower: gain 1, low output impedance.', icon: 'chip' },
    { part: 'C1', title: 'C1 22 nF', text: 'Feedback to the output sets Q.', icon: 'resistor' },
    { part: 'VNA1', title: 'VNA', text: 'S21 with a high-Z port 2 = the gain.', icon: 'meter' },
  ],
  'antenna-polarization': [
    { part: 'SDR1', title: 'USRP B210', text: 'Sends a +10 dBm tone at 2.44 GHz.', icon: 'board' },
    { part: 'A2', title: 'TILT ME', text: 'cos² of the angle between the antennas.', icon: 'sensor' },
    { part: 'PM1', title: 'POWER METER', text: 'dBm arriving at the receive antenna.', icon: 'meter' },
  ],
  'link-433': [
    { part: 'TX1', title: '433 MHz TX', text: 'Carrier on while DATA is high.', icon: 'sensor' },
    { part: 'RX1', title: '433 MHz RX', text: '−105 dBm sensitivity; chatters with no signal.', icon: 'sensor' },
    { part: 'SC1', title: 'SCOPE', text: 'CH1 sent, CH2 received.', icon: 'wave' },
  ],
  'dipole-vna': [
    { part: 'A1', title: 'DIPOLE', text: 'Resonates where it is ≈ 0.95 · λ/2 long.', icon: 'sensor' },
    { part: 'VNA1', title: 'VNA', text: 'S11 dips at the resonance.', icon: 'meter' },
  ],
}
for (const p of RF_PRESETS) p.callouts = CALLOUTS[p.id]
