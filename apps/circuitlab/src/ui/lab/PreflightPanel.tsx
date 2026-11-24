/**
 * "Check before you run": pressing Run first runs the circuit silently for a
 * moment. If a part would burn, faces the wrong way or is wired badly, this
 * panel explains it like a lesson — what is wrong, the rule for that part's
 * direction, the spec it breaks and a hint — with the answer hidden until the
 * student asks. They can fix it, or Run anyway to watch what happens.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CircuitLayout } from '../../model/types'
import { preflight, type PreflightItem } from '../../sim/preflight'
import { useStore } from '../../state/store'
import { showToast, tick } from '../kit'
import { openSpecs } from './SpecsPanel'

const OFF_KEY = 'circuitlab.checkBeforeRun.off'
let lastPassed: CircuitLayout | null = null
let show: ((items: PreflightItem[]) => void) | null = null
let focusPart: ((id: string) => void) | null = null

function checkOn(): boolean {
  try {
    return window.localStorage.getItem(OFF_KEY) !== '1'
  } catch {
    return true
  }
}

/**
 * Run, after a quick check. Resuming the same circuit (or one the student
 * chose to run anyway) skips the check; any edit checks again.
 */
export function requestRun(): void {
  const st = useStore.getState()
  if (st.running) return
  if (!checkOn() || st.layout === lastPassed || st.layout.components.length === 0) {
    st.startSim()
    return
  }
  const items = preflight(st.layout)
  const serious = items.filter((i) => i.kind !== 'near')
  if (serious.length === 0) {
    lastPassed = st.layout
    st.startSim()
    if (items.length) showToast(`${items[0].id} is close to its limit — it will run hot`, { duration: 3200 })
    return
  }
  tick()
  show?.(items)
}

const KIND: Record<PreflightItem['kind'], { tag: string; cls: string; icon: string }> = {
  burn: { tag: 'Would burn out', cls: 'is-broken', icon: '🔥' },
  direction: { tag: 'Wrong way round', cls: 'is-pin', icon: '↔' },
  wiring: { tag: 'Wiring', cls: 'is-other', icon: '⚡' },
  near: { tag: 'Close to its limit', cls: 'is-hot', icon: '♨' },
}

export function PreflightHost({ onShow }: { onShow: (id: string) => void }) {
  const [items, setItems] = useState<PreflightItem[] | null>(null)
  const [answers, setAnswers] = useState<Set<number>>(new Set())
  useEffect(() => {
    show = (it) => {
      setAnswers(new Set())
      setItems(it)
    }
    focusPart = onShow
    return () => {
      show = null
      focusPart = null
    }
  }, [onShow])
  useEffect(() => {
    if (!items) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setItems(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [items])
  if (!items || typeof document === 'undefined') return null
  const close = () => setItems(null)
  const runAnyway = () => {
    lastPassed = useStore.getState().layout
    setItems(null)
    useStore.getState().startSim()
  }
  const n = items.filter((i) => i.kind !== 'near').length
  return createPortal(
    <div className="lab-modal lab-specs-modal" role="dialog" aria-label="Check before you run" data-preflight onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="lab-modal-card lab-diag lab-preflight">
        <h2>Check before you run</h2>
        <p className="lab-dim">
          {n === 1 ? 'One thing' : `${n} things`} in this circuit would go wrong. Read the rule and the spec, then try to fix it yourself — the answer is there if you need it.
        </p>
        {items.map((it, i) => {
          const k = KIND[it.kind]
          return (
            <section key={`${it.id}:${i}`} className={`lab-diag-card ${k.cls}`}>
              <header>
                {it.id && <span className="lab-diag-id">{it.id}</span>}
                <span>{it.label}</span>
                <span className="lab-diag-tag">
                  {k.icon} {k.tag}
                </span>
              </header>
              <p className="lab-pre-title">{it.title}</p>
              {it.detail && <p className="lab-dim">{it.detail}</p>}
              {it.rule && (
                <p>
                  <b>Direction.</b> {it.rule}
                </p>
              )}
              {it.spec && (
                <p>
                  <b>Spec.</b> {it.spec}
                </p>
              )}
              <p>
                <b>Hint.</b> {it.hint}
              </p>
              {it.fix && answers.has(i) && (
                <p className="lab-pre-answer">
                  <b>Answer.</b> {it.fix}
                </p>
              )}
              <div className="lab-diag-actions">
                {it.id && (
                  <button type="button" className="lab-btn" onClick={() => { close(); focusPart?.(it.id) }}>
                    Show
                  </button>
                )}
                {it.id && (
                  <button type="button" className="lab-btn" onClick={() => openSpecs(useStore.getState().layout.components.find((c) => c.id === it.id)?.type ?? '', it.id)}>
                    Specs
                  </button>
                )}
                {it.fix && !answers.has(i) && (
                  <button type="button" className="lab-btn" onClick={() => setAnswers(new Set([...answers, i]))} data-answer>
                    Show the answer
                  </button>
                )}
              </div>
            </section>
          )
        })}
        <div className="lab-diag-foot">
          <label className="lab-pre-off">
            <input
              type="checkbox"
              defaultChecked={!checkOn()}
              onChange={(e) => {
                try {
                  window.localStorage.setItem(OFF_KEY, e.target.checked ? '1' : '0')
                } catch {
                  /* not remembered */
                }
              }}
            />
            Don’t check before running
          </label>
          <button type="button" className="lab-btn" onClick={runAnyway} data-run-anyway>
            Run anyway — see what happens
          </button>
          <button type="button" className="lab-btn is-primary" onClick={close}>
            I’ll fix it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
