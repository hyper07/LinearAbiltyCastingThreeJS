/**
 * Save / Open: type a name and save the circuit on the bench, then open,
 * replace, download or delete any saved circuit. Saves live in this browser;
 * Download gives a .json file that Open from file (or More → Import) loads
 * anywhere.
 */
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../state/store'
import { MAX_NAME, cleanName, deleteSaved, findSaved, lastName, listSaved, saveCircuit, setLastName, type SavedCircuit } from '../../state/saved'
import { showToast, tick } from '../kit'

function when(t: number): string {
  const d = new Date(t)
  const today = new Date()
  const same = d.toDateString() === today.toDateString()
  return same ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

function download(name: string, json: string): void {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'circuit'
  try {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  } catch {
    showToast('The browser blocked the download')
  }
}

export function SavedPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [list, setList] = useState<SavedCircuit[]>([])
  const [confirm, setConfirm] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setList(listSaved())
    setConfirm(null)
    setName(lastName() || useStore.getState().layout.name || '')
    setTimeout(() => input.current?.select(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])
  if (!open) return null

  const clean = cleanName(name)
  const exists = clean ? findSaved(clean) : undefined

  const save = () => {
    if (!clean) {
      showToast('Type a name for this circuit first')
      input.current?.focus()
      return
    }
    if (exists && confirm !== exists.name) {
      setConfirm(exists.name) // second press replaces it
      return
    }
    const st = useStore.getState()
    const layout = JSON.parse(st.exportJson())
    if (!saveCircuit(clean, layout)) {
      showToast('Could not save — the browser storage is full or blocked. Try Download instead.')
      return
    }
    tick()
    showToast(exists ? `Saved over “${clean}”` : `Saved “${clean}”`)
    setList(listSaved())
    setConfirm(null)
  }

  const openSaved = (s: SavedCircuit) => {
    const res = useStore.getState().loadLayout(s.layout)
    if (!res.ok) {
      showToast(`Couldn’t open “${s.name}”: ${res.errors[0] ?? 'it no longer fits the lab'}`)
      return
    }
    setLastName(s.name)
    tick()
    showToast(`Opened “${s.name}” — Undo goes back`)
    onClose()
  }

  const remove = (s: SavedCircuit) => {
    if (confirm !== `del:${s.name}`) {
      setConfirm(`del:${s.name}`)
      return
    }
    deleteSaved(s.name)
    setList(listSaved())
    setConfirm(null)
    showToast(`Deleted “${s.name}”`)
  }

  const fromFile = async (f: File | undefined) => {
    if (!f) return
    try {
      const layout = JSON.parse(await f.text())
      const res = useStore.getState().loadLayout(layout)
      if (!res.ok) throw new Error(res.errors[0] ?? 'not a circuit file')
      const n = cleanName(String(layout.name ?? f.name.replace(/\.json$/i, '')))
      setName(n)
      setLastName(n)
      showToast(`Opened ${f.name}`)
      onClose()
    } catch (err) {
      showToast(`Couldn’t open ${f.name}: ${(err as Error).message}`)
    }
  }

  return (
    <div className="lab-modal" role="dialog" aria-label="Save or open a circuit" data-saved-panel onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lab-modal-card lab-saved">
        <h2>My circuits</h2>
        <p className="lab-dim">Save what is on the bench under a name — parts, wires, boards and code — and open it again any time. Saves stay in this browser; Download makes a file you can open on another computer.</p>
        <form
          className="lab-saved-row"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <input
            ref={input}
            className="lab-saved-name"
            value={name}
            maxLength={MAX_NAME}
            placeholder="Circuit name, e.g. Mina – traffic light"
            aria-label="Circuit name"
            data-save-name
            onChange={(e) => {
              setName(e.target.value)
              setConfirm(null)
            }}
          />
          <button type="submit" className={`lab-btn is-primary${exists && confirm === exists.name ? ' is-warn' : ''}`} data-save>
            {exists ? (confirm === exists.name ? 'Replace it' : 'Save over') : 'Save'}
          </button>
          <button type="button" className="lab-btn" onClick={() => download(clean || 'circuit', useStore.getState().exportJson())} title="Download this circuit as a .json file">
            Download
          </button>
        </form>
        {exists && confirm === exists.name && <p className="lab-saved-warn">“{exists.name}” is already saved. Press Replace it to save over it, or change the name.</p>}

        <div className="lab-saved-head">
          <span>Saved ({list.length})</span>
          <button type="button" className="lab-btn" onClick={() => file.current?.click()}>
            Open from file…
          </button>
          <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => void fromFile(e.target.files?.[0])} />
        </div>
        {list.length === 0 ? (
          <p className="lab-dim lab-saved-empty">Nothing saved yet.</p>
        ) : (
          <ul className="lab-saved-list" data-saved-list>
            {list.map((s) => (
              <li key={s.name}>
                <button type="button" className="lab-saved-open" onClick={() => openSaved(s)} title={`Open “${s.name}”`} data-open-saved={s.name}>
                  <span className="lab-saved-title">{s.name}</span>
                  <span className="lab-dim">
                    {s.parts} parts and wires · {when(s.savedAt)}
                  </span>
                </button>
                <button type="button" className="lab-btn" onClick={() => download(s.name, JSON.stringify(s.layout, null, 2))} title="Download as a file">
                  ⤓
                </button>
                <button type="button" className={`lab-btn${confirm === `del:${s.name}` ? ' is-warn' : ''}`} onClick={() => remove(s)} title="Delete this save">
                  {confirm === `del:${s.name}` ? 'Delete?' : '✕'}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="lab-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
