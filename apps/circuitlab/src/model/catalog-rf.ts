/**
 * Circuit Lab: measurement, noise/filter and wireless parts for senior
 * design — frequency counter, spectrum analyzer, true-RMS voltmeter, LCR
 * meter, vector network analyzer, RF power meter and a noise source; the
 * ferrite bead, common-mode choke, π and LC filter modules; the USRP B210
 * software-defined radio, the common radio modules (nRF24L01+, HC-05,
 * RFM95W LoRa, 433 MHz ASK pair) and nine antennas.
 *
 * The device models live in src/sim/devices-rf.ts, the link budget in
 * src/sim/rf-link.ts and rf-world.ts, the facts in rf-data.ts.
 */
import type { CatalogEntry, ParamDef } from './catalog'
import { registerOffboardGeometry } from './breadboard'
import { ENVIRONMENTS } from '../sim/rf-link'

const E = (e: CatalogEntry) => e

/** a bench box w × d (×h) with its terminals on the front face */
function unit(type: string, w: number, d: number, h: number, posts: number[], y = 1.4): void {
  registerOffboardGeometry(type, {
    rect: { x0: 0, x1: w, z0: 0, z1: d + 0.8 },
    height: h,
    terminals: posts.map((dx) => ({ dx, dz: d + 0.4, y, exitDir: { x: 0, z: 1 } })),
  })
}
/** a module / antenna: rect, height, terminals [dx, dz, y, exitX, exitZ] */
function geo(type: string, rect: [number, number, number, number], height: number, terminals: [number, number, number, number, number][]): void {
  registerOffboardGeometry(type, {
    rect: { x0: rect[0], x1: rect[1], z0: rect[2], z1: rect[3] },
    height,
    terminals: terminals.map(([dx, dz, y, ex, ez]) => ({ dx, dz, y, exitDir: { x: ex, z: ez } })),
  })
}

// ----------------------------------------------------------- bench units
unit('freq_counter', 12, 6, 4.5, [8.5, 10.5])
unit('spectrum_analyzer', 16, 8, 6, [12.5, 14.5])
unit('rms_voltmeter', 11, 6, 4.5, [7.5, 9.5])
unit('lcr_meter', 12, 6, 4.5, [8, 10])
unit('vna', 13, 7, 3.2, [8, 10, 12])
unit('rf_power_meter', 10, 6, 4, [6.5, 8.5])
unit('noise_source', 12, 6, 4.5, [7, 9, 11])
// USRP B210 in its enclosure: SMA ports on the front, USB 3 at the back
unit('usrp_b210', 30, 18, 4, [4, 9, 16, 21, 26], 2)

// ------------------------------------------------- radio modules (flat)
// nRF24L01+: 15 × 29 mm, 2 × 4 header at the left end (odd pins nearer the edge)
geo('nrf24l01', [-0.4, 11.6, 0, 6], 1.6, [
  [0.6, 1.5, 1.4, -1, 0], [1.6, 1.5, 1.4, -1, 0],
  [0.6, 2.5, 1.4, -1, 0], [1.6, 2.5, 1.4, -1, 0],
  [0.6, 3.5, 1.4, -1, 0], [1.6, 3.5, 1.4, -1, 0],
  [0.6, 4.5, 1.4, -1, 0], [1.6, 4.5, 1.4, -1, 0],
])
// HC-05 on its breakout: 16 × 37 mm, 6-pin header off the left end
geo('hc05', [-1.4, 14.6, 0, 6.4], 1.8, [0.7, 1.7, 2.7, 3.7, 4.7, 5.7].map((z) => [-0.8, z, 1.0, -1, 0] as [number, number, number, number, number]))
// RFM95W on a breakout: header on the left, the ANT pad on the right
geo('rfm95', [-1.2, 10.6, 0, 9], 1.6, [...[0.8, 1.8, 2.8, 3.8, 4.8, 5.8, 6.8, 7.8].map((z) => [-0.6, z, 1.0, -1, 0] as [number, number, number, number, number]), [10.2, 4.5, 0.9, 1, 0]])
// FS1000A 433 MHz transmitter: 19 × 19 mm, DATA VCC GND at the front edge, ANT pad at the back
geo('tx433', [0, 7.6, -0.6, 8.4], 1.4, [[2.8, 8.0, 0.9, 0, 1], [3.8, 8.0, 0.9, 0, 1], [4.8, 8.0, 0.9, 0, 1], [6.8, 0, 0.9, 0, -1]])
// XY-MK-5V receiver: 30 × 14 mm, VCC DATA DATA GND at the front edge, ANT pad at the back
geo('rx433', [0, 12, -0.6, 6.4], 1.4, [[3.0, 6.0, 0.9, 0, 1], [4.0, 6.0, 0.9, 0, 1], [5.0, 6.0, 0.9, 0, 1], [6.0, 6.0, 0.9, 0, 1], [11.2, 0, 0.9, 0, -1]])

