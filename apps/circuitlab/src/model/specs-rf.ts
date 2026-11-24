/**
 * Specs sheets for the measurement, filter and wireless parts (catalog-rf.ts).
 * Datasheet figures: Ettus USRP B210 spec sheet and UHD manual, Nordic
 * nRF24L01+ product spec v1.0, Semtech SX1276 / HopeRF RFM95W, HC-05
 * (CSR BC417) datasheet, FS1000A / XY-MK-5V vendor sheets (approximate —
 * no maker datasheet exists), Rigol DSA800, Keysight 53220A / E4980A,
 * Mini-Circuits PWR-6GHS, NanoVNA-H; antennas from Balanis and Kraus.
 */
import type { Sheet, SpecRow } from './specs'
import { ANTENNAS, antennaModel, f0ToLength, type ParamGet } from './rf-data'
import { C0, antennaZ, mismatch } from '../sim/rf-link'
import { ferriteValues, ferriteZ } from '../sim/devices-rf'

const SI = (v: number, unit: string, digits = 3): string => {
  const a = Math.abs(v)
  const [k, s] = a >= 1e9 ? [1e-9, 'G'] : a >= 1e6 ? [1e-6, 'M'] : a >= 1e3 ? [1e-3, 'k'] : a >= 1 || a === 0 ? [1, ''] : a >= 1e-3 ? [1e3, 'm'] : a >= 1e-6 ? [1e6, 'µ'] : a >= 1e-9 ? [1e9, 'n'] : [1e12, 'p']
  return `${Number((v * k).toPrecision(digits))} ${s}${unit}`
}
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

const LINK_LAB: SpecRow[] = [
  ['Link model', 'link budget: Friis / log-distance path loss, antenna patterns, polarization, mismatch, kT·B·NF noise — not a full-wave EM solver'],
  ['Distance', 'measured between the parts on the bench, or the "Link distance" you set'],
]

/** an antenna's sheet: its band, gain, pattern, impedance and what its settings give now */
function antennaSheet(type: string, part: string, max: SpecRow[], extra: SpecRow[], tips: string[]): Sheet {
  const d = ANTENNAS[type]
  return {
    part,
    max,
    typ: [['Gain', `${d.base.gainDbi} dBi`], ['Polarization', d.polText], ['Feed impedance at resonance', `≈ ${d.base.r} Ω`], ...extra],
    freq: [['Band', d.band], ['Bandwidth (VSWR < 2, matched)', `≈ ${((0.7 / d.base.q) * 100).toFixed(1)} % of f₀`]],
    live: (p: ParamGet) => {
      const m = antennaModel(type, p)!
      const lambda = C0 / m.f0
      const mm = mismatch(antennaZ(m, m.f0))
      const rows: SpecRow[] = [
        ['Resonant frequency now', SI(m.f0, 'Hz', 4)],
        ['Wavelength λ', SI(lambda, 'm')],
        ['Gain now', `${m.gainDbi.toFixed(1)} dBi`],
        ['Beamwidth (−3 dB)', d.base.pattern === 'beam' ? `≈ ${m.hpbw.toFixed(0)}°` : d.base.pattern === 'halfwave' ? '78° in elevation, omni around the element' : '≈ 90° (doughnut)'],
        ['Return loss / VSWR on 50 Ω at f₀', `${mm.rlDb.toFixed(1)} dB / ${mm.vswr.toFixed(2)}`],
        ['Far field starts (≈ 2D²/λ, at least λ/2π)', SI(Math.max(lambda / (2 * Math.PI), 0), 'm')],
      ]
      if (type === 'ant_dipole') rows.push(['Length for 433.92 MHz / 2.45 GHz', `${f0ToLength(433.92e6, 2).toFixed(1)} cm / ${f0ToLength(2.45e9, 2).toFixed(1)} cm`])
      if (type === 'ant_monopole') rows.push(['Length for 433.92 MHz / 915 MHz', `${f0ToLength(433.92e6, 4).toFixed(1)} cm / ${f0ToLength(915e6, 4).toFixed(1)} cm`])
      return rows
    },
    lab: [...LINK_LAB, ['In AC (VNA)', 'a series RLC around f₀ — open at DC']],
    tips,
  }
}

