/**
 * Removing one breadboard picked in the scene: what sits on it goes, the boards
 * after it slide back one module (or board-row) so the rest still works, one
 * undo step brings it all back, and the last board can't be removed.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { CircuitLayout } from '../src/model/types'
import { moduleOfHole, parseHole, removeBoardModule } from '../src/model/breadboard'
import { getEntry } from '../src/model/catalog'
import { validateLayout } from '../src/model/validate'
import { __resetHistoryForTests, useStore } from '../src/state/store'

const three: CircuitLayout = {
  version: 1,
  board: 'standard',
  boardCount: 3,
  components: [
    { id: 'R1', type: 'resistor', holes: ['a5', 'a10'] }, // board 1
    { id: 'R2', type: 'resistor', holes: ['a70', 'a75'] }, // board 2 — removed
    { id: 'R3', type: 'resistor', holes: ['a140', 'a150'] }, // board 3 — slides back 63
  ],
  wires: [
    { id: 'W1', from: 'b10', to: 'b140' }, // board 1 → board 3: kept, end shifted
    { id: 'W2', from: 'b5', to: 'b72' }, // ends on board 2: removed
    { id: 'W3', from: 'top+110', to: 'c150' }, // rail on board 3 (index 100+): shifted 50
  ],
} as CircuitLayout

describe('remove one breadboard', () => {
  beforeEach(() => __resetHistoryForTests())

  it('knows which board a hole is on', () => {
    expect(moduleOfHole(parseHole('a70')!, 'standard')).toEqual({ col: 1, row: 0 })
    expect(moduleOfHole(parseHole('top+49')!, 'standard')).toEqual({ col: 0, row: 0 })
    expect(moduleOfHole(parseHole('1:a3')!, 'standard')).toEqual({ col: 0, row: 1 })
  })

  it('takes the middle board and what is on it, the next board slides back', () => {
    const res = removeBoardModule(three, 1, 0, getEntry)!
    expect(res.removedParts).toBe(1)
    expect(res.removedWires).toBe(1)
    const l = res.layout
    expect(l.boardCount).toBe(2)
    expect(l.components.map((c) => c.id)).toEqual(['R1', 'R3'])
    expect(l.components[1].holes).toEqual(['a77', 'a87'])
    expect(l.wires.find((w) => w.id === 'W1')).toMatchObject({ from: 'b10', to: 'b77' })
    expect(l.wires.find((w) => w.id === 'W3')).toMatchObject({ from: 'top+60', to: 'c87' })
    expect(validateLayout(l).ok).toBe(true)
  })

  it('removes a board-row on a one-wide grid and refuses the last board', () => {
    const rows: CircuitLayout = { ...three, boardCount: undefined, boardRows: 2, components: [{ id: 'R9', type: 'resistor', holes: ['1:a5', '1:a9'] }], wires: [] } as CircuitLayout
    const res = removeBoardModule(rows, 0, 0, getEntry)!
    expect(res.layout.boardRows).toBeUndefined()
    expect(res.layout.components[0].holes).toEqual(['a5', 'a9'])
    expect(removeBoardModule(res.layout, 0, 0, getEntry)).toBeNull()
  })

  it('the store removes the picked board in one undo step', () => {
    const st = useStore.getState()
    st.loadLayout(three)
    st.selectBoard({ col: 1, row: 0 })
    expect(useStore.getState().boardSelection).toEqual({ col: 1, row: 0 })
    expect(st.removeBoard({ col: 1, row: 0 }).ok).toBe(true)
    expect(useStore.getState().layout.boardCount).toBe(2)
    expect(useStore.getState().boardSelection).toBeNull()
    useStore.getState().undo()
    expect(useStore.getState().layout.boardCount).toBe(3)
    expect(useStore.getState().layout.components).toHaveLength(3)
  })
})
