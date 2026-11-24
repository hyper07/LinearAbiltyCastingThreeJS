/**
 * Specs for every part: what it is, the limits it can take (voltage, current,
 * power), its working values, its frequency range, and what this lab models.
 * Values are typical datasheet figures for the common part named; a real part
 * from another maker can differ a little. Boards build theirs from BoardDef.
 */
import type { ComponentInstance } from './types'
import { getEntry, paramOf, type CatalogEntry } from './catalog'
import { boardDef, type BoardDef } from './boards'

export type SpecRow = [label: string, value: string]
export interface SpecGroup {
  name: 'Maximum ratings' | 'Working values' | 'Frequency and speed' | 'This part' | 'In this lab'
  rows: SpecRow[]
}
export interface PartSpecs {
  /** the real part it is modelled on */
  part: string
  groups: SpecGroup[]
  tips: string[]
}

interface Sheet {
  part: string
  max?: SpecRow[]
  typ?: SpecRow[]
  freq?: SpecRow[]
  lab?: SpecRow[]
  tips?: string[]
  /** rows worked out from this part's own settings */
  live?: (p: (key: string) => number | string | boolean | undefined) => SpecRow[]
}

const SI = (v: number, unit: string, digits = 3): string => {
  const a = Math.abs(v)
  const [k, s] = a >= 1e6 ? [1e-6, 'M'] : a >= 1e3 ? [1e-3, 'k'] : a >= 1 || a === 0 ? [1, ''] : a >= 1e-3 ? [1e3, 'm'] : a >= 1e-6 ? [1e6, 'µ'] : a >= 1e-9 ? [1e9, 'n'] : [1e12, 'p']
  return `${Number((v * k).toPrecision(digits))} ${s}${unit}`
}
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

const TTL_HC: Sheet = {
  part: '74HC series (CMOS, TTL pinout)',
  max: [['Supply VCC', '−0.5 … 7 V (abs max)'], ['Input voltage', '−0.5 … VCC + 0.5 V'], ['Output current per pin', '±25 mA (abs max)'], ['VCC / GND current', '±50 mA']],
  typ: [['Supply VCC', '2 … 6 V (5 V here)'], ['Input HIGH / LOW at 4.5 V', '≥ 3.15 V / ≤ 1.35 V'], ['Output drive', '±4 mA keeps a valid level'], ['Supply current (idle)', '< 2 µA']],
  freq: [['Propagation delay', '≈ 8–10 ns at 5 V'], ['Toggle rate', 'tens of MHz']],
  tips: ['Never leave an unused input floating — tie it to VCC or GND.', 'An LED on an output needs a series resistor (≈ 330 Ω–1 kΩ).'],
}
const CMOS_4000: (part: string, fmax: string, extra?: SpecRow[]) => Sheet = (part, fmax, extra = []) => ({
  part,
  max: [['Supply VDD', '−0.5 … 20 V (abs max)'], ['Input voltage', '−0.5 … VDD + 0.5 V'], ['Input current', '±10 mA'], ['Power per package', '500 mW']],
  typ: [['Supply VDD', '3 … 18 V'], ['Output drive at 5 V', '≈ ±0.5–1 mA (weak: buffer LEDs)'], ...extra],
  freq: [['Max clock', fmax]],
  tips: ['Tie unused inputs to VDD or VSS.', 'Outputs are weak at 5 V — drive LEDs through a transistor or with a large resistor.'],
})

