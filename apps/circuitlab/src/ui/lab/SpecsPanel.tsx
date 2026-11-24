/**
 * Specs page for a part: what it is modelled on, its maximum ratings
 * (voltage / current / power), working values, frequency range, and what
 * this lab enforces — with live numbers for the selected part's settings.
 * Opened from the Properties sheet ("Specs and limits") or the ⓘ in Parts.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getEntry } from '../../model/catalog'
import { specsFor } from '../../model/specs'
import { boardDef } from '../../model/boards'
import { PIN_KIND_STYLE, pinKind } from '../../model/pin-labels'
import { DIRECTION_RULES } from '../../sim/preflight'
import { PartPreview } from '../../three/part-preview'
import { KindLegend, PinoutDiagram } from './PinoutDiagram'

const PLACEMENT: Record<string, string> = {
  leads: 'plugs into the breadboard by its legs',
  probe: 'clips onto one breadboard hole',
  dip: 'a chip that straddles the breadboard’s middle channel',
  footprint: 'a board that plugs into the breadboard',
  offboard: 'sits on the bench; wire to its pins or terminals',
}

/** the turning 3D model of the part (its own small renderer while the page is open) */
function Preview({ type }: { type: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    let p: PartPreview | null = null
    try {
      p = new PartPreview(ref.current, type)
    } catch {
      /* no WebGL: the pinout still explains the part */
    }
    return () => p?.dispose()
  }, [type])
  return <canvas ref={ref} className="lab-detail-3d" aria-label="3D view — drag to turn it" />
}
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
        <p className="lab-dim">
          {specs.part} · {PLACEMENT[entry.placement] ?? entry.placement} · {entry.pins.length} {entry.pins.length === 1 ? 'pin' : 'pins'}
        </p>
        <div className="lab-detail-top">
          <figure>
            <Preview type={entry.type} />
            <figcaption>Drag to turn it · scroll to zoom</figcaption>
          </figure>
          <figure>
            <PinoutDiagram type={entry.type} />
            <KindLegend />
          </figure>
        </div>
        {DIRECTION_RULES[entry.type] && (
          <p className="lab-detail-rule">
            <b>How to connect it.</b> {DIRECTION_RULES[entry.type]}
          </p>
        )}
        <section className="lab-specs-group is-ports">
          <h3>Ports</h3>
          <div className="lab-ports">
            {entry.pins.map((pin, i) => {
              const k = pinKind(pin, boardDef(entry.type))
              return (
                <span key={`${pin}:${i}`} className="lab-port" title={PIN_KIND_STYLE[k].word}>
                  <i style={{ background: PIN_KIND_STYLE[k].fill }} />
                  {entry.placement === 'dip' && <em>{i + 1}</em>}
                  {pin}
                </span>
              )
            })}
          </div>
        </section>
        <section className="lab-specs-group is-features">
          <h3>What it does</h3>
          <p className="lab-detail-doc">{entry.doc}</p>
        </section>
        <p className="lab-dim">Specs: typical datasheet values — a part from another maker can differ a little.</p>
        {specs.groups.map((g) => (
          <section key={g.name} className={`lab-specs-group is-${g.name.split(' ')[0].toLowerCase()}`}>
            <h3>{g.name}</h3>
            <table>
              <tbody>
                {g.rows.map(([k, v], i) => (
                  <tr key={`${k}:${i}`}>
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
        <button type="button" className="lab-btn is-primary" onClick={() => set(null)}>
          Close
        </button>
      </div>
    </div>,
    document.body,
  )
}
