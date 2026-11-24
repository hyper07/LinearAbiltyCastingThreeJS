/**
 * Specs page for a part: what it is modelled on, its maximum ratings
 * (voltage / current / power), working values, frequency range, and what
 * this lab enforces — with live numbers for the selected part's settings.
 * Opened from the Properties sheet ("Specs and limits") or the ⓘ in Parts.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getEntry } from '../../model/catalog'
import { specsFor } from '../../model/specs'
import { useStore } from '../../state/store'

type Target = { type: string; compId: string | null } | null
let setTarget: ((t: Target) => void) | null = null

/** open the Specs page for a part type, or for a placed part (its own settings) */
export function openSpecs(type: string, compId: string | null = null): void {
  setTarget?.({ type, compId })
}

export function SpecsHost() {
  const [target, set] = useState<Target>(null)
  const comp = useStore((s) => (target?.compId ? s.layout.components.find((c) => c.id === target.compId) ?? null : null))
  useEffect(() => {
    setTarget = set
    return () => {
      setTarget = null
    }
  }, [])
  useEffect(() => {
    if (!target) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        set(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [target])
  if (!target) return null
  const entry = getEntry(target.type)
  const specs = specsFor(target.type, comp)
  if (!entry || !specs) return null
  // portaled to <body> with a high layer so it sits over the Parts / Properties sheets
  return createPortal(
    <div className="lab-modal lab-specs-modal" role="dialog" aria-label={`${entry.label} specs`} data-specs-panel onClick={(e) => e.target === e.currentTarget && set(null)}>
      <div className="lab-modal-card lab-specs">
        <h2>
          {entry.label}
          {comp && <span className="lab-specs-id">{comp.id}</span>}
        </h2>
        <p className="lab-dim">{specs.part}. Typical datasheet values — a part from another maker can differ a little.</p>
        {specs.groups.map((g) => (
          <section key={g.name} className={`lab-specs-group is-${g.name.split(' ')[0].toLowerCase()}`}>
            <h3>{g.name}</h3>
            <table>
              <tbody>
                {g.rows.map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        {specs.tips.length > 0 && (
          <ul className="lab-specs-tips">
            {specs.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        <p className="lab-dim lab-specs-doc">{entry.doc}</p>
        <button type="button" className="lab-btn is-primary" onClick={() => set(null)}>
          Close
        </button>
      </div>
    </div>,
    document.body,
  )
}
