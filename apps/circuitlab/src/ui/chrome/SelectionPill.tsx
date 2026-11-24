/**
 * SelectionPill — floating glass pill centered above the dock while the
 * multi-select holds 2+ items: "3 selected · Delete · Clear". Delete is the
 * destructive (red) action and removes the whole selection — confirmed via
 * an ActionSheet when more than 3 parts are selected; Clear just drops the
 * selection. Springs in/out on the house spring (transform/opacity only;
 * reduced motion collapses via the kit duration tokens), 44px touch targets,
 * haptics on press, safe-area aware. Portaled to <body> like the
 * UndoPill/Dock so it z-stacks predictably over the app shell.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../state/store'
import { ActionSheet, pressProps, showToast, tick, useIsDesktop } from '../kit'
import { getEntry } from '../../model/catalog'
import { openSpecs } from '../lab/SpecsPanel'
import './SelectionPill.css'

/** Matches the exit transition (--lg-dur-control 200ms) with a little slack. */
const UNMOUNT_DELAY_MS = 240

/** Confirm group deletes via ActionSheet above this many selected parts. */
const CONFIRM_THRESHOLD = 3

/**
 * Contract bridge — the concurrent store work widens `AppState.selection`
 * to a multi-select. Count either shape (id | id[] | null) so this file
 * compiles and behaves before and after the contract lands (with the
 * single-id contract the count never exceeds 1, so the pill stays hidden).
 */
function selectionCount(sel: unknown): number {
  if (Array.isArray(sel)) return sel.length
  return typeof sel === 'string' ? 1 : 0
}

export function SelectionPill() {
  const count = useStore((s) => selectionCount(s.selection))
  const select = useStore((s) => s.select)
  const removeSelected = useStore((s) => s.removeSelected)
  const desktop = useIsDesktop()

  const [confirm, setConfirm] = useState(false)
  const visible = count > 1

  // keep the last multi-count for the label while the pill springs out
  const shownRef = useRef(count)
  if (visible) shownRef.current = count
  const shown = shownRef.current

  // keep the pill mounted through its exit spring (UndoPill pattern)
  const [mounted, setMounted] = useState(visible)
  useEffect(() => {
    if (visible) {
      setMounted(true)
      return
    }
    setConfirm(false) // selection gone — never leave a stale confirm up
    const t = setTimeout(() => setMounted(false), UNMOUNT_DELAY_MS)
    return () => clearTimeout(t)
  }, [visible])

  if (typeof document === 'undefined') return null

  const onDown = (e: ReactPointerEvent<HTMLElement>) => {
    pressProps.onPointerDown(e)
    tick() // haptic on pointerdown, like the kit buttons
  }

  const deleteAll = () => {
    removeSelected()
    tick(16) // delete haptic (DESIGN.md §1)
  }

  const onDelete = () => {
    if (count > CONFIRM_THRESHOLD) setConfirm(true)
    else deleteAll()
  }

  return (
    <>
      {mounted &&
        createPortal(
          // lg-card = the nested-glass slab (rim + insets, no backdrop-filter)
          <div
            className={`app-sel-pill lg-card${visible ? ' is-in' : ''}`}
            role="toolbar"
            aria-label="Selection actions"
          >
            <span className="app-sel-count lg-tabular">{shown} selected</span>
            <span className="app-sel-dot" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              className="app-sel-btn app-sel-delete lg-pressable lg-specular lg-gel"
              aria-label={`Delete ${shown} selected parts`}
              {...pressProps}
              onPointerDown={onDown}
              onClick={onDelete}
            >
              Delete
            </button>
            <span className="app-sel-dot" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              className="app-sel-btn lg-pressable lg-specular lg-gel"
              aria-label="Clear the selection"
              {...pressProps}
              onPointerDown={onDown}
              onClick={() => select(null)}
            >
              Clear
            </button>
          </div>,
          document.body,
        )}

      <ActionSheet
        open={confirm}
        onDismiss={() => setConfirm(false)}
        title={`Delete ${shown} parts?`}
        message="Removes every selected component and wire and disconnects them from the circuit."
        desktop={desktop}
        anchor="right"
        actions={[
          {
            label: `Delete ${shown} parts`,
            destructive: true,
            onSelect: deleteAll,
          },
        ]}
      />
    </>
  )
}

/** Remove the picked breadboard (and what sits on it), with a toast that says what went. */
export function removePickedBoard(): void {
  const st = useStore.getState()
  const b = st.boardSelection
  if (!b) return
  const res = st.removeBoard(b)
  if (!res.ok) {
    if (res.error) showToast(res.error)
    return
  }
  tick(16) // delete haptic (DESIGN.md §1)
  const n = (res.removedParts ?? 0) + (res.removedWires ?? 0)
  showToast(n > 0 ? `Breadboard removed with ${n} part${n === 1 ? '' : 's'} on it — Undo brings it back` : 'Breadboard removed', { duration: 2800 })
}

/**
 * BoardPill — the same glass pill while a breadboard is picked (click its bare
 * holes): "Breadboard 2 · Remove · Clear". On a grid more than one module wide
 * Remove takes the whole module column, so the label says how many boards go.
 */