const SHEETS: Record<string, Sheet> = {
  resistor: {
    part: '¼ W carbon / metal film resistor',
    max: [['Power', '0.25 W'], ['Working voltage', '250 V']],
    typ: [['Tolerance', '±5 % (carbon), ±1 % (metal film)'], ['Temperature coefficient', '±100–300 ppm/°C']],
    freq: [['Behaves as a pure resistor', 'DC … ≈ 10–100 MHz']],
    live: (p) => {
      const r = num(p('resistance'), 1000)
      return [['Resistance', SI(r, 'Ω')], ['Most current at ¼ W', SI(Math.sqrt(0.25 / r), 'A')], ['Most voltage across it at ¼ W', SI(Math.min(250, Math.sqrt(0.25 * r)), 'V')]]
    },
    tips: ['Power P = I²·R = V²/R. Keep it under half the rating so it stays cool.'],
  },
  capacitor: {
    part: 'Ceramic (non-polar) or aluminium electrolytic (polar)',
    max: [['Rated voltage', 'ceramic 50 V, electrolytic 16–25 V (see the can)'], ['Reverse voltage (electrolytic)', 'about 1 V — more can make it fail']],
    typ: [['Tolerance', 'ceramic ±10–20 %, electrolytic ±20 %'], ['Leakage (electrolytic)', '≈ 0.01·C·V µA']],
    freq: [['Reactance', 'Xc = 1 / (2π·f·C)'], ['Useful range', 'ceramic to 100+ MHz, electrolytic to ≈ 100 kHz']],
    live: (p) => {
      const c = num(p('capacitance'), 1e-5)
      return [['Capacitance', SI(c, 'F')], ['Reactance at 50 Hz', SI(1 / (2 * Math.PI * 50 * c), 'Ω')], ['Reactance at 1 kHz', SI(1 / (2 * Math.PI * 1000 * c), 'Ω')], ['Polar', p('polarized') ? 'yes — + leg to the higher voltage' : 'no']]
    },
  },
  inductor: {
    part: 'Axial / radial choke',
    max: [['Rated current', '≈ 0.3–1 A (small chokes) before the core saturates'], ['DC resistance', 'a few Ω for mH values']],
    freq: [['Reactance', 'XL = 2π·f·L'], ['Self-resonance', 'a few MHz for mH chokes']],
    live: (p) => {
      const l = num(p('inductance'), 1e-3)
      return [['Inductance', SI(l, 'H')], ['Reactance at 1 kHz', SI(2 * Math.PI * 1000 * l, 'Ω')]]
    },
    tips: ['Switching off the current through an inductor makes a voltage spike — use a flyback diode.'],
  },
  potentiometer: {
    part: 'Rotary potentiometer (linear)',
    max: [['Power (whole track)', '0.125–0.5 W'], ['Working voltage', '200 V'], ['Wiper current', '≤ 10 mA recommended']],
    typ: [['Tolerance', '±20 %'], ['Life', '≈ 10 000 turns']],
    live: (p) => [['Track resistance', SI(num(p('resistance'), 10000), 'Ω')]],
    tips: ['As a voltage divider: ends to 5 V and GND, wiper to the input.'],
  },
  trimmer: {
    part: '3296-style multi-turn trimmer',
    max: [['Power', '0.5 W at 70 °C'], ['Working voltage', '200 V']],
    typ: [['Tolerance', '±10 %'], ['Adjustment', '25 turns']],
    live: (p) => [['Track resistance', SI(num(p('resistance'), 10000), 'Ω')]],
  },
  photoresistor: {
    part: 'GL5528 light-dependent resistor',
    max: [['Voltage', '150 V DC'], ['Power', '100 mW']],
    typ: [['Light resistance (10 lux)', '8–20 kΩ'], ['Dark resistance', '≥ 1 MΩ'], ['Peak colour', '540 nm (green)']],
    freq: [['Response time', 'rise ≈ 20 ms, fall ≈ 30 ms — too slow for fast light']],
    tips: ['Use it in a divider with a 10 kΩ resistor and read the middle with an analog pin.'],
  },
  diode: {
    part: '1N4148 small-signal diode',
    max: [['Reverse voltage', '100 V'], ['Forward current (average)', '200 mA'], ['Surge (1 µs)', '2 A'], ['Power', '500 mW']],
    typ: [['Forward voltage', '≈ 0.7 V at 5 mA, 1 V at 10 mA']],
    freq: [['Reverse recovery', '4 ns — fine to tens of MHz']],
  },
  diode_1n4007: {
    part: '1N4007 rectifier diode',
    max: [['Reverse voltage', '1000 V'], ['Forward current (average)', '1 A'], ['Surge (8.3 ms)', '30 A']],
    typ: [['Forward voltage', '≈ 0.9–1.1 V at 1 A']],
    freq: [['Speed', 'slow (µs recovery): mains 50/60 Hz, up to a few kHz']],
    tips: ['The usual flyback diode across a relay or motor coil.'],
  },
  zener_1n4733: {
    part: '1N4733A Zener, 5.1 V',
    max: [['Power', '1 W'], ['Zener current', '≈ 178 mA max']],
    typ: [['Zener voltage', '5.1 V ±5 % at 49 mA'], ['Dynamic resistance', '≈ 7 Ω'], ['Forward voltage', '≈ 1.2 V at 200 mA']],
    tips: ['Always use a series resistor: R = (Vin − 5.1 V) / I.'],
  },
  led: {
    part: '5 mm through-hole LED',
    max: [['Forward current (continuous)', '20–30 mA'], ['Peak current (1/10 duty, 0.1 ms)', '100 mA'], ['Reverse voltage', '5 V']],
    typ: [['Forward voltage', 'red/yellow ≈ 2.0 V, green ≈ 2.2 V (blue/white ≈ 3.2 V)'], ['Good brightness', '5–15 mA']],
    freq: [['Switching', 'ns — PWM dimming at any Arduino rate']],
    lab: [['Full brightness', '10 mA'], ['Burns out', 'above 30 mA for 1 ms — then it stays dark']],
    tips: ['Series resistor R = (Vsupply − Vf) / I, e.g. (5 − 2) / 0.01 = 300 Ω → use 330 Ω.'],
  },
  npn: {
    part: '2N3904 NPN transistor',
    max: [['VCE (collector–emitter)', '40 V'], ['VCB / VEB', '60 V / 6 V'], ['Collector current', '200 mA'], ['Power', '625 mW']],
    typ: [['Gain hFE', '100–300 at 10 mA'], ['VBE (on)', '≈ 0.65–0.85 V'], ['VCE (sat)', '≈ 0.2 V at 10 mA']],
    freq: [['Transition frequency fT', '300 MHz'], ['Switching', '≈ 35 ns on, 200 ns off']],
    tips: ['Base resistor ≈ 1 kΩ from a 5 V pin gives ≈ 4 mA base current — enough to switch ≈ 100 mA.'],
  },
  pnp: {
    part: '2N3906 PNP transistor',
    max: [['VCE', '−40 V'], ['Collector current', '−200 mA'], ['Power', '625 mW']],
    typ: [['Gain hFE', '100–300 at −10 mA'], ['VBE (on)', '≈ −0.65 … −0.85 V']],
    freq: [['Transition frequency fT', '250 MHz']],
  },
  nmos: {
    part: '2N7000 N-channel MOSFET',
    max: [['VDS', '60 V'], ['VGS', '±20 V'], ['Drain current', '200 mA continuous, 500 mA pulsed'], ['Power', '400 mW']],
    typ: [['Gate threshold VGS(th)', '0.8–3 V'], ['RDS(on)', '≈ 1.2 Ω at VGS 10 V, ≈ 2 Ω at 4.5 V']],
    freq: [['Switching', '≈ 10 ns']],
    tips: ['Add a 100 kΩ gate-to-source pull-down so it stays off when the pin floats.'],
  },
  pushbutton: {
    part: '6 × 6 mm tactile switch',
    max: [['Rating', '12 V DC, 50 mA']],
    typ: [['Contact resistance', '≤ 100 mΩ'], ['Bounce', '≈ 1–5 ms (debounce in code)'], ['Life', '100 000 presses']],
    tips: ['Use INPUT_PULLUP and wire the button to GND: pressed reads LOW.'],
  },
  slide_switch: {
    part: 'SS12D00 SPDT slide switch',
    max: [['Rating', '0.3 A at 30 V DC']],
    typ: [['Contact resistance', '≤ 30 mΩ'], ['Life', '10 000 cycles']],
  },
  dip_switch_8: {
    part: '8-way DIP switch',
    max: [['Switching', '25 mA at 24 V DC'], ['Carrying', '100 mA at 50 V DC']],
    typ: [['Contact resistance', '≤ 50 mΩ']],
  },
  logic_switch: { part: 'Logic switch (trainer)', typ: [['Output', 'HIGH = 5 V, LOW = 0 V, clean (no bounce)']] },
  logic_probe: {
    part: 'Logic probe',
    typ: [['HIGH', 'above 2.0 V (TTL)'], ['LOW', 'below 0.8 V'], ['Between', 'no light: invalid or floating']],
    freq: [['Pulse light', 'shows every edge, even short pulses']],
  },
  seven_segment: {
    part: '0.56" common-cathode 7-segment display',
    max: [['Segment current', '25 mA continuous, 100 mA peak (1/10 duty)'], ['Reverse voltage', '5 V']],
    typ: [['Segment forward voltage', '≈ 2.0 V (red)'], ['Good brightness', '5–10 mA per segment']],
    tips: ['One resistor per segment (≈ 330 Ω at 5 V), not one shared resistor.'],
  },
  seven_segment_ca: {
    part: '0.56" common-anode 7-segment display',
    max: [['Segment current', '25 mA continuous, 100 mA peak (1/10 duty)'], ['Reverse voltage', '5 V']],
    typ: [['Segment forward voltage', '≈ 2.0 V (red)']],
    tips: ['Common pin to +5 V; a segment lights when its pin is pulled LOW.'],
  },
  buzzer: {
    part: 'Magnetic / piezo buzzer',
    max: [['Voltage', '≈ 6 V for 5 V buzzers'], ['Current', '≈ 30 mA']],
    typ: [['Turns on', 'above ≈ 1 V'], ['Load', '≈ 300 Ω']],
    freq: [['Loudest', '≈ 2–4 kHz'], ['tone()', '31 Hz … 65 kHz on an Uno']],
  },
  ne555: {
    part: 'NE555 timer',
    max: [['Supply', '18 V'], ['Output current', '±200 mA'], ['Power', '600 mW']],
    typ: [['Supply', '4.5–16 V'], ['Supply current', '3–6 mA at 5 V'], ['Thresholds', '⅓ and ⅔ of VCC']],
    freq: [['Astable', 'f ≈ 1.44 / ((R1 + 2·R2)·C)'], ['Maximum', '≈ 500 kHz']],
  },
  lm358: {
    part: 'LM358 dual op-amp',
    max: [['Supply', '32 V single (±16 V)'], ['Differential input', '±32 V'], ['Output short-circuit', '≈ 40 mA']],
    typ: [['Supply', '3–32 V single'], ['Input range', '0 … VCC − 1.5 V'], ['Output swing', '0 … VCC − 1.5 V'], ['Input offset', '2 mV'], ['Output current', '≈ 20 mA']],
    freq: [['Gain-bandwidth', '≈ 1 MHz (gain 10 → 100 kHz)'], ['Slew rate', '0.3 V/µs']],
  },
  lm741: {
    part: 'LM741 op-amp',
    max: [['Supply', '±18 V (±22 V military)'], ['Differential input', '±30 V'], ['Output short-circuit', '25 mA']],
    typ: [['Supply', '±5 … ±15 V'], ['Output swing at ±15 V', '≈ ±13 V'], ['Input offset', '1 mV'], ['Open-loop gain', '200 000']],
    freq: [['Gain-bandwidth', '1 MHz'], ['Slew rate', '0.5 V/µs (a 10 Vpk sine stays clean to ≈ 8 kHz)']],
  },
  sn7400: TTL_HC,
  sn7404: TTL_HC,
  sn7408: TTL_HC,
  sn7432: TTL_HC,
  sn7486: TTL_HC,
  sn7474: { ...TTL_HC, freq: [['Propagation delay', '≈ 14 ns'], ['Max clock', '≈ 50 MHz']] },
  sn74193: { ...TTL_HC, freq: [['Max count rate', '≈ 40 MHz']] },
  sn7402: TTL_HC,
  sn74138: { ...TTL_HC, freq: [['Address → output delay', '≈ 12–20 ns']] },
  sn74151: { ...TTL_HC, freq: [['Select → output delay', '≈ 15–25 ns']] },
  sn74112: { ...TTL_HC, freq: [['Max clock', '≈ 50 MHz']] },
  sn74161: { ...TTL_HC, freq: [['Max count rate', '≈ 40–50 MHz']] },
  sn74164: { ...TTL_HC, freq: [['Max shift clock', '≈ 50 MHz']] },
  sn74595: {
    ...TTL_HC,
    max: [['Supply VCC', '−0.5 … 7 V (abs max)'], ['Output current per pin', '±35 mA (abs max)'], ['VCC / GND current, all 8 outputs', '±70 mA']],
    typ: [['Supply VCC', '2 … 6 V'], ['Output drive', '±6 mA keeps a valid level'], ['Chain', 'Q7′ (QH′) feeds the next chip’s data input']],
    freq: [['Shift clock', '≈ 25 MHz guaranteed at 4.5 V (≈ 100 MHz typical)']],
    tips: ['Eight LEDs at 10 mA = 80 mA: over the chip’s total — use ≈ 1 kΩ resistors or fewer LEDs on at once.'],
  },
  sn7490: {
    part: '74LS90 decade counter (TTL)',
    max: [['Supply VCC', '7 V (abs max)'], ['Input voltage', '7 V']],
    typ: [['Supply VCC', '4.75–5.25 V'], ['Input HIGH / LOW', '≥ 2.0 V / ≤ 0.8 V'], ['Output', 'sinks 8 mA, sources 0.4 mA']],
    freq: [['Max count rate', '≈ 32 MHz (input A)']],
    tips: ['Wire QA to input B for a ÷10 BCD count.'],
  },
  sn7447: {
    part: '74LS47 BCD → 7-segment driver (open collector)',
    max: [['Supply VCC', '7 V (abs max)'], ['Segment outputs (off)', 'up to 15 V'], ['Segment sink current', '24 mA']],
    typ: [['Supply VCC', '4.75–5.25 V'], ['Outputs', 'pull LOW to light a segment (common-anode display)']],
    freq: [['Propagation delay', '≈ 100 ns']],
    tips: ['Still needs one resistor per segment (≈ 330 Ω at 5 V).'],
  },
  cd4017: CMOS_4000('CD4017 decade counter', '≈ 2.5 MHz at 5 V, 5 MHz at 10 V'),
  cd4026: CMOS_4000('CD4026 counter + 7-segment driver', '≈ 2.5 MHz at 5 V', [['Segment outputs', 'drive LED segments directly at ≈ 1 mA (dim) — use a buffer for bright']]),
  cd4040: CMOS_4000('CD4040 12-bit ripple counter', '≈ 3.5 MHz at 5 V, 8 MHz at 10 V'),
  cd4511: CMOS_4000('CD4511 BCD → 7-segment latch/decoder', '≈ 1 MHz latch rate', [['Segment outputs', 'source up to 25 mA each (made for LEDs, with resistors)']]),
  scope_probe: { part: 'Oscilloscope probe', typ: [['Input', '10 MΩ ∥ ≈ 15 pF (×10)'], ['Max', '300 V CAT II']], freq: [['Bandwidth', '×10: 100 MHz, ×1: ≈ 6 MHz']] },
  oscilloscope: {
    part: '2-channel digital oscilloscope',
    max: [['Input (×1)', '300 V RMS CAT II']],
    typ: [['Input impedance', '1 MΩ ∥ 15 pF'], ['Vertical', '2 mV … 10 V/div']],
    freq: [['Bandwidth (a bench scope)', '≈ 50–100 MHz']],
    lab: [['Samples', 'one per simulation step — fast signals need a small time step']],
  },
  multimeter: {
    part: 'Handheld digital multimeter',
    max: [['Volts', '600 V DC / AC'], ['mA range', '400 mA, fused'], ['10 A range', '10 A for ≤ 10 s, unfused on many meters']],
    typ: [['Volt input', '10 MΩ (it loads high-resistance circuits)'], ['Ohms', 'up to ≈ 40 MΩ']],
    freq: [['AC volts (true RMS)', '≈ 40 Hz … 1 kHz']],
    lab: [['mA range', 'nearly a short — across a supply the fuse blows']],
  },
  power_supply: { part: 'Adjustable DC supply', typ: [['Output', 'set below; current limited']], tips: ['Turn the current limit down while you test a new circuit.'] },
  bench_supply: {
    part: 'Triple-output bench supply',
    max: [['CH1 / CH2', '0–30 V, 0–3 A each'], ['Fixed output', '5 V, 3 A']],
    typ: [['Modes', 'constant voltage (CV), constant current (CC) when the limit is reached'], ['Series / parallel', '±30 V or 60 V, or 6 A']],
  },
  function_generator: { part: 'Function generator', typ: [['Output impedance', '50 Ω'], ['Waves', 'sine, square, triangle']] },
  signal_generator: {
    part: 'Bench function generator',
    max: [['Amplitude', '20 Vpp open circuit (10 Vpp into 50 Ω)']],
    typ: [['Output impedance', '50 Ω'], ['DC offset', '±10 V']],
    freq: [['Frequency', '1 mHz … ≈ 10 MHz (sine)']],
  },
  daq: {
    part: 'USB DAQ (myDAQ-class)',
    max: [['Analog inputs', '±10 V'], ['Analog outputs', '±10 V, ≈ 2 mA'], ['Digital I/O', '0–5 V']],
    typ: [['Resolution', '16-bit'], ['Inputs', '2 differential'], ['Outputs', '2']],
    freq: [['Sample rate', '≈ 200 kS/s per channel']],
  },
  curve_tracer: { part: 'Curve tracer', typ: [['Sweeps', 'collector/drain voltage, steps base current or gate voltage']] },
  decade_resistor: { part: 'Decade resistor box', max: [['Power', '≈ 0.5 W per step'], ['Voltage', '≈ 250 V']], typ: [['Tolerance', '±1 %']] },
  decade_capacitor: { part: 'Decade capacitor box', max: [['Voltage', '≈ 50 V']], typ: [['Tolerance', '±5 %']] },
  servo: {
    part: 'SG90 micro servo',
    max: [['Supply', '≈ 7.2 V'], ['Stall current', '≈ 650–750 mA']],
    typ: [['Supply', '4.8–6 V'], ['Idle current', '≈ 10 mA'], ['Torque', '1.8 kg·cm at 4.8 V'], ['Speed', '0.1 s per 60°'], ['Travel', '0–180°']],
    freq: [['Signal', 'a pulse every 20 ms (50 Hz)'], ['Pulse width', '≈ 0.5–2.4 ms → 0–180°']],
    tips: ['Several servos need their own 5 V supply — share GND with the board.'],
  },
  lcd1602_i2c: {
    part: 'HD44780 16 × 2 LCD with PCF8574 I²C backpack',
    max: [['Supply', '5.5 V']],
    typ: [['Supply', '4.5–5.5 V'], ['Current', '≈ 1–2 mA + backlight 20–40 mA'], ['I²C address', '0x27 (or 0x3F)']],
    freq: [['I²C clock', '100 kHz (400 kHz max)']],
  },
  oled_ssd1306: {
    part: 'SSD1306 0.96" OLED, 128 × 64',
    max: [['Supply (module)', '5.5 V (on-board 3.3 V regulator)']],
    typ: [['Supply', '3.3–5 V'], ['Current', '≈ 10–20 mA (more pixels lit = more)'], ['I²C address', '0x3C']],
    freq: [['I²C clock', 'up to 400 kHz']],
  },
  neopixel_strip: {
    part: 'WS2812B addressable LEDs × 8',
    max: [['Supply', '5.3 V'], ['Current', '≈ 60 mA per LED at full white (≈ 0.5 A for 8)']],
    typ: [['Supply', '3.5–5.3 V'], ['Data HIGH', '≥ 0.7 × VDD']],
    freq: [['Data rate', '800 kHz'], ['Refresh', 'each LED updates in 30 µs']],
    tips: ['Put a 300–500 Ω resistor in the data line and a 470 µF capacitor across the supply.'],
  },
  hcsr04: {
    part: 'HC-SR04 ultrasonic distance sensor',
    max: [['Supply', '5.5 V']],
    typ: [['Supply', '5 V'], ['Current', '≈ 15 mA'], ['Range', '2–400 cm, ±3 mm'], ['Beam', '≈ 15°'], ['Echo pin', '5 V — divide it down for 3.3 V boards']],
    freq: [['Sound', '40 kHz'], ['Trigger', 'a 10 µs pulse'], ['Measure rate', '≤ ≈ 16 per second (60 ms apart)']],
  },
  dht22: {
    part: 'DHT22 / AM2302 temperature + humidity',
    max: [['Supply', '6 V']],
    typ: [['Supply', '3.3–6 V'], ['Current', '1–1.5 mA measuring'], ['Temperature', '−40 … 80 °C, ±0.5 °C'], ['Humidity', '0–100 % RH, ±2–5 %']],
    freq: [['Read rate', 'once every 2 s at most']],
  },
}