// ------------------------------------------------------------- antennas
// SMA feed at the back (−x); the beam antennas point +x (their boresight)
const feed: [number, number, number, number, number][] = [
  [0, 1.4, 0.9, -1, 0],
  [0, 2.6, 0.9, -1, 0],
]
geo('ant_dipole', [0, 4, 0, 4], 14, feed)
geo('ant_monopole', [0, 6, -1, 5], 14, feed)
geo('ant_rubber_duck', [0, 3, 0.5, 3.5], 9, feed)
geo('ant_patch', [0, 3, -2, 6], 8, feed)
geo('ant_yagi', [0, 24, -1, 5], 8, feed)
geo('ant_helical', [0, 14, -2.5, 6.5], 8, feed)
geo('ant_loop', [0, 3, -1.5, 5.5], 10, feed)
geo('ant_horn', [0, 10, -2.5, 6.5], 7, feed)
geo('ant_pcb_ifa', [0, 3, -1, 5], 7, feed)

// ------------------------------------------------------------- shared params
const RF_ENDPOINT: ParamDef[] = [
  { key: 'distance', label: 'Link distance (0 = as on the bench)', kind: 'number', default: 0, min: 0, max: 100000, step: 1, unit: 'm', runtime: true },
  { key: 'environment', label: 'Path loss', kind: 'select', default: Object.keys(ENVIRONMENTS)[0], options: Object.keys(ENVIRONMENTS), runtime: true },
]
const TILT: ParamDef = { key: 'tilt', label: 'Tilt about its front axis (0 = vertical)', kind: 'number', default: 0, min: 0, max: 90, step: 1, unit: '°', runtime: true }
const freqParam = (def: number, min: number, max: number): ParamDef => ({ key: 'frequency', label: 'Design frequency', kind: 'number', default: def, min, max, step: 0.01, unit: 'MHz' })

const antenna = (type: string, label: string, extra: ParamDef[], doc: string, shape = 'rf_antenna'): CatalogEntry =>
  E({ type, label, category: 'rf', placement: 'offboard', pins: ['RF', 'GND'], params: [...extra, TILT, ...RF_ENDPOINT], sim: { kind: 'device', model: 'antenna' }, visual: { shape }, doc })

const MODULE_ANT_433 = ['λ/4 wire whip (17.3 cm)', 'none (bare pad)', 'external (ANT pin)']

