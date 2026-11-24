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
