/** Every part in the catalog has a full Specs sheet; live rows follow the part's own settings. */
import { describe, expect, it } from 'vitest'
import { CATALOG } from '../src/model/catalog'
import { hasSheet, specsFor } from '../src/model/specs'

describe('specs', () => {
  it('every catalog part has a sheet with limits', () => {
    const missing = Object.keys(CATALOG).filter((t) => !hasSheet(t))
    expect(missing).toEqual([])
    for (const t of Object.keys(CATALOG)) {
      const s = specsFor(t)!
      expect(s.groups.length, t).toBeGreaterThan(0)
    }
  })
  it('a resistor works out its own current limit; boards list pin limits', () => {
    const r = specsFor('resistor', { id: 'R1', type: 'resistor', params: { resistance: 100 }, holes: ['a1', 'a5'] })!
    const live = r.groups.find((g) => g.name === 'This part')!.rows
    expect(live.find(([k]) => k.startsWith('Most current'))![1]).toBe('50 mA')
    const uno = specsFor('arduino_uno')!
    const max = uno.groups.find((g) => g.name === 'Maximum ratings')!.rows
    expect(max.some(([k, v]) => k.includes('Current per GPIO') && v === '40 mA')).toBe(true)
    const esp = specsFor('esp32_devkit')!
    expect(esp.tips.join(' ')).toContain('3.3 V board')
  })
})
