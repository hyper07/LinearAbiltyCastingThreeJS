/**
 * Circuit Lab: the 74-series logic an EE Lab I course uses, behavioural
 * (same conventions as ohmlet's gates: thresholds at ½·VCC, 50 Ω push-pull
 * outputs, outputs released below 2 V supply). Pinouts from the TI data sheets.
 *
 *  74x02 quad NOR · 74x112 dual JK flip-flop (negative edge) · 74x90 decade
 *  counter · 74x161 4-bit synchronous counter · 74x164 8-bit SIPO shift
 *  register · 74x595 shift register with output latch · 74x138 3-to-8
 *  decoder · 74x151 8-to-1 mux · 74x47 BCD to 7-segment (active-low,
 *  common-anode display).
 */
import type { ComponentInstance } from '../../model/types'
import { MIN_SUPPLY, driveLogic, readLogic, registerChip, supplyOf, type ChipInstance, type ChipStepCtx } from '../chip-api'

type Step = (ctx: ChipStepCtx, vcc: number) => void

/** wraps a behaviour with the power check and the outputs() report */
function chip(comp: ComponentInstance, outputs: string[], step: Step, levels: Record<string, boolean>): ChipInstance {
  return {
    comp,
    step(ctx) {
      const vcc = supplyOf(ctx, 'VCC')
      if (vcc < MIN_SUPPLY) {
        for (const o of outputs) ctx.drivePin(o, null)
        return
      }
      step(ctx, vcc)
    },
    outputs: () => ({ ...levels }),
  }
}

function out(ctx: ChipStepCtx, levels: Record<string, boolean>, pin: string, high: boolean, vcc: number): void {
  levels[pin] = high
  driveLogic(ctx, pin, high, vcc)
}

/** rising/falling edge detector per pin */
function edges() {
  const last: Record<string, boolean> = {}
  return (pin: string, now: boolean): 'rise' | 'fall' | null => {
    const was = last[pin]
    last[pin] = now
    if (was === undefined) return null
    if (!was && now) return 'rise'
    if (was && !now) return 'fall'
    return null
  }
}

// 74x02: quad 2-input NOR — 1Y 1A 1B 2Y 2A 2B GND 3A 3B 3Y 4A 4B 4Y VCC
registerChip('sn7402', (comp) => {
  const L: Record<string, boolean> = {}
  const gates = [1, 2, 3, 4].map((n) => [`${n}A`, `${n}B`, `${n}Y`])
  return chip(comp, gates.map((g) => g[2]), (ctx, vcc) => {
    for (const [a, b, y] of gates) out(ctx, L, y, !(readLogic(ctx, a, vcc) || readLogic(ctx, b, vcc)), vcc)
  }, L)
})

// 74x112: dual JK, negative-edge, active-low PRE/CLR
// 1CLK 1K 1J 1PRE 1Q 1QN 2QN GND 2Q 2PRE 2J 2K 2CLK 2CLR 1CLR VCC
registerChip('sn74112', (comp) => {
  const L: Record<string, boolean> = {}
  const q = [false, false]
  const edge = edges()
  return chip(comp, ['1Q', '1QN', '2Q', '2QN'], (ctx, vcc) => {
    for (let k = 0; k < 2; k++) {
      const n = k + 1
      const r = (p: string) => readLogic(ctx, `${n}${p}`, vcc)
      const e = edge(`${n}CLK`, r('CLK'))
      const pre = !r('PRE')
      const clr = !r('CLR')
      if (pre || clr) {
        q[k] = pre && !clr ? true : clr && !pre ? false : true
      } else if (e === 'fall') {
        const j = r('J')
        const kk = r('K')
        q[k] = j && kk ? !q[k] : j ? true : kk ? false : q[k]
      }
      out(ctx, L, `${n}Q`, q[k], vcc)
      out(ctx, L, `${n}QN`, pre && clr ? true : !q[k], vcc)
    }
  }, L)
})

// 74x90: decade counter (÷2 on CKA→QA, ÷5 on CKB→QB..QD; wire QA→CKB for BCD)
// CKB R01 R02 NC VCC R91 R92 QC QB GND QD QA NC CKA
registerChip('sn7490', (comp) => {
  const L: Record<string, boolean> = {}
  let a = 0
  let b = 0
  const edge = edges()
  return chip(comp, ['QA', 'QB', 'QC', 'QD'], (ctx, vcc) => {
    const r = (p: string) => readLogic(ctx, p, vcc)
    const ea = edge('CKA', r('CKA'))
    const eb = edge('CKB', r('CKB'))
    if (r('R91') && r('R92')) {
      a = 1
      b = 4
    } else if (r('R01') && r('R02')) {
      a = 0
      b = 0
    } else {
      if (ea === 'fall') a ^= 1
      if (eb === 'fall') b = (b + 1) % 5
    }
    out(ctx, L, 'QA', a === 1, vcc)
    out(ctx, L, 'QB', (b & 1) === 1, vcc)
    out(ctx, L, 'QC', (b & 2) === 2, vcc)
    out(ctx, L, 'QD', (b & 4) === 4, vcc)
  }, L)
})

