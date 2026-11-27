/**
 * Inspect board: the pure helpers over knowledge/circuit-boards.json — teaching
 * text resolved from kinds, lab-board lookup, nets and pin groups, the ladder
 * schematic layout and the resistor codes printed on chip resistors.
 */
import { describe, expect, it } from 'vitest'
import raw from '../../../knowledge/circuit-boards.json'
import {
  boardIdForLab,
  findBoard,
  fittedParts,
  groupAnchor,
  netColor,
  netsOfPart,
  partsOnNet,
  pinsOfGroup,
  resolvePart,
  schematicLayout,
  symbolOf,
  type BoardsDoc,
} from '../src/inspect/boards'
import { resCode } from '../src/inspect/part-meshes'

const doc = raw as unknown as BoardsDoc

describe('inspect boards data helpers', () => {
  it('resolves kid and deep text from the kind, keeping the part\'s own facts first', () => {
    const b = findBoard(doc, 'esp32_devkit_v1')
    const u1 = b.parts.find((p) => p.ref === 'U1')!
    const r = resolvePart(doc, u1)
    expect(r.kindLabel).toBe(doc.kinds['rf-module'].label)
    expect(r.kid).toBe(doc.kinds['rf-module'].kid)
    expect(r.deep.length).toBeGreaterThan(80)
    expect(r.facts[0]).toBe(u1.facts![0])
    expect(r.facts.length).toBe(u1.facts!.length + doc.kinds['rf-module'].facts.length)
  })

  it('every part on every board resolves to a one-liner and a deeper explanation', () => {
    for (const b of doc.boards) {
      for (const p of b.parts) {
        const r = resolvePart(doc, p)
        expect(r.kid, `${b.id} ${p.ref}`).toBeTruthy()
        expect(r.deep, `${b.id} ${p.ref}`).toBeTruthy()
      }
    }
  })

  it('finds boards by id or by Circuit Lab board type', () => {
    expect(findBoard(doc, 'arduino_uno').id).toBe('arduino_uno_r3')
    expect(findBoard(doc, 'rpi_pico').id).toBe('rpi_pico')
    expect(findBoard(doc, 'esp32_devkit').id).toBe('esp32_devkit_v1')
    expect(findBoard(doc, 'no_such_board').id).toBe(doc.boards[0].id)
    expect(boardIdForLab(doc, 'arduino_mega')).toBe('arduino_mega2560_r3')
    expect(boardIdForLab(doc, 'stm32_bluepill')).toBeNull()
  })

  it('nets join parts both ways', () => {
    const b = findBoard(doc, 'esp32_devkit_v1')
    const reg = b.parts.find((p) => p.ref === 'U2')!
    expect(netsOfPart(reg)).toEqual(expect.arrayContaining(['VIN', '+3V3', 'GND']))
    const on3v3 = partsOnNet(b, '+3V3')
    expect(on3v3).toEqual(expect.arrayContaining(['U1', 'U2', 'C2']))
    for (const ref of on3v3) {
      const p = b.parts.find((x) => x.ref === ref)
      if (p) expect(netsOfPart(p)).toContain('+3V3')
    }
  })

  it('pin groups map to pins, and their anchor sits on the board', () => {
    for (const b of doc.boards) {
      for (const g of b.pinGroups) {
        const pins = pinsOfGroup(b, g)
        expect(pins.length, `${b.id} ${g.id}`).toBeGreaterThan(0)
        const a = groupAnchor(b, g)
        expect(a.x).toBeGreaterThanOrEqual(0)
        expect(a.x).toBeLessThanOrEqual(b.size.w)
        expect(a.y).toBeGreaterThanOrEqual(0)
        expect(a.y).toBeLessThanOrEqual(b.size.h)
      }
    }
  })

  it('lays out a ladder schematic: power rails first, a column per fitted part, dots only on rails', () => {
    for (const b of doc.boards) {
      const s = schematicLayout(b)
      const kinds = s.rails.map((r) => r.kind)
      const order = ['power', 'ground', 'signal', 'local']
      for (let i = 1; i < kinds.length; i++) expect(order.indexOf(kinds[i])).toBeGreaterThanOrEqual(order.indexOf(kinds[i - 1]))
      const rails = new Set(s.rails.map((r) => r.net))
      expect(s.columns.length).toBe(fittedParts(b).filter((p) => !p.partOf).length)
      const xs = s.columns.map((c) => c.x)
      expect(new Set(xs).size).toBe(xs.length)
      for (const c of s.columns) for (const n of c.nets) expect(rails.has(n)).toBe(true)
      expect(s.width).toBeGreaterThan(Math.max(...xs))
      expect(s.height).toBeGreaterThan(Math.max(s.top, ...s.rails.map((r) => r.y)))
    }
    // the microcontroller leads the Uno's schematic
    expect(schematicLayout(findBoard(doc, 'arduino_uno_r3')).columns[0].ref).toBe('ZU4')
  })

  it('symbols and colours', () => {
    expect(symbolOf('cap-decoupling')).toBe('cap')
    expect(symbolOf('resistor-network')).toBe('res')
    expect(symbolOf('mcu')).toBe('chip')
    expect(symbolOf('tvs-esd')).toBe('diode')
    expect(netColor('+5V', 'power')).toBe('#d84a3b')
    expect(netColor('IO4', 'signal')).toBe(netColor('IO4', 'signal'))
  })

  it('prints chip-resistor codes the way the parts are marked', () => {
    expect(resCode('10K')).toBe('103')
    expect(resCode('1K')).toBe('102')
    expect(resCode('470R')).toBe('471')
    expect(resCode('5K6')).toBe('562')
    expect(resCode('1M')).toBe('105')
    expect(resCode('0R')).toBe('0')
  })
})
