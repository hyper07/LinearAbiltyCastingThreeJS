/** Named saves: save under a name, replace by name (any case), list newest first, delete. */
import { beforeEach, describe, expect, it } from 'vitest'
import { cleanName, deleteSaved, findSaved, lastName, listSaved, saveCircuit } from '../src/state/saved'
import type { CircuitLayout } from '../src/model/types'

const mem = new Map<string, string>()
;(globalThis as unknown as { window: unknown }).window = {
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) },
}
const layout = (n: number): CircuitLayout => ({ version: 1, board: 'half', components: Array.from({ length: n }, (_, i) => ({ id: `R${i}`, type: 'resistor', holes: [`a${i + 1}`, `a${i + 5}`] })), wires: [] }) as CircuitLayout

describe('named saves', () => {
  beforeEach(() => mem.clear())
  it('saves, replaces by name, lists newest first and deletes', async () => {
    expect(cleanName('  Mina   traffic  light ')).toBe('Mina traffic light')
    expect(saveCircuit('Mina – traffic light', layout(1))).toBe(true)
    await new Promise((r) => setTimeout(r, 5))
    expect(saveCircuit('Servo test', layout(2))).toBe(true)
    expect(listSaved().map((s) => s.name)).toEqual(['Servo test', 'Mina – traffic light'])
    expect(lastName()).toBe('Servo test')
    // the same name in another case replaces it
    saveCircuit('servo TEST', layout(3))
    expect(listSaved()).toHaveLength(2)
    expect(findSaved('Servo Test')?.layout.components).toHaveLength(3)
    expect(findSaved('servo test')?.layout.name).toBe('servo TEST')
    deleteSaved('servo TEST')
    expect(listSaved().map((s) => s.name)).toEqual(['Mina – traffic light'])
    expect(saveCircuit('   ', layout(1))).toBe(false)
  })
})
