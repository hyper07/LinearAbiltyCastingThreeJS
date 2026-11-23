/**
 * Lessons: ready circuits (and sketches) to start from, like the reference
 * lab's lesson carousel and OpenCircuit's presets. The current lesson shows
 * what to notice and its live controls (a knob, a button, a sensor value).
 */
import { useEffect, useState } from 'react'
import { useStore } from '../../state/store'
import { PRESETS, presetById, type LessonControl } from '../../lessons/presets'
import { serialBus } from '../../mcu/serial'
import { Sheet, showToast, tick } from '../kit'
import './lab.css'

const SNAP = [0.5, 0.92] as const

export interface LessonsSheetProps {
  open: boolean
  onDismiss: () => void
  desktop?: boolean
  lessonId: string | null
  onLoad: (id: string) => void
}

/** load a lesson: its circuit, a fresh simulation, then run it */
export function loadLesson(id: string): boolean {
  const p = presetById(id)
  if (!p) return false
  const st = useStore.getState()
  st.resetSim()
  const res = st.loadLayout(p.layout)
  if (!res.ok) {
    showToast(`Could not load "${p.title}": ${res.errors[0] ?? 'invalid layout'}`)
    return false
  }
  serialBus.clear()
  useStore.getState().startSim()
  return true
}

export function LessonsSheet({ open, onDismiss, desktop = false, lessonId, onLoad }: LessonsSheetProps) {
  const [snap, setSnap] = useState(0)
  useEffect(() => {
    if (open) setSnap(0)
  }, [open])
  const current = lessonId ? presetById(lessonId) : undefined
  return (
    <Sheet open={open} onDismiss={onDismiss} snapPoints={SNAP} activeSnap={snap} onSnapChange={setSnap} desktop={desktop} anchor="right" ariaLabel="Lessons" className="lab-wide asm-sheet">
      <div className="lab-lessons" data-lessons>
        <div className="lab-head">
          <span className="lg-title">Lessons</span>
          <span className="lab-badge">{PRESETS.length} starters</span>
        </div>
        {current && (
          <div className="lab-current lg-card">
            <div className="lab-current-title">{current.title}</div>
            <ul className="lab-learn">
              {current.learn.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            {current.controls.map((c) => (
              <LessonControlRow key={`${c.part}:${c.key}`} c={c} />
            ))}
          </div>
        )}
        <div className="lab-cards">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`lab-card lg-card ${p.id === lessonId ? 'is-on' : ''}`}
              data-lesson={p.id}
              onClick={() => {
                tick()
                if (loadLesson(p.id)) onLoad(p.id)
              }}
            >
              <span className="lab-card-title">{p.title}</span>
              <span className="lab-card-board">{p.board ?? 'No microcontroller'}</span>
              <span className="lab-card-sum">{p.summary}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

export function LessonControlRow({ c }: { c: LessonControl }) {
  const value = useStore((s) => s.layout.components.find((x) => x.id === c.part)?.params?.[c.key])
  const set = (v: number | boolean) => useStore.getState().setParam(c.part, c.key, v)
  if (c.kind === 'button') {
    return (
      <div className="lab-ctl">
        <span>{c.label}</span>
        <button
          type="button"
          className={`lab-btn ${value === true ? 'is-primary' : ''}`}
          onPointerDown={() => set(true)}
          onPointerUp={() => set(false)}
          onPointerLeave={() => value === true && set(false)}
        >
          Hold to press
        </button>
      </div>
    )
  }
  const n = typeof value === 'number' ? value : Number(value ?? c.min ?? 0)
  return (
    <label className="lab-ctl">
      <span>
        {c.label} <b>{c.key === 'position' ? `${Math.round(n * 100)} %` : `${n}${c.unit ? ` ${c.unit}` : ''}`}</b>
      </span>
      <input type="range" min={c.min} max={c.max} step={c.step} value={n} onChange={(e) => set(Number(e.target.value))} />
    </label>
  )
}
