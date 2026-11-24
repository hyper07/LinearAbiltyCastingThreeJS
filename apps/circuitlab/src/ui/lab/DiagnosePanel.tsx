/**
 * Diagnose: when a part is running over its limit or has burned out, a red
 * (or orange) button appears under the run capsule. The panel lists every
 * broken part — what happened, with the numbers, and what to change — plus
 * parts that are running hot and other circuit problems, with Show (fly the
 * camera to it), Replace (a new part in its place) and Reset.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../state/store'
import { showToast, tick } from '../kit'

export function DiagnoseButton({ onOpen }: { onOpen: () => void }) {
  const damage = useStore((s) => s.damage)
  const hot = useStore((s) => s.hotParts)
  const burned = damage.filter((d) => d.kind === 'burned')
  const over = hot.filter((h) => h.reading.ratio > 1)
  // a toast the moment something burns out
  const seen = useRef(new Set<string>())
  useEffect(() => {
    for (const d of damage) {
      const key = `${d.id}:${d.reason}`
      if (seen.current.has(key)) continue
      seen.current.add(key)
      tick(16)
      showToast(d.kind === 'burned' ? `💥 ${d.id} burned out — press Diagnose to see why` : `⚠ ${d.id}: a pin was damaged — press Diagnose`, { duration: 4200 })
    }
    if (damage.length === 0) seen.current.clear()
  }, [damage])
  if (damage.length === 0 && over.length === 0) return null
  const label = burned.length
    ? `${burned.length === 1 ? `${burned[0].id} burned out` : `${burned.length} parts burned out`}`
    : damage.length
      ? `${damage[0].id}: pin damaged`
      : `${over[0].id} is overheating`
  return (
    <button type="button" className={`lab-diag-btn ${damage.length ? 'is-broken' : 'is-hot'}`} onClick={onOpen} data-diagnose>
      <span aria-hidden="true">{damage.length ? '💥' : '🔥'}</span>
      <span>{label}</span>
      <strong>Diagnose</strong>
    </button>
  )
}

export function DiagnosePanel({ open, onClose, onShow }: { open: boolean; onClose: () => void; onShow: (id: string) => void }) {
  const damage = useStore((s) => s.damage)
  const hot = useStore((s) => s.hotParts)
  const issues = useStore((s) => s.issues)
  const [, force] = useState(0)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])
  if (!open || typeof document === 'undefined') return null
  const st = useStore.getState()
  const others = issues.filter((i) => i.level === 'error' && !damage.some((d) => i.message.includes(d.id)))
  const replace = (id: string) => {
    st.replacePart(id)
    tick()
    showToast(`New ${id} in place — if the circuit is still wrong it will burn again`, { duration: 3600 })
    force((x) => x + 1)
  }
  const nothing = damage.length === 0 && hot.length === 0 && others.length === 0
  return createPortal(
    <div className="lab-modal lab-specs-modal" role="dialog" aria-label="Diagnose the circuit" data-diagnose-panel onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lab-modal-card lab-diag">
        <h2>Diagnose</h2>
        {nothing && <p className="lab-dim">Every part is inside its limits. 👍</p>}
        {damage.map((d) => (
          <section key={`${d.id}:${d.reason}`} className={`lab-diag-card ${d.kind === 'burned' ? 'is-broken' : 'is-pin'}`}>
            <header>
              <span className="lab-diag-id">{d.id}</span>
              <span>{d.label}</span>
              <span className="lab-diag-tag">{d.kind === 'burned' ? 'Burned out' : 'Pin damaged'}</span>
            </header>
            <p>
              <b>What happened.</b> {d.reason}
            </p>
            <p>
              <b>What to do.</b> {d.fix}
            </p>
            <div className="lab-diag-actions">
              <button type="button" className="lab-btn" onClick={() => onShow(d.id)}>
                Show
              </button>
              <button type="button" className="lab-btn is-primary" onClick={() => replace(d.id)} data-replace={d.id}>
                {d.kind === 'burned' ? 'Replace part' : 'Replace board'}
              </button>
            </div>
          </section>
        ))}
        {hot.map((h) => (
          <section key={`hot:${h.id}`} className="lab-diag-card is-hot">
            <header>
              <span className="lab-diag-id">{h.id}</span>
              <span className="lab-diag-tag">{h.reading.ratio > 1 ? `Overheating · ${Math.round(h.reading.ratio * 100)} % of its limit` : `Near its limit · ${Math.round(h.reading.ratio * 100)} %`}</span>
            </header>
            <p>
              <b>What is happening.</b> {h.reading.reason}
              {h.reading.ratio > 1 ? ' It will burn out in a moment.' : ''}
            </p>
            <p>
              <b>What to do.</b> {h.reading.fix}
            </p>
            <div className="lab-diag-actions">
              <button type="button" className="lab-btn" onClick={() => onShow(h.id)}>
                Show
              </button>
            </div>
          </section>
        ))}
        {others.length > 0 && (
          <section className="lab-diag-card is-other">
            <header>
              <span className="lab-diag-tag">Other problems</span>
            </header>
            <ul>
              {others.slice(0, 6).map((i) => (
                <li key={i.message}>{i.message}</li>
              ))}
            </ul>
          </section>
        )}
        <div className="lab-diag-foot">
          {damage.length > 1 && (
            <button type="button" className="lab-btn" onClick={() => { st.replaceAll(); tick(); force((x) => x + 1) }}>
              Replace all
            </button>
          )}
          <button
            type="button"
            className="lab-btn"
            onClick={() => {
              st.resetSim()
              onClose()
              showToast('Simulation reset — every part is new again')
            }}
          >
            Reset simulation
          </button>
          <button type="button" className="lab-btn is-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