// 74x161: synchronous 4-bit binary counter, async clear
// CLR CLK A B C D ENP GND LOAD ENT QD QC QB QA RCO VCC
registerChip('sn74161', (comp) => {
  const L: Record<string, boolean> = {}
  let n = 0
  const edge = edges()
  return chip(comp, ['QA', 'QB', 'QC', 'QD', 'RCO'], (ctx, vcc) => {
    const r = (p: string) => readLogic(ctx, p, vcc)
    const e = edge('CLK', r('CLK'))
    if (!r('CLR')) n = 0
    else if (e === 'rise') {
      if (!r('LOAD')) n = (r('A') ? 1 : 0) | (r('B') ? 2 : 0) | (r('C') ? 4 : 0) | (r('D') ? 8 : 0)
      else if (r('ENP') && r('ENT')) n = (n + 1) & 15
    }
    ;['QA', 'QB', 'QC', 'QD'].forEach((p, i) => out(ctx, L, p, ((n >> i) & 1) === 1, vcc))
    out(ctx, L, 'RCO', n === 15 && r('ENT'), vcc)
  }, L)
})

// 74x164: 8-bit serial-in parallel-out; data = A AND B
// A B QA QB QC QD GND CLK CLR QE QF QG QH VCC
registerChip('sn74164', (comp) => {
  const L: Record<string, boolean> = {}
  let reg = 0
  const edge = edges()
  const Q = ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH']
  return chip(comp, Q, (ctx, vcc) => {
    const r = (p: string) => readLogic(ctx, p, vcc)
    const e = edge('CLK', r('CLK'))
    if (!r('CLR')) reg = 0
    else if (e === 'rise') reg = ((reg << 1) | (r('A') && r('B') ? 1 : 0)) & 0xff
    Q.forEach((p, i) => out(ctx, L, p, ((reg >> i) & 1) === 1, vcc))
  }, L)
})

// 74x595: shift register + storage latch
// QB QC QD QE QF QG QH GND QH' SRCLR SRCLK RCLK OE SER QA VCC
registerChip('sn74595', (comp) => {
  const L: Record<string, boolean> = {}
  let sr = 0
  let latch = 0
  const edge = edges()
  const Q = ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH']
  return chip(comp, [...Q, "QH'"], (ctx, vcc) => {
    const r = (p: string) => readLogic(ctx, p, vcc)
    const es = edge('SRCLK', r('SRCLK'))
    const er = edge('RCLK', r('RCLK'))
    if (!r('SRCLR')) sr = 0
    else if (es === 'rise') sr = ((sr << 1) | (r('SER') ? 1 : 0)) & 0xff
    if (er === 'rise') latch = sr
    const oe = !r('OE')
    Q.forEach((p, i) => {
      if (oe) out(ctx, L, p, ((latch >> i) & 1) === 1, vcc)
      else ctx.drivePin(p, null)
    })
    out(ctx, L, "QH'", ((sr >> 7) & 1) === 1, vcc)
  }, L)
})

// 74x138: 3-to-8 decoder, active-low outputs; enabled when G1=1, G2A=G2B=0
// A B C G2A G2B G1 Y7 GND Y6 Y5 Y4 Y3 Y2 Y1 Y0 VCC
registerChip('sn74138', (comp) => {
  const L: Record<string, boolean> = {}
  const Y = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `Y${i}`)
  return chip(comp, Y, (ctx, vcc) => {
    const r = (p: string) => readLogic(ctx, p, vcc)
    const en = r('G1') && !r('G2A') && !r('G2B')
    const sel = (r('A') ? 1 : 0) | (r('B') ? 2 : 0) | (r('C') ? 4 : 0)
    Y.forEach((p, i) => out(ctx, L, p, !(en && i === sel), vcc))
  }, L)
})

// 74x151: 8-to-1 mux, Y and W = not Y, G active low
// D3 D2 D1 D0 Y W G GND C B A D7 D6 D5 D4 VCC
registerChip('sn74151', (comp) => {
  const L: Record<string, boolean> = {}
  return chip(comp, ['Y', 'W'], (ctx, vcc) => {
    const r = (p: string) => readLogic(ctx, p, vcc)
    const sel = (r('A') ? 1 : 0) | (r('B') ? 2 : 0) | (r('C') ? 4 : 0)
    const y = !r('G') && r(`D${sel}`)
    out(ctx, L, 'Y', y, vcc)
    out(ctx, L, 'W', !y, vcc)
  }, L)
})

// 74x47: BCD to 7-segment, active-low open-collector outputs (common-anode display)
// B C LT BI/RBO RBI D A GND e d c b a g f VCC
const SEG7: Record<number, string> = {
  0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
  10: 'deg', 11: 'cdg', 12: 'bfg', 13: 'adfg', 14: 'defg', 15: '',
}
registerChip('sn7447', (comp) => {
  const L: Record<string, boolean> = {}
  const segs = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
  return chip(comp, segs, (ctx, vcc) => {
    const r = (p: string) => readLogic(ctx, p, vcc)
    const n = (r('A') ? 1 : 0) | (r('B') ? 2 : 0) | (r('C') ? 4 : 0) | (r('D') ? 8 : 0)
    const lit = !r('LT') ? 'abcdefg' : !r('BI/RBO') ? '' : SEG7[n] ?? ''
    for (const s of segs) {
      const on = lit.includes(s)
      L[s] = !on
      // open collector: sinks when the segment is on, released otherwise
      ctx.drivePin(s, on ? { v: 0, rout: 15 } : null)
    }
  }, L)
})
