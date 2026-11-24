/** Off-board units (boards, servo, modules, instruments) turn in quarter turns about their middle. */
import { beforeEach, describe, expect, it } from 'vitest'
import type { CircuitLayout } from '../src/model/types'
import { offboardBodyRect, offboardTerminalExit, offboardTerminalPosition, turnOffset } from '../src/model/breadboard'
import { validateLayout } from '../src/model/validate'
import { __resetHistoryForTests, useStore } from '../src/state/store'
import '../src/model/catalog'

describe('turning an off-board unit', () => {
  beforeEach(() => __resetHistoryForTests())
  it('turns offsets clockwise in plan view', () => {
    expect(turnOffset(1, 0, 90)).toEqual({ x: -0, z: 1 })
    expect(turnOffset(1, 0, 180)).toEqual({ x: -1, z: -0 })
    expect(turnOffset(1, 0, 270)).toEqual({ x: 0, z: -1 })
  })
  it('pins, exits and the body box turn together', () => {
    const pos = { x: 50, z: 4 }
    const p0 = offboardTerminalPosition(0, 0, pos, 'servo', 0)
    const p90 = offboardTerminalPosition(0, 0, pos, 'servo', 90)
    expect(Math.hypot(p0.x - pos.x, p0.z - pos.z)).toBeCloseTo(Math.hypot(p90.x - pos.x, p90.z - pos.z), 6)
    expect(offboardTerminalExit('servo', 0, 90)).toEqual({ x: -0, z: -1 })
    const r0 = offboardBodyRect(0, pos, 'servo', 0)
    const r90 = offboardBodyRect(0, pos, 'servo', 90)
    expect(r90.maxX - r90.minX).toBeCloseTo(r0.maxZ - r0.minZ, 6)
  })
  it('the store turns the servo about its middle, the validator keeps the rotation, undo restores it', () => {
    const layout = { version: 1, board: 'half', components: [{ id: 'S1', type: 'servo', pos: { x: 47, z: 4 } }], wires: [] } as CircuitLayout
    const st = useStore.getState()
    expect(st.loadLayout(layout).ok).toBe(true)
    expect(st.rotatePlaced('S1').ok).toBe(true)
    const s1 = useStore.getState().layout.components[0]
    expect(s1.rotation).toBe(90)
    expect(validateLayout(useStore.getState().layout).layout?.components[0].rotation).toBe(90)
    for (let i = 0; i < 3; i++) useStore.getState().rotatePlaced('S1')
    expect(useStore.getState().layout.components[0].rotation).toBeUndefined()
    useStore.getState().undo()
    expect(useStore.getState().layout.components[0].rotation).toBe(270)
  })
})