/** a board's sheet from its BoardDef (logic level, pin limits, ADC/PWM, supplies, extra facts) */
function boardSheet(b: BoardDef): Sheet {
  const adcTop = b.logicV >= 5 ? 5 : 3.3
  return {
    part: `${b.label} — ${b.mcu}`,
    max: [
      ['Voltage on a GPIO pin', `${b.absMaxV} V`],
      ['Current per GPIO pin', `${b.maxPinMa} mA`],
      ...(b.inputOnly.length ? ([['Input-only pins', b.inputOnly.join(', ')]] as SpecRow[]) : []),
    ],
    typ: [
      ['Logic level', `${b.logicV} V (HIGH ≈ ${b.logicV} V, LOW 0 V)`],
      ['Supply pins', b.supplies.map((s) => `${s.pin} = ${s.v} V`).join(', ')],
      ['Analog in (ADC)', `${b.adcBits}-bit, 0–${adcTop} V on ${Object.keys(b.adc).length} pins`],
      ['I²C', `SDA ${b.i2c.sda}, SCL ${b.i2c.scl}`],
      ...(b.extraSpecs ?? []),
    ],
    freq: [
      ['Clock', b.mcu.split('·')[1]?.trim() ?? b.mcu],
      ['PWM (analogWrite)', `${b.pwmHz} Hz, ${b.pwmBits}-bit, ${b.pwm === 'all' ? 'any output pin' : b.pwm.join(', ')}`],
    ],
    lab: [['Damage', `the lab marks a pin damaged above ${b.absMaxV} V or ${b.maxPinMa} mA`]],
    tips: b.logicV < 5 ? ['A 3.3 V board: never feed 5 V into its pins — use a divider or a level shifter.'] : ['5 V logic: a 3.3 V module may need a level shifter on its inputs.'],
  }
}