const INSTR_TIP = 'Clip the instrument\'s GND to the circuit\'s ground first.'

export const RF_SHEETS: Record<string, Sheet> = {
  freq_counter: {
    part: 'Universal frequency counter (53220A-class)',
    max: [['Input (1 MΩ)', '350 Vpk below 5 kHz, derating to 10 Vpk above 100 kHz'], ['Input (50 Ω)', '1 W']],
    typ: [['Input impedance', '1 MΩ ∥ ≈ 25 pF'], ['Method', 'reciprocal: times the crossings, so resolution does not depend on the frequency'], ['Resolution', '12 digits per second of gate'], ['Single-shot timing', '≈ 100 ps']],
    freq: [['Range', 'DC – 350 MHz (channels 1–2)'], ['Gate times', '10 ms, 0.1 s, 1 s here']],
    lab: [['Timing', 'crossings interpolated between simulation steps'], ['First reading', 'after one gate (it learns the level in auto)']],
    tips: [INSTR_TIP, 'A noisy signal double-triggers: raise the hysteresis, filter it, or set the level away from the noise.'],
  },
  spectrum_analyzer: {
    part: 'Bench spectrum analyzer (DSA800-class)',
    max: [['RF input', '+20 dBm continuous (+30 dBm damages the mixer)'], ['DC on the input', '50 V']],
    typ: [['Input impedance', '50 Ω (or an active high-Z probe)'], ['Displayed noise (DANL)', '≈ −135 dBm at 100 Hz RBW (preamp on)'], ['Units', 'dBm into 50 Ω, dBV']],
    freq: [['Range', '9 kHz – 3.2 GHz; FFT mode DC – 1 MHz in this lab'], ['RBW', '10 Hz – 1 MHz']],
    lab: [['Below 1 MHz', 'FFT of the simulated voltage (Hann window, RBW = 1.5·fs/N)'], ['Above 1 MHz', 'carriers from the radio link model over the analyzer\'s noise floor']],
    tips: [INSTR_TIP, 'Halving the RBW lowers the noise floor 3 dB but a sine stays put — that is how you tell a tone from noise.', 'Put an attenuator in front of anything stronger than +20 dBm.'],
  },
  rms_voltmeter: {
    part: 'Bench true-RMS voltmeter',
    max: [['Input', '±750 V AC / 1000 V DC'], ['Crest factor', '≤ 5 at full scale']],
    typ: [['Input impedance', '10 MΩ'], ['Modes', 'AC+DC rms, AC rms, DC, dBV, dBm (600 Ω), Hz, duty']],
    freq: [['AC bandwidth', '3 Hz – 300 kHz']],
    lab: [['Reading', 'time-weighted over a 0.2 s gate']],
    tips: ['An "average-reading" meter is only right for sines; true RMS is right for any wave shape.', 'dBm (600 Ω) is the old audio reference: 0 dBm = 0.775 Vrms.'],
  },
  lcr_meter: {
    part: 'Bench LCR meter (E4980A / LCR-6100-class)',
    max: [['Never', 'a powered circuit or a charged capacitor across the clips'], ['DC bias', 'off']],
    typ: [['Test signal', '1 Vrms through 100 Ω'], ['Basic accuracy', '≈ 0.05 – 0.1 %'], ['Shows', 'L, C or R with ESR, D, Q; series or parallel model']],
    freq: [['Test frequencies', '100 Hz, 120 Hz, 1 kHz, 10 kHz, 100 kHz']],
    lab: [['Measurement', 'a small-signal AC solve of the circuit at the test frequency']],
    tips: ['Small impedances (big C, small L): series model. Large impedances: parallel model.', 'Test electrolytics at 120 Hz (ESR at 100 kHz), inductors at the frequency they will work at.'],
  },
  vna: {
    part: 'Vector network analyzer (two ports, 50 Ω)',
    max: [['Port input', '+10 dBm RF, 10 V DC']],
    typ: [['Port impedance', '50 Ω'], ['Output', '≈ −13 dBm (NanoVNA-class)'], ['Measures', 'S11 (return loss, VSWR, impedance, Smith chart), S21 (gain/loss, phase)'], ['Dynamic range', '≈ 40–70 dB on a NanoVNA, 100+ dB on a bench VNA']],
    freq: [['This lab', '10 Hz – 6 GHz (a low-frequency VNA for audio filters, an RF one for antennas)']],
    lab: [['Sweep', 'small-signal AC solves of the circuit; port 1 is a 1 V EMF behind 50 Ω'], ['Port 2 high-Z', 'shows the voltage gain V2/V1 (for op-amp filters)']],
    tips: ['Calibrate (open, short, load) at the end of the cable on a real VNA.', 'A resonant antenna shows a dip in S11: return loss > 10 dB (VSWR < 2) is a good match.'],
  },
  rf_power_meter: {
    part: 'RF power meter with a diode sensor (PWR-6GHS-class)',
    max: [['Input power', '+23 dBm continuous (+27 dBm abs max)']],
    typ: [['Range', '−30 … +20 dBm'], ['Impedance', '50 Ω'], ['Accuracy', '≈ ±0.25 dB']],
    freq: [['Range', '1 MHz – 6 GHz']],
    lab: [['Reads', 'the average power arriving at RF: by cable, or through an antenna wired to it'], ['Below 1 MHz', 'the true average of the simulated waveform']],
    tips: ['Put a 30 dB attenuator in front of a transmitter and enter 30 dB as the offset.'],
  },
  noise_source: {
    part: 'Interference source (lab instrument)',
    max: [['Output', '±10 V, 50 Ω']],
    typ: [['White noise', 'Gaussian; level ≈ peak-to-peak (6.6 σ)'], ['Hum', '60 / 50 Hz with 3rd and 5th harmonics'], ['Ripple', 'triangle at the switching frequency with spikes at each edge']],
    freq: [['Noise bandwidth', 'up to 1 MHz (set)'], ['Ripple', '1 kHz – 1 MHz']],
    lab: [['Output', 'OUT = IN + interference, so it can sit between a supply or a sensor and the filter']],
    tips: ['Mains hum couples in through long unshielded wires and ground loops: twist pairs, use one ground point.'],
  },
  ferrite_bead: {
    part: 'Ferrite chip bead (600 Ω at 100 MHz)',
    max: [['Rated current', '≈ 1 A (the impedance falls with DC current)']],
    typ: [['DC resistance', '≈ 0.15 Ω'], ['Model', 'Rdc + (R ∥ L ∥ C)']],
    freq: [['Inductive', 'below ≈ 30 MHz'], ['Resistive (it absorbs)', '≈ 30 – 500 MHz'], ['Capacitive', 'above ≈ 600 MHz']],
    live: (p) => {
      const v = ferriteValues(num(p('z100'), 600))
      const z = (f: number) => Math.hypot(...ferriteZ(v, 2 * Math.PI * f))
      return [['|Z| at 1 MHz', SI(z(1e6), 'Ω')], ['|Z| at 10 MHz', SI(z(1e7), 'Ω')], ['|Z| at 100 MHz', SI(z(1e8), 'Ω')], ['|Z| at 1 GHz', SI(z(1e9), 'Ω')], ['Rated current', `${num(p('rated'), 1)} A`]]
    },
    tips: ['Bead in series with the supply pin, then a 100 nF decoupling capacitor from the pin to ground (and a bulk 10 µF nearby).', 'A bead and a big capacitor can resonate at low frequency: add a little resistance (or a lossy electrolytic) to damp it.'],
  },
  cm_choke: {
    part: 'Common-mode choke (2 × 10 mH, toroid)',
    max: [['Rated current per winding', '≈ 1 A'], ['Voltage between windings', '≈ 250 V AC (mains types)']],
    typ: [['Inductance per winding', '10 mH'], ['Coupling', 'k ≈ 0.995: leakage ≈ 1 % gives a little differential filtering']],
    freq: [['Common-mode impedance', 'Z = 2π·f·L: ≈ 6 kΩ at 100 kHz']],
    live: (p) => {
      const L = num(p('inductance'), 0.01)
      const k = num(p('coupling'), 0.995)
      return [['Common-mode inductance', SI((L * (1 + k)) / 2, 'H')], ['Differential (leakage) inductance', SI(2 * L * (1 - k), 'H')], ['Rated current', `${num(p('rated'), 1)} A`]]
    },
    tips: ['Signal out on one line and back on the other passes; noise riding on both lines is blocked.', 'Put it right where the cable enters the board.'],
  },
  pi_filter: {
    part: 'EMI π filter module (C-L-C)',
    max: [['Capacitor voltage', '25 V (as set)'], ['Inductor current', 'its saturation current (2 A as set)']],
    typ: [['Values', '10 µF – 10 µH – 10 µF'], ['ESR / DCR', '10 mΩ / 50 mΩ (ceramic caps, power inductor)'], ['Slope', '−60 dB/decade above cut-off']],
    freq: [['Cut-off', '≈ 1/(2π√(L·C)) ≈ 16 kHz with these values']],
    live: (p) => {
      const L = num(p('inductance'), 1e-5)
      const C = num(p('c2'), 1e-5)
      const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C))
      return [['Cut-off f₀', SI(f0, 'Hz')], ['Ideal attenuation at 10·f₀', '≈ 60 dB'], ['Saturation current', `${num(p('isat'), 2)} A`], ['Capacitor rating', `${num(p('vrated'), 25)} V`]]
    },
    lab: [['Model', 'R-C and R-L branches with ESR and DCR, backward Euler in time, exact in AC']],
    tips: ['Decoupling: a 100 nF ceramic at every chip supply pin (shortest path to ground), 10 µF bulk per board section.', 'Past the inductor\'s saturation current its inductance collapses — the filter stops working.'],
  },
  lc_lowpass: {
    part: 'Second-order LC low-pass module',
    max: [['Capacitor voltage', '50 V (as set)'], ['Inductor current', 'its saturation current (1 A as set)']],
    typ: [['Values', '100 µH, 1 µF'], ['Slope', '−40 dB/decade above f₀']],
    freq: [['f₀', '≈ 16 kHz with these values']],
    live: (p) => {
      const L = num(p('inductance'), 1e-4)
      const C = num(p('c2'), 1e-6)
      return [['f₀ = 1/(2π√LC)', SI(1 / (2 * Math.PI * Math.sqrt(L * C)), 'Hz')], ['Characteristic impedance √(L/C)', SI(Math.sqrt(L / C), 'Ω')], ['Load for Q = 0.707', SI(0.707 * Math.sqrt(L / C), 'Ω')]]
    },
    tips: ['Lightly loaded it peaks (rings) at f₀; a load near √(L/C) flattens it.'],
  },
  usrp_b210: {
    part: 'Ettus Research USRP B210 (AD9361 RFIC)',
    max: [['RF input (any port)', '−15 dBm (UHD: never more); ≈ 0 dBm can damage it'], ['TX port rating', '+20 dBm'], ['10 MHz reference in', '+15 dBm'], ['External supply', '6 V, 3 A']],
    typ: [['Channels', '2 × 2 MIMO, coherent, full duplex'], ['TX power', '> +10 dBm'], ['RX noise figure', '< 8 dB'], ['IIP3', '≈ −20 dBm at typical NF'], ['ADC / DAC', '12-bit, up to 61.44 MS/s'], ['Clock', '±2 ppm TCXO (GPSDO option: < 1 ppb locked)'], ['Interface', 'USB 3.0 (bus powered or 6 V)']],
    freq: [['Tuning range', '70 MHz – 6 GHz'], ['Instantaneous bandwidth', '56 MHz (1 × 1), 30.72 MHz (2 × 2)']],
    lab: [['TX', 'a CW tone on TX/RX A (gain 89.75 dB ≈ +10 dBm)'], ['RX', 'RX2 A and RX2 B show the spectrum of what the link model delivers'], ...LINK_LAB],
    tips: ['Use an attenuator (30 dB+) when you cable TX to an RX port or a meter — and never TX straight into RX.', 'Software: GNU Radio, UHD, SDR++; start with the RX gain low and raise it until the noise floor lifts.'],
  },
  nrf24l01: {
    part: 'Nordic nRF24L01+ module (PCB antenna)',
    max: [['VCC', '3.6 V abs max (−0.3 V min)'], ['Input pins', '5 V tolerant (5.25 V abs) when VCC is 2.7–3.3 V']],
    typ: [['VCC', '1.9 – 3.6 V (3.0 V typ)'], ['TX power', '0 / −6 / −12 / −18 dBm'], ['TX current', '11.3 mA at 0 dBm'], ['RX current', '13.5 mA (2 Mbps), 12.6 mA (250 kbps)'], ['Power-down', '900 nA'], ['Sensitivity', '−94 dBm (250 kbps), −85 dBm (1 Mbps), −82 dBm (2 Mbps)']],
    freq: [['Band', '2.400 – 2.525 GHz, 1 MHz channels (126)'], ['Data rate', '250 kbps, 1 Mbps, 2 Mbps'], ['SPI', 'up to 10 MHz']],
    lab: [['Model', 'link level: carrier and link budget; the SPI registers are not emulated'], ...LINK_LAB],
    tips: ['Power it from 3.3 V with a 10 µF capacitor right at VCC–GND — current spikes on transmit cause most "it does not work".', 'Lower data rates reach further: −94 dBm at 250 kbps vs −82 dBm at 2 Mbps (12 dB ≈ 4× the distance).'],
  },
  hc05: {
    part: 'HC-05 Bluetooth SPP module on its breakout (CSR BC417)',
    max: [['VCC (breakout)', '6 V'], ['Logic pins', '3.3 V (RXD is not 5 V tolerant on many boards)']],
    typ: [['VCC', '3.6 – 6 V (5 V typ, on-board regulator)'], ['Bluetooth', 'v2.0 + EDR, class 2'], ['TX power', 'up to +4 dBm'], ['Sensitivity', '−80 dBm'], ['Current', '≈ 30–40 mA pairing, ≈ 8 mA connected idle']],
    freq: [['Band', '2.402 – 2.480 GHz (frequency hopping)'], ['UART', '9600 baud 8N1 (AT mode 38400)']],
    lab: [['Model', 'two modules (one master, one slave) form a wireless serial cable while the link closes'], ...LINK_LAB],
    tips: ['Divide the Arduino\'s 5 V TX down for RXD: 1 kΩ + 2 kΩ.', 'Hold EN (KEY) high at power-up for AT commands at 38400 baud.'],
  },
  rfm95: {
    part: 'HopeRF RFM95W LoRa module (Semtech SX1276)',
    max: [['Supply', '3.9 V abs max'], ['TX at +20 dBm', '1 % duty cycle, VSWR ≤ 3:1'], ['RF input', '+10 dBm']],
    typ: [['Supply', '1.8 – 3.7 V'], ['TX power', '+2 … +17 dBm (PA_BOOST), +20 dBm high-power mode'], ['TX current', '120 mA at +20, 87 mA at +17, 29 mA at +13 dBm'], ['RX current', '≈ 10–12 mA'], ['Sensitivity (125 kHz)', 'SF7 −123 dBm … SF12 −136 dBm (−148 dBm at 7.8 kHz)'], ['Link budget', 'up to 168 dB']],
    freq: [['Band', '868 / 915 MHz (SX1276: 137 – 1020 MHz)'], ['Bandwidth', '7.8 – 500 kHz (125 kHz here)'], ['Data rate (SF7–SF12, 125 kHz)', '≈ 5.5 kbps … 290 bps']],
    lab: [['Model', 'link level; LoRa decodes down to SNR −7.5 dB (SF7) … −20 dB (SF12)'], ...LINK_LAB],
    tips: ['Never transmit without an antenna: the reflected power can damage the PA.', 'Each step up in SF gains ≈ 2.5 dB of range — and doubles the time on air.'],
  },
  tx433: {
    part: 'FS1000A 433.92 MHz ASK transmitter (vendor figures, approximate)',
    max: [['Supply', '12 V']],
    typ: [['Supply', '3 – 12 V'], ['Output power', '≈ +10 dBm at 12 V, ≈ +2 dBm at 5 V'], ['Current', '≈ 20–28 mA transmitting'], ['Data rate', '≤ 4 kbps (best ≤ 2.4 kbps)']],
    freq: [['Carrier', '433.92 MHz (SAW resonator)'], ['Modulation', 'on-off keying: carrier while DATA is high']],
    lab: [['Model', 'its carrier follows DATA into the link model'], ...LINK_LAB],
    tips: ['A 17.3 cm straight wire on ANT (λ/4) multiplies the range several times.', 'Pin order differs between sellers — read the silkscreen.'],
  },
  rx433: {
    part: 'XY-MK-5V 433.92 MHz super-regenerative receiver (vendor figures, approximate)',
    max: [['Supply', '≈ 6 V']],
    typ: [['Supply', '5 V'], ['Current', '≈ 4 mA'], ['Sensitivity', '≈ −105 dBm']],
    freq: [['Carrier', '433.92 MHz, wide input (≈ 2 MHz)']],
    lab: [['Model', 'DATA follows the carrier when the margin is positive; with no carrier for 20 ms it chatters'], ...LINK_LAB],
    tips: ['Its output is never quiet: decode with a library (RadioHead, rc-switch) that waits for a preamble.'],
  },
  ant_dipole: antennaSheet('ant_dipole', 'Half-wave dipole', [['Power (stand-mounted)', '≈ 10 W']], [['Pattern', 'doughnut: maximum broadside, nulls off the ends']], ['Cut it a few % short of λ/2 (end effect), then trim while watching S11.']),
  ant_monopole: antennaSheet('ant_monopole', 'Quarter-wave ground-plane monopole', [['Power', '≈ 10 W']], [['Ground plane', '4 radials, ≈ λ/4 long']], ['Bending the radials down 45° raises the 36 Ω feed toward 50 Ω.']),
  ant_rubber_duck: antennaSheet('ant_rubber_duck', 'Rubber-duck (SMA) whip', [['Power', '≈ 10 W']], [['Connector', 'SMA plug']], ['Point it straight up on both ends of a link (same polarization).']),
  ant_patch: antennaSheet('ant_patch', 'Microstrip patch on FR-4', [['Power', '≈ 5 W']], [['Front-to-back', '≈ 18 dB']], ['Turn it 90° about its face to switch between vertical and horizontal polarization.']),
  ant_yagi: antennaSheet('ant_yagi', 'Yagi-Uda (3 – 12 elements)', [['Power', '≈ 50 W']], [['Front-to-back', '≈ 15 – 22 dB'], ['Gain vs elements', '3 → 7.5 dBi, 6 → 10.5 dBi, 12 → 13.5 dBi (conservative)']], ['Point the boom at the other station; the elements set the polarization.']),
  ant_helical: antennaSheet('ant_helical', 'Axial-mode helix (10 turns, C ≈ λ)', [['Power', '≈ 50 W']], [['Bare feed', '≈ 140·C/λ Ω (Kraus), matched to 50 Ω here'], ['HPBW (Kraus)', '≈ 52° / (C/λ·√(N·S/λ))']], ['Circular polarization does not care how the other (circular) end is rotated — great for satellites and drones.']),
  ant_loop: antennaSheet('ant_loop', 'Small tuned loop (C ≈ λ/10)', [['Power', '≈ 1 W (high voltage on the tuning capacitor)']], [['Efficiency', '≈ 10 % (radiation resistance ∝ (C/λ)⁴)']], ['Strongest in the plane of the loop, a null through its face.']),
  ant_horn: antennaSheet('ant_horn', 'Standard-gain pyramidal horn (WR-187)', [['Power', '≈ 100 W']], [['Front-to-back', '> 25 dB']], ['Below the waveguide cut-off (≈ 3.15 GHz) nothing gets through.']),
  ant_pcb_ifa: antennaSheet('ant_pcb_ifa', 'PCB inverted-F antenna (2.4 GHz)', [['Power', '≈ 1 W']], [['Peak gain (TI DN007)', '≈ 3.3 dBi']], ['Keep copper, batteries and hands ≈ 1 cm away from the antenna end of the board.']),
}