export const RF_PARTS: Record<string, CatalogEntry> = {
  // ---------------------------------------------------------- instruments
  freq_counter: E({
    type: 'freq_counter',
    label: 'Frequency counter',
    category: 'instrument',
    placement: 'offboard',
    pins: ['IN', 'GND'],
    groundPin: 'GND',
    params: [
      { key: 'gate', label: 'Gate time', kind: 'select', default: '0.1 s', options: ['10 ms', '0.1 s', '1 s'], runtime: true },
      { key: 'level', label: 'Trigger level (auto = middle)', kind: 'select', default: 'auto', options: ['auto', '0 V', '1.4 V (TTL)', '2.5 V'], runtime: true },
      { key: 'display', label: 'Shows', kind: 'select', default: 'frequency', options: ['frequency', 'period', 'count'], runtime: true },
    ],
    sim: { kind: 'device', model: 'freq_counter' },
    visual: { shape: 'rf_bench' },
    doc: 'Reciprocal frequency counter (1 MΩ input): clip IN to a node and GND to circuit ground. It times every rising crossing of the trigger level during the gate time and shows frequency = (crossings − 1) / time between the first and last — so a 0.1 s gate already reads a 1 kHz signal to a few ppm.',
  }),
  spectrum_analyzer: E({
    type: 'spectrum_analyzer',
    label: 'Spectrum analyzer',
    category: 'instrument',
    placement: 'offboard',
    pins: ['IN', 'GND'],
    groundPin: 'GND',
    params: [{ key: 'input', label: 'Input', kind: 'select', default: 'high-Z probe', options: ['high-Z probe', '50 Ω'], runtime: true }],
    sim: { kind: 'device', model: 'spectrum_analyzer' },
    visual: { shape: 'rf_bench' },
    doc: 'Spectrum analyzer: level (dBm into 50 Ω, or dBV) against frequency, with RBW and markers. Up to 1 MHz it shows the FFT of the simulated voltage on IN (hum, ripple, harmonics, noise); from 1 MHz to 3.2 GHz it shows the carriers that reach IN through a cable or an antenna (from the link-budget model). Max input +20 dBm, 50 V DC.',
  }),
  rms_voltmeter: E({
    type: 'rms_voltmeter',
    label: 'True-RMS voltmeter',
    category: 'instrument',
    placement: 'offboard',
    pins: ['HI', 'LO'],
    params: [{ key: 'mode', label: 'Measures', kind: 'select', default: 'AC+DC rms', options: ['AC+DC rms', 'AC rms', 'DC', 'dBV', 'dBm (600 Ω)', 'Hz', 'duty'], runtime: true }],
    sim: { kind: 'device', model: 'rms_voltmeter' },
    visual: { shape: 'rf_bench' },
    doc: 'Bench true-RMS voltmeter (10 MΩ, floating HI/LO): AC+DC rms, AC rms (DC removed), DC average, dBV, dBm referred to 600 Ω, frequency (Hz) and duty cycle — the RMS of any wave shape, not just sines.',
  }),
  lcr_meter: E({
    type: 'lcr_meter',
    label: 'LCR meter',
    category: 'instrument',
    placement: 'offboard',
    pins: ['HI', 'LO'],
    params: [
      { key: 'testFreq', label: 'Test frequency', kind: 'select', default: '1 kHz', options: ['100 Hz', '120 Hz', '1 kHz', '10 kHz', '100 kHz'], runtime: true },
      { key: 'circuit', label: 'Equivalent circuit', kind: 'select', default: 'auto', options: ['auto', 'series', 'parallel'], runtime: true },
    ],
    sim: { kind: 'device', model: 'lcr_meter' },
    visual: { shape: 'rf_bench' },
    doc: 'LCR meter: puts 1 Vrms at the test frequency through 100 Ω across HI–LO and measures the complex impedance — it shows L, C or R with ESR, D (loss) and Q, series or parallel model. Measure parts out of circuit with the power off (anything else in parallel is measured too).',
  }),
  vna: E({
    type: 'vna',
    label: 'Vector network analyzer',
    category: 'instrument',
    placement: 'offboard',
    pins: ['PORT1', 'PORT2', 'GND'],
    groundPin: 'GND',
    params: [{ key: 'port2', label: 'Port 2 receiver', kind: 'select', default: '50 Ω', options: ['50 Ω', 'high-Z (1 MΩ)'], runtime: true }],
    sim: { kind: 'device', model: 'vna' },
    visual: { shape: 'rf_bench' },
    doc: 'Two-port vector network analyzer (50 Ω): sweeps PORT1 and measures S11 (reflection: return loss, VSWR, impedance, Smith chart) and S21 (transmission through a filter or amplifier into PORT2). Wire PORT1 and GND to an antenna\'s RF and GND to find its resonance, or PORT1 → filter in, filter out → PORT2. Sweeps 10 Hz – 6 GHz here.',
  }),
  rf_power_meter: E({
    type: 'rf_power_meter',
    label: 'RF power meter',
    category: 'instrument',
    placement: 'offboard',
    pins: ['RF', 'GND'],
    params: [{ key: 'offset', label: 'Attenuator offset', kind: 'number', default: 0, min: 0, max: 60, step: 1, unit: 'dB', runtime: true }],
    sim: { kind: 'device', model: 'rf_power_meter' },
    visual: { shape: 'rf_bench' },
    doc: 'RF power meter with a 50 Ω diode sensor (1 MHz – 6 GHz, −30 … +20 dBm; above +23 dBm the sensor is damaged — use an attenuator and enter its value as the offset). It reads the average power arriving at RF: from a cable, or from an antenna wired to it.',
  }),
  noise_source: E({
    type: 'noise_source',
    label: 'Noise / hum / ripple source',
    category: 'instrument',
    placement: 'offboard',
    pins: ['IN', 'OUT', 'GND'],
    params: [
      { key: 'mode', label: 'Adds', kind: 'select', default: 'hum 60 Hz', options: ['white noise', 'hum 60 Hz', 'hum 50 Hz', 'switching ripple', 'hum + noise'], runtime: true },
      { key: 'level', label: 'Level', kind: 'number', default: 0.5, min: 0, max: 10, step: 0.01, unit: 'Vpp', runtime: true },
      { key: 'frequency', label: 'Ripple frequency', kind: 'number', default: 100000, min: 1000, max: 1000000, unit: 'Hz', runtime: true },
      { key: 'bandwidth', label: 'Noise bandwidth', kind: 'number', default: 100000, min: 1000, max: 1000000, unit: 'Hz' },
      { key: 'on', label: 'Output on', kind: 'boolean', default: true, runtime: true },
    ],
    sim: { kind: 'device', model: 'noise_source' },
    visual: { shape: 'rf_bench' },
    doc: 'Interference source: OUT = IN + interference (IN is a high-impedance input, 50 Ω out; with IN unconnected OUT is the interference alone). White noise (Gaussian, level = 6.6 σ ≈ Vpp), mains hum (60/50 Hz with 3rd and 5th harmonics), or a buck regulator\'s switching ripple (a triangle with spikes at each edge). Put it between a supply or a sensor and your filter.',
  }),

  // -------------------------------------------------------------- filters
  ferrite_bead: E({
    type: 'ferrite_bead',
    label: 'Ferrite bead',
    category: 'filter',
    placement: 'leads',
    pins: ['p1', 'p2'],
    params: [
      { key: 'z100', label: 'Impedance at 100 MHz', kind: 'number', default: 600, min: 30, max: 2000, unit: 'Ω' },
      { key: 'rated', label: 'Rated current', kind: 'number', default: 1, min: 0.1, max: 6, step: 0.1, unit: 'A' },
    ],
    sim: { kind: 'device', model: 'ferrite_bead' },
    visual: { shape: 'ferrite' },
    doc: 'Ferrite bead (600 Ω at 100 MHz, 1 A): almost a short at DC and audio, a RESISTOR at RF — it turns high-frequency noise into heat instead of reflecting it. Modelled as R ∥ L (plus its DC resistance). Put one in series with a supply pin, then a decoupling capacitor to ground.',
  }),
  cm_choke: E({
    type: 'cm_choke',
    label: 'Common-mode choke',
    category: 'filter',
    placement: 'footprint',
    pins: ['L1a', 'L1b', 'L2a', 'L2b'],
    footprintOffsets: [
      { dCol: 0, row: 'e' },
      { dCol: 3, row: 'e' },
      { dCol: 0, row: 'f' },
      { dCol: 3, row: 'f' },
    ],
    bodyFootprint: { dCols: [0, 3], rows: ['e', 'f'] },
    params: [
      { key: 'inductance', label: 'Inductance per winding', kind: 'number', default: 0.01, min: 1e-5, max: 0.1, unit: 'H' },
      { key: 'coupling', label: 'Coupling k', kind: 'number', default: 0.995, min: 0.9, max: 0.9999, step: 0.0001 },
      { key: 'rated', label: 'Rated current', kind: 'number', default: 1, min: 0.1, max: 10, step: 0.1, unit: 'A' },
    ],
    sim: { kind: 'device', model: 'cm_choke' },
    visual: { shape: 'cmchoke' },
    doc: 'Common-mode choke: two windings on one toroid straddling the channel — L1a→L1b in row e, L2a→L2b in row f. Current going out on one line and back on the other (the signal) cancels in the core and passes; noise on both lines together (common mode) sees the full inductance.',
  }),
  pi_filter: E({
    type: 'pi_filter',
    label: 'EMI π filter (C-L-C)',
    category: 'filter',
    placement: 'leads',
    pins: ['IN', 'GND', 'OUT'],
    params: [
      { key: 'c1', label: 'Input capacitor', kind: 'number', default: 1e-5, min: 1e-9, max: 1e-3, unit: 'F' },
      { key: 'inductance', label: 'Inductor', kind: 'number', default: 1e-5, min: 1e-7, max: 1e-2, unit: 'H' },
      { key: 'c2', label: 'Output capacitor', kind: 'number', default: 1e-5, min: 1e-9, max: 1e-3, unit: 'F' },
      { key: 'esr', label: 'Capacitor ESR', kind: 'number', default: 0.01, min: 0.001, max: 2, unit: 'Ω' },
      { key: 'dcr', label: 'Inductor DCR', kind: 'number', default: 0.05, min: 0.001, max: 5, unit: 'Ω' },
      { key: 'isat', label: 'Inductor saturation current', kind: 'number', default: 2, min: 0.1, max: 20, step: 0.1, unit: 'A' },
      { key: 'vrated', label: 'Capacitor voltage rating', kind: 'number', default: 25, min: 6.3, max: 100, step: 0.1, unit: 'V' },
    ],
    sim: { kind: 'device', model: 'lc_filter' },
    visual: { shape: 'lcfilter' },
    doc: 'EMI π filter module: C from IN to GND, L from IN to OUT, C from OUT to GND (10 µF – 10 µH – 10 µF, cut-off ≈ 16 kHz, 60 dB/decade above it). Use it to clean a switching regulator\'s ripple off a supply. Real ESR and DCR are modelled; keep the current under the inductor\'s saturation current.',
  }),
  lc_lowpass: E({
    type: 'lc_lowpass',
    label: 'LC low-pass filter module',
    category: 'filter',
    placement: 'leads',
    pins: ['IN', 'GND', 'OUT'],
    params: [
      { key: 'inductance', label: 'Inductor', kind: 'number', default: 1e-4, min: 1e-7, max: 1e-1, unit: 'H' },
      { key: 'c2', label: 'Capacitor', kind: 'number', default: 1e-6, min: 1e-10, max: 1e-3, unit: 'F' },
      { key: 'esr', label: 'Capacitor ESR', kind: 'number', default: 0.02, min: 0.001, max: 2, unit: 'Ω' },
      { key: 'dcr', label: 'Inductor DCR', kind: 'number', default: 0.2, min: 0.001, max: 20, unit: 'Ω' },
      { key: 'isat', label: 'Inductor saturation current', kind: 'number', default: 1, min: 0.05, max: 20, step: 0.05, unit: 'A' },
      { key: 'vrated', label: 'Capacitor voltage rating', kind: 'number', default: 50, min: 6.3, max: 100, step: 0.1, unit: 'V' },
    ],
    sim: { kind: 'device', model: 'lc_filter' },
    visual: { shape: 'lcfilter' },
    doc: 'Second-order LC low-pass module: L from IN to OUT, C from OUT to GND (100 µH, 1 µF: f₀ = 1/(2π√LC) ≈ 16 kHz, −40 dB/decade). With a light load it rings at f₀ — a resistor across the output damps it (Q = R·√(C/L)).',
  }),

  // ------------------------------------------------------- wireless: SDR
  usrp_b210: E({
    type: 'usrp_b210',
    label: 'USRP B210 software-defined radio',
    category: 'rf',
    placement: 'offboard',
    pins: ['TX/RX A', 'RX2 A', 'TX/RX B', 'RX2 B', 'GND'],
    groundPin: 'GND',
    params: [
      { key: 'frequency', label: 'Centre frequency', kind: 'number', default: 433.92, min: 70, max: 6000, step: 0.01, unit: 'MHz', runtime: true },
      { key: 'bandwidth', label: 'Bandwidth (sample rate)', kind: 'number', default: 10, min: 0.2, max: 56, step: 0.1, unit: 'MHz', runtime: true },
      { key: 'rxGain', label: 'RX gain', kind: 'number', default: 40, min: 0, max: 76, step: 1, unit: 'dB', runtime: true },
      { key: 'txOn', label: 'Transmit a tone on TX/RX A', kind: 'boolean', default: false, runtime: true },
      { key: 'txGain', label: 'TX gain', kind: 'number', default: 70, min: 0, max: 89.75, step: 0.25, unit: 'dB', runtime: true },
      { key: 'toneOffset', label: 'Tone offset from centre', kind: 'number', default: 100, min: -20000, max: 20000, step: 1, unit: 'kHz', runtime: true },
    ],
    sim: { kind: 'device', model: 'usrp_b210' },
    visual: { shape: 'rf_bench' },
    doc: 'Ettus Research USRP B210 software-defined radio (what "BI210" usually means): 70 MHz – 6 GHz, 2×2 MIMO, up to 56 MHz bandwidth (30.72 MHz with both channels), 12-bit AD9361, USB 3. Four SMA ports: TX/RX A transmits, RX2 A and RX2 B receive — wire each to an antenna\'s RF and GND. Never put more than −15 dBm into an RX port (a TX port cabled straight to an RX port can destroy it). Shows the received spectrum around its centre frequency.',
  }),

  // ---------------------------------------------------- wireless: modules
  nrf24l01: E({
    type: 'nrf24l01',
    label: 'nRF24L01+ 2.4 GHz radio',
    category: 'rf',
    placement: 'offboard',
    pins: ['GND', 'VCC', 'CE', 'CSN', 'SCK', 'MOSI', 'MISO', 'IRQ'],
    params: [
      { key: 'mode', label: 'Radio mode', kind: 'select', default: 'receive', options: ['receive', 'transmit (carrier test)', 'standby'], runtime: true },
      { key: 'channel', label: 'Channel (2400 + n MHz)', kind: 'number', default: 76, min: 0, max: 125, step: 1, runtime: true },
      { key: 'power', label: 'TX power', kind: 'select', default: '0', options: ['0', '-6', '-12', '-18'], runtime: true },
      { key: 'dataRate', label: 'Data rate', kind: 'select', default: '1 Mbps', options: ['250 kbps', '1 Mbps', '2 Mbps'], runtime: true },
      ...RF_ENDPOINT,
    ],
    sim: { kind: 'device', model: 'radio' },
    visual: { shape: 'rf_module' },
    doc: 'nRF24L01+ 2.4 GHz transceiver with a PCB antenna (2×4 header: GND VCC / CE CSN / SCK MOSI / MISO IRQ). VCC is 1.9–3.6 V — 5 V destroys it (its SPI pins are 5 V tolerant). In this lab it is a link-level radio: set the mode, channel, power and data rate and the RF link panel shows received power and margin (sensitivity −94/−85/−82 dBm at 250k/1M/2M); the SPI protocol itself is not emulated.',
  }),
  hc05: E({
    type: 'hc05',
    label: 'HC-05 Bluetooth serial module',
    category: 'rf',
    placement: 'offboard',
    pins: ['EN', 'VCC', 'GND', 'TXD', 'RXD', 'STATE'],
    params: [
      { key: 'role', label: 'Role', kind: 'select', default: 'slave', options: ['slave', 'master'], runtime: true },
      ...RF_ENDPOINT,
    ],
    sim: { kind: 'device', model: 'radio' },
    visual: { shape: 'rf_module' },
    doc: 'HC-05 Bluetooth 2.0 serial (SPP) module on its breakout: VCC 3.6–6 V (5 V is fine), 3.3 V logic (divide a 5 V TX down into RXD). Two HC-05s on the bench pair as a wireless serial cable: what goes into one module\'s RXD comes out of the other\'s TXD while the link closes (+4 dBm, −80 dBm sensitivity); STATE goes high when connected.',
  }),
  rfm95: E({
    type: 'rfm95',
    label: 'RFM95W LoRa radio (SX1276)',
    category: 'rf',
    placement: 'offboard',
    pins: ['3.3V', 'GND', 'SCK', 'MISO', 'MOSI', 'NSS', 'RESET', 'DIO0', 'ANT'],
    params: [
      { key: 'mode', label: 'Radio mode', kind: 'select', default: 'receive', options: ['receive', 'transmit (carrier test)', 'standby'], runtime: true },
      { key: 'band', label: 'Band', kind: 'select', default: '915 MHz', options: ['915 MHz', '868 MHz'], runtime: true },
      { key: 'power', label: 'TX power', kind: 'number', default: 17, min: 2, max: 20, step: 1, unit: 'dBm', runtime: true },
      { key: 'sf', label: 'Spreading factor', kind: 'number', default: 7, min: 7, max: 12, step: 1, runtime: true },
      { key: 'antenna', label: 'Antenna', kind: 'select', default: 'λ/4 wire whip', options: ['λ/4 wire whip', 'external (ANT pin)'] },
      TILT,
      ...RF_ENDPOINT,
    ],
    sim: { kind: 'device', model: 'radio' },
    visual: { shape: 'rf_module' },
    doc: 'HopeRF RFM95W LoRa module (Semtech SX1276), 868/915 MHz, up to +20 dBm, sensitivity −123 dBm (SF7) to −136 dBm (SF12) at 125 kHz — LoRa decodes BELOW the noise floor, which is why it reaches kilometres. 3.3 V only (3.9 V abs max). Give it an antenna: a λ/4 wire whip or an antenna on the ANT pin. Link-level model: the SPI registers are not emulated.',
  }),
  tx433: E({
    type: 'tx433',
    label: '433 MHz ASK transmitter (FS1000A)',
    category: 'rf',
    placement: 'offboard',
    pins: ['DATA', 'VCC', 'GND', 'ANT'],
    params: [{ key: 'antenna', label: 'Antenna', kind: 'select', default: MODULE_ANT_433[0], options: MODULE_ANT_433 }, TILT, ...RF_ENDPOINT],
    sim: { kind: 'device', model: 'radio' },
    visual: { shape: 'rf_module' },
    doc: '433.92 MHz on-off-keyed transmitter: the carrier is ON while DATA is high (3–12 V supply; ≈ +10 dBm at 12 V, ≈ +2 dBm at 5 V). Solder a 17.3 cm wire (λ/4) to ANT. Pair it with the XY-MK-5V receiver: a slow digital signal on DATA (≤ 4 kbps) comes out of the receiver while the link budget closes.',
  }),
  rx433: E({
    type: 'rx433',
    label: '433 MHz ASK receiver (XY-MK-5V)',
    category: 'rf',
    placement: 'offboard',
    pins: ['VCC', 'DATA', 'DATA2', 'GND', 'ANT'],
    internalBridges: [['DATA', 'DATA2']],
    params: [{ key: 'antenna', label: 'Antenna', kind: 'select', default: MODULE_ANT_433[0], options: MODULE_ANT_433 }, TILT, ...RF_ENDPOINT],
    sim: { kind: 'device', model: 'radio' },
    visual: { shape: 'rf_module' },
    doc: '433.92 MHz super-regenerative receiver, 5 V: DATA follows the transmitter\'s carrier (−105 dBm sensitivity). With no signal its gain winds up and DATA chatters with random noise — real receivers do that; decode with a library that looks for a preamble.',
  }),

  // ------------------------------------------------------------- antennas
  ant_dipole: antenna('ant_dipole', 'Half-wave dipole antenna', [{ key: 'length', label: 'Tip-to-tip length', kind: 'number', default: 32.8, min: 2, max: 150, step: 0.1, unit: 'cm' }], 'Half-wave dipole on a stand, SMA feed: 2.15 dBi, a doughnut pattern (nothing off its ends), ≈ 73 Ω, linear polarization along the arms. Its length sets the resonance: f₀ ≈ 0.95·c/(2·L) — 32.8 cm for 433 MHz, 5.8 cm for 2.45 GHz. Find the dip with the VNA and trim.'),
  ant_monopole: antenna('ant_monopole', 'Quarter-wave monopole / whip', [{ key: 'length', label: 'Whip length', kind: 'number', default: 16.4, min: 1, max: 80, step: 0.1, unit: 'cm' }], 'Quarter-wave whip over four ground-plane radials: half a dipole, the ground plane is the mirror. ≈ 3 dBi in practice (5.15 dBi over an infinite plane), ≈ 36 Ω, vertical polarization. f₀ ≈ 0.95·c/(4·L) — 16.4 cm for 433 MHz.'),
  ant_rubber_duck: antenna('ant_rubber_duck', 'Rubber-duck antenna (SMA)', [freqParam(2440, 70, 6000)], 'Rubber-duck whip on an SMA plug (the antenna on routers, SDRs and radios): a helically loaded sleeve dipole, ≈ 2 dBi, 50 Ω, vertical polarization, made for one band (set it).'),
  ant_patch: antenna('ant_patch', 'Patch antenna', [freqParam(2440, 300, 6000)], 'Microstrip patch on a ground plane, standing up and facing +x (its boresight): ≈ 7 dBi, ≈ 70° beam, 18 dB front-to-back, linear polarization, narrow band (≈ 2–3 %).'),
  ant_yagi: antenna('ant_yagi', 'Yagi-Uda antenna', [freqParam(433.92, 50, 3000), { key: 'elements', label: 'Elements', kind: 'number', default: 3, min: 3, max: 12, step: 1 }], 'Yagi-Uda: a driven dipole, a reflector behind and directors in front along a boom pointing +x. 3 elements ≈ 7.5 dBi, 6 ≈ 10.5 dBi, beam ≈ 66° → 47°, linear polarization along the elements (tilt 90° for horizontal).', 'rf_antenna'),
  ant_helical: antenna('ant_helical', 'Helical antenna (axial mode)', [freqParam(2440, 300, 6000)], 'Axial-mode helix (circumference ≈ λ, 10 turns over a ground plate, pointing +x): ≈ 11 dBi, ≈ 40° beam, RIGHT-HAND CIRCULAR polarization — any linear antenna receives it 3 dB down at every tilt; a left-hand one barely at all.'),
  ant_loop: antenna('ant_loop', 'Small loop antenna', [freqParam(433.92, 1, 3000)], 'Small tuned loop (circumference ≈ λ/10): a magnetic dipole — strongest in the plane of the loop, nothing through its face. Very narrow band and inefficient (≈ −8 dBi), but small; the classic for key fobs.'),
  ant_horn: antenna('ant_horn', 'Horn antenna', [freqParam(4900, 2600, 6000)], 'Standard-gain pyramidal horn (WR-187 waveguide band, 3.95–5.85 GHz), pointing +x: ≈ 15 dBi, ≈ 30° beam, very clean pattern — the reference antenna for gain measurements.'),
  ant_pcb_ifa: antenna('ant_pcb_ifa', 'PCB inverted-F antenna', [freqParam(2440, 300, 6000)], 'Printed inverted-F antenna on a small board (the trace antenna on Wi-Fi/BLE boards): ≈ 2 dBi, nearly omnidirectional, mixed polarization (the ground plane radiates too), 50 Ω, ≈ ±4 % band.'),
}