export function BoardPill() {
  const board = useStore((s) => s.boardSelection)
  const cfg = useStore((s) => s.layout)
  const select = useStore((s) => s.selectBoard)
  if (!board || typeof document === 'undefined') return null
  const count = cfg.boardCount ?? 1
  const rows = cfg.boardRows ?? 1
  const label = count > 1 ? (rows > 1 ? `Breadboard column ${board.col + 1} (${rows} boards)` : `Breadboard ${board.col + 1}`) : `Breadboard row ${board.row + 1}`
  return createPortal(
    <div className="app-sel-pill lg-card is-in" role="toolbar" aria-label="Breadboard actions" data-board-pill>
      <span className="app-sel-count lg-tabular">{label}</span>
      <span className="app-sel-dot" aria-hidden="true">
        ·
      </span>
      <button
        type="button"
        className="app-sel-btn app-sel-delete lg-pressable lg-specular lg-gel"
        aria-label={`Remove ${label}`}
        {...pressProps}
        onClick={removePickedBoard}
        data-board-remove
      >
        Remove
      </button>
      <span className="app-sel-dot" aria-hidden="true">
        ·
      </span>
      <button type="button" className="app-sel-btn lg-pressable lg-specular lg-gel" aria-label="Clear the selection" {...pressProps} onClick={() => select(null)}>
        Clear
      </button>
    </div>,
    document.body,
  )
}

/**
 * PartPill — the same glass pill while ONE part is selected on the bench:
 * "U1 Arduino Uno · ⟳ Rotate · Specs · Delete". Rotate turns a board, module
 * or instrument a quarter turn, a chip end for end, and a leaded part (LED,
 * diode, resistor) the other way round in the same holes (R does the same).
 */
export function PartPill() {
  const id = useStore((s) => (s.mode.kind === 'select' && s.selection.length === 1 ? s.selection[0] : null))
  const comp = useStore((s) => (id ? s.layout.components.find((c) => c.id === id) ?? null : null))
  if (!comp || typeof document === 'undefined') return null
  const entry = getEntry(comp.type)
  if (!entry) return null
  const canTurn =
    entry.placement === 'dip' || entry.placement === 'footprint' || entry.placement === 'offboard' || (entry.placement === 'leads' && (comp.holes?.length ?? 0) >= 2)
  const turnTitle =
    entry.placement === 'leads' ? 'Turn it round in the same holes (R)' : entry.placement === 'dip' ? 'Turn the chip end for end (R)' : 'Rotate a quarter turn (R)'
  const rotate = () => {
    if (useStore.getState().rotatePlaced(comp.id).ok) tick()
    else showToast(`${comp.id} can't turn here — no other rotation fits`, { duration: 3200 })
  }
  const isBoard = entry.category === 'board'
  const plugged = comp.params?.usb !== false
  const toggleUsb = () => {
    useStore.getState().setParam(comp.id, 'usb', !plugged)
    tick()
    showToast(plugged ? `${comp.id} unplugged — it has no power now unless a supply feeds its power pins` : `${comp.id} plugged in — 5 V over USB`, { duration: 2600 })
  }
  const remove = () => {
    useStore.getState().removeComponent(comp.id)
    useStore.getState().select(null)
    tick(16)
  }
  const sep = (
    <span className="app-sel-dot" aria-hidden="true">
      ·
    </span>
  )
  return createPortal(
    <div className="app-sel-pill lg-card is-in" role="toolbar" aria-label={`${comp.id} actions`} data-part-pill>
      <span className="app-sel-count lg-tabular">
        {comp.id} <span className="app-sel-sub">{entry.label}</span>
      </span>
      {canTurn && (
        <>
          {sep}
          <button type="button" className="app-sel-btn lg-pressable lg-specular lg-gel" title={turnTitle} aria-label={`Rotate ${comp.id}`} {...pressProps} onClick={rotate} data-part-rotate>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }}>
              <path d="M20 11a8 8 0 1 0-2.3 5.7" />
              <path d="M20 4v7h-7" />
            </svg>
            Rotate
          </button>
        </>
      )}
      {isBoard && (
        <>
          {sep}
          <button
            type="button"
            className="app-sel-btn lg-pressable lg-specular lg-gel"
            title={plugged ? 'Pull the USB cable out — the board loses power unless a supply feeds VIN / 5V' : 'Plug the USB cable in — 5 V from the computer powers the board'}
            aria-label={plugged ? `Unplug ${comp.id}'s USB cable` : `Plug in ${comp.id}'s USB cable`}
            {...pressProps}
            onClick={toggleUsb}
            data-part-usb
          >
            {plugged ? 'Unplug USB' : 'Plug in USB'}
          </button>
        </>
      )}
      {sep}
      <button type="button" className="app-sel-btn lg-pressable lg-specular lg-gel" aria-label={`Specs of ${comp.id}`} {...pressProps} onClick={() => openSpecs(comp.type, comp.id)}>
        Specs
      </button>
      {sep}
      <button type="button" className="app-sel-btn app-sel-delete lg-pressable lg-specular lg-gel" aria-label={`Delete ${comp.id}`} {...pressProps} onClick={remove}>
        Delete
      </button>
    </div>,
    document.body,
  )
}