/** the "In this lab" rows from a part's adjustable settings (min … max with units) */
function paramRows(entry: CatalogEntry, comp: ComponentInstance | null): SpecRow[] {
  const rows: SpecRow[] = []
  for (const d of entry.params ?? []) {
    if (d.hidden || d.kind !== 'number') continue
    const unit = d.unit ?? ''
    const range = d.min !== undefined && d.max !== undefined ? `${SI(d.min, unit)} … ${SI(d.max, unit)}` : ''
    const now = comp ? paramOf(comp.params, entry, d.key) : undefined
    rows.push([d.label, `${typeof now === 'number' ? `${SI(now, unit)} now` : ''}${range ? `${typeof now === 'number' ? ' · ' : ''}settable ${range}` : ''}`])
  }
  return rows.filter(([, v]) => v)
}

/** everything the Specs page shows for a part (type, or a placed part with its settings) */
export function specsFor(type: string, comp: ComponentInstance | null = null): PartSpecs | null {
  const entry = getEntry(type)
  if (!entry) return null
  const b = boardDef(type)
  const s: Sheet = b ? boardSheet(b) : (SHEETS[type] ?? { part: entry.label })
  const p = (key: string) => (comp ? paramOf(comp.params, entry, key) : entry.params?.find((d) => d.key === key)?.default) as number | string | boolean | undefined
  const groups: SpecGroup[] = []
  if (s.live) groups.push({ name: 'This part', rows: s.live(p) })
  if (s.max?.length) groups.push({ name: 'Maximum ratings', rows: s.max })
  if (s.typ?.length) groups.push({ name: 'Working values', rows: s.typ })
  if (s.freq?.length) groups.push({ name: 'Frequency and speed', rows: s.freq })
  const lab = [...paramRows(entry, comp), ...(s.lab ?? [])]
  if (lab.length) groups.push({ name: 'In this lab', rows: lab })
  return { part: s.part, groups, tips: s.tips ?? [] }
}

/** parts that have a full sheet (tests: every catalog part should) */
export function hasSheet(type: string): boolean {
  return !!boardDef(type) || type in SHEETS
}
