/**
 * Named saves: a student types a name, the circuit (parts, wires, board,
 * sketch code) is kept under it in this browser, and they can open, replace or
 * delete it later. A save is the same JSON as Export, so it can also be
 * downloaded as a file and opened on another computer.
 */
import type { CircuitLayout } from '../model/types'

export interface SavedCircuit {
  name: string
  savedAt: number
  parts: number
  layout: CircuitLayout
}

const KEY = 'circuitlab.saved.v1'
const LAST = 'circuitlab.saved.last'
export const MAX_NAME = 60

/** a tidy name: trimmed, single spaces, at most MAX_NAME characters */
export function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
}

/** every save, newest first */
export function listSaved(): SavedCircuit[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as SavedCircuit[]) : []
    return Array.isArray(list) ? list.filter((s) => s && typeof s.name === 'string' && s.layout).sort((a, b) => b.savedAt - a.savedAt) : []
  } catch {
    return []
  }
}

function write(list: SavedCircuit[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    return false // storage full or blocked
  }
}

/** the same name (any case) is one save: saving again replaces it */
export function findSaved(name: string): SavedCircuit | undefined {
  const n = cleanName(name).toLowerCase()
  return listSaved().find((s) => s.name.toLowerCase() === n)
}

/** save (or replace) under `name`; false when the browser would not store it */
export function saveCircuit(name: string, layout: CircuitLayout): boolean {
  const clean = cleanName(name)
  if (!clean) return false
  const rest = listSaved().filter((s) => s.name.toLowerCase() !== clean.toLowerCase())
  const entry: SavedCircuit = { name: clean, savedAt: Date.now(), parts: layout.components.length + layout.wires.length, layout: { ...layout, name: clean } }
  const ok = write([entry, ...rest])
  if (ok) setLastName(clean)
  return ok
}

export function deleteSaved(name: string): void {
  write(listSaved().filter((s) => s.name !== name))
}

/** the name last saved or opened, offered again in the name box */
export function lastName(): string {
  try {
    return window.localStorage.getItem(LAST) ?? ''
  } catch {
    return ''
  }
}

export function setLastName(name: string): void {
  try {
    window.localStorage.setItem(LAST, name)
  } catch {
    /* fine: just not remembered */
  }
}
