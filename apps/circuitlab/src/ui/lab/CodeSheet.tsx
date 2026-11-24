/**
 * The Code panel: the selected board's sketch, how it runs (Instant mode or
 * compiled for a real ATmega328P), Upload & Run, the line the program is on,
 * compile errors next to their lines, the board's pins, and the serial
 * monitor (output + a line to send).
 */
import { requestRun } from './PreflightPanel'
import { useEffect, useMemo, useRef, useState } from 'react'
import { liveEngine, useStore } from '../../state/store'
import { boardDef } from '../../model/boards'
import { getEntry } from '../../model/catalog'
import { compileSketch } from '../../mcu/avr/compile'
import { checkPython } from '../../mcu/python/runtime'
import { PYTHON_EXAMPLES } from '../../mcu/python/examples'
import { serialBus } from '../../mcu/serial'
import { liveBoard } from '../../mcu/board-chip'
import { Segmented, Sheet, showToast } from '../kit'
import './lab.css'

const SNAP = [0.55, 0.92] as const
const LINE_H = 19

export interface CodeSheetProps {
  open: boolean
  onDismiss: () => void
  desktop?: boolean
  /** errors from the last compile (set by the App's program preparer too) */
  errors: { board: string; line: number | null; message: string }[]
  setErrors: (e: { board: string; line: number | null; message: string }[]) => void
  status: string
  setStatus: (s: string) => void
}

function codeOf(comp: { type: string; params?: Record<string, unknown> }): string {
  const v = comp.params?.code
  if (typeof v === 'string') return v
  const def = getEntry(comp.type)?.params?.find((p) => p.key === 'code')?.default
  return typeof def === 'string' ? def : ''
}

export function CodeSheet({ open, onDismiss, desktop = false, errors, setErrors, status, setStatus }: CodeSheetProps) {
  const components = useStore((s) => s.layout.components)
  const boards = useMemo(() => components.filter((c) => boardDef(c.type)), [components])
  const [boardId, setBoardId] = useState<string | null>(null)
  const board = boards.find((b) => b.id === boardId) ?? boards[0] ?? null
  const def = board ? boardDef(board.type) : undefined
  const savedCode = board ? codeOf(board) : ''
  const runtime = String(board?.params?.runtime ?? def?.runtimes[0] ?? 'fast')
  const isPy = runtime === 'python'
  const [draft, setDraft] = useState(savedCode)
  const [snap, setSnap] = useState(0)
  const tele = useStore((s) => (board ? s.telemetry?.components[board.id]?.mcu : undefined))
  const running = useStore((s) => s.running)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [scroll, setScroll] = useState(0)

  // a different board / a loaded lesson brings its own sketch
  useEffect(() => {
    setDraft(savedCode)
  }, [board?.id, savedCode])
  useEffect(() => {
    if (open) setSnap(0)
  }, [open])

  const dirty = draft !== savedCode
  const lines = draft.split('\n')
  const myErrors = errors.filter((e) => e.board === board?.id)

  const upload = async () => {
    if (!board || !def) return
    const st = useStore.getState()
    setErrors([])
    if (dirty) st.setParam(board.id, 'code', draft)
    if (isPy) {
      const chk = checkPython(draft)
      if (!chk.ok) {
        setErrors([{ board: board.id, line: chk.line, message: chk.message }])
        setStatus('The program has a syntax error — fix the marked line')
        return
      }
      setStatus('Running Python')
    } else if (runtime === 'avr') {
      setStatus('Compiling…')
      const res = await compileSketch(board.type, draft, setStatus)
      if (!res.ok) {
        setErrors(res.errors.map((e) => ({ board: board.id, ...e })))
        setStatus('Compile failed')
        return
      }
      setStatus(`Compiled · ${res.flashBytes ?? '?'} bytes of 32 KB`)
    } else {
      setStatus('Running in Instant mode')
    }
    st.resetSim()
    serialBus.clear(board.id)
    requestRun()
  }

  const setRuntime = (v: string) => {
    if (!board) return
    useStore.getState().setParam(board.id, 'runtime', v)
    setStatus(v === 'avr' ? 'Compiled mode: the sketch is compiled to a real ATmega328P program' : 'Instant mode: the sketch runs straight away')
  }

  const curLine = running && (tele?.runtime === 'fast' || tele?.runtime === 'python') && tele.state === 'running' ? tele.line : undefined

  return (
    <Sheet
      open={open}
      onDismiss={onDismiss}
      snapPoints={SNAP}
      activeSnap={snap}
      onSnapChange={setSnap}
      desktop={desktop}
      anchor="right"
      ariaLabel="Code"
      className="lab-wide asm-sheet"
    >
      <div className="lab-code" data-code-panel>
        <div className="lab-head">
          <span className="lg-title">Code</span>
          {def && <span className="lab-badge">{def.short} · {def.logicV} V · {runtime === 'avr' ? 'chip: avr8js' : isPy ? 'code: Python' : 'code: Instant'}</span>}
        </div>
        {!board || !def ? (
          <div className="lab-empty">
            <p>No board on the bench yet.</p>
            <p className="lab-dim">Add an Arduino, an ESP32, a Raspberry Pi Pico or a Raspberry Pi (Python) from <b>Parts → Boards</b>, or start a lesson.</p>
          </div>
        ) : (
          <>
            {boards.length > 1 && (
              <Segmented value={board.id} onChange={(v) => setBoardId(v)} options={boards.map((b) => ({ value: b.id, label: `${b.id} · ${boardDef(b.type)?.short}` }))} aria-label="Board" />
            )}
            {isPy ? (
              <div className="lab-py-head">
                <div className="lab-dim">
                  Runs Python 3 ({def.python === 'beagle' ? 'Adafruit_BBIO' : 'gpiozero, RPi.GPIO'}, time, random, math) in simulated time — <code>sleep(1)</code> is one simulated second; <code>print()</code> shows in the serial monitor.
                </div>
                <select
                  className="lab-select"
                  aria-label="Example programs"
                  value=""
                  onChange={(e) => {
                    const ex = PYTHON_EXAMPLES.find((x) => x.id === e.target.value)
                    if (ex) setDraft(ex.code(def))
                  }}
                >
                  <option value="">Examples…</option>
                  {PYTHON_EXAMPLES.filter((x) => x.family === (def.python ?? 'pi')).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : def.runtimes.length === 1 ? (
              <div className="lab-dim">Runs your sketch in Instant mode (Arduino-style C++ in simulated time). A chip-level emulator for the {def.short} is on the roadmap.</div>
            ) : (
            <Segmented
              value={runtime}
              onChange={setRuntime}
              options={[
                { value: 'fast', label: 'Instant' },
                ...(def.runtimes.includes('avr') ? [{ value: 'avr', label: 'Compiled (ATmega328P)' }] : []),
              ]}
              aria-label="How the sketch runs"
            />
            )}
            <div className="lab-editor" style={{ ['--lh' as string]: `${LINE_H}px` }}>
              <div className="lab-gutter" aria-hidden="true" style={{ transform: `translateY(${-scroll}px)` }}>
                {lines.map((_, i) => (
                  <div key={i} className={`lab-ln ${curLine === i + 1 ? 'is-cur' : ''} ${myErrors.some((e) => e.line === i + 1) ? 'is-err' : ''}`}>
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="lab-text">
                {curLine !== undefined && <div className="lab-curline" style={{ top: (curLine - 1) * LINE_H - scroll + 8 }} />}
                {myErrors
                  .filter((e) => e.line)
                  .map((e, i) => (
                    <div key={i} className="lab-errline" style={{ top: ((e.line as number) - 1) * LINE_H - scroll + 8 }} />
                  ))}
                <textarea
                  ref={taRef}
                  className="lab-ta"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onScroll={(e) => setScroll((e.target as HTMLTextAreaElement).scrollTop)}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const ta = e.currentTarget
                      const a = ta.selectionStart
                      const next = draft.slice(0, a) + '  ' + draft.slice(ta.selectionEnd)
                      setDraft(next)
                      requestAnimationFrame(() => ta.setSelectionRange(a + 2, a + 2))
                    }
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void upload()
                  }}
                  aria-label={isPy ? 'Python program' : 'Sketch'}
                />
              </div>
            </div>
            <div className="lab-actions">
              <button type="button" className="lab-btn is-primary" data-upload onClick={() => void upload()}>
                {runtime === 'avr' ? 'Compile & run' : dirty ? 'Upload & run' : 'Run'}
              </button>
              <button type="button" className="lab-btn" onClick={() => (running ? useStore.getState().stopSim() : requestRun())}>
                {running ? 'Pause' : 'Resume'}
              </button>
              <button
                type="button"
                className="lab-btn"
                disabled={!dirty}
                onClick={() => {
                  setDraft(savedCode)
                  showToast('Changes discarded')
                }}
              >
                Revert
              </button>
            </div>
            {(status || tele?.error) && <div className={`lab-status ${tele?.state === 'error' ? 'is-err' : ''}`}>{tele?.state === 'error' ? tele.error : status}</div>}
            {myErrors.length > 0 && (
              <ul className="lab-errors">
                {myErrors.map((e, i) => (
                  <li key={i}>
                    {e.line ? <b>Line {e.line}: </b> : null}
                    {e.message}
                  </li>
                ))}
              </ul>
            )}
            {tele && tele.damage.length > 0 && (
              <ul className="lab-errors is-damage">
                {tele.damage.map((d, i) => (
                  <li key={i}>⚠ {d.reason}</li>
                ))}
              </ul>
            )}
            <PinStrip pins={tele?.pins ?? {}} />
            <SerialMonitor boardId={board.id} active={open} python={isPy} />
          </>
        )}
      </div>
    </Sheet>
  )
}

function PinStrip({ pins }: { pins: Record<string, string> }) {
  const entries = Object.entries(pins).filter(([p]) => p !== 'LED')
  if (!entries.length) return null
  return (
    <div className="lab-pins" aria-label="Pins in use">
      {entries.map(([p, s]) => (
        <span key={p} className={`lab-pin is-${s.toLowerCase()}`}>
          {p} <b>{s}</b>
        </span>
      ))}
    </div>
  )
}

function SerialMonitor({ boardId, active, python = false }: { boardId: string; active: boolean; python?: boolean }) {
  const [text, setText] = useState(() => serialBus.read(boardId))
  const [line, setLine] = useState('')
  const outRef = useRef<HTMLPreElement>(null)
  useEffect(() => {
    setText(serialBus.read(boardId))
    if (!active) return
    let raf = 0
    const unsub = serialBus.subscribe((id) => {
      if (id && id !== boardId) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setText(serialBus.read(boardId)))
    })
    return () => {
      unsub()
      cancelAnimationFrame(raf)
    }
  }, [boardId, active])
  useEffect(() => {
    const el = outRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [text])
  const send = () => {
    if (!line) return
    const b = liveBoard(boardId)
    if (!b || !liveEngine()) {
      showToast('Run the simulation first — then the board can read what you type')
      return
    }
    b.serialIn(line + '\n')
    setLine('')
  }
  return (
    <div className="lab-serial">
      <div className="lab-serial-head">
        <span>Serial monitor</span>
        <button type="button" className="lab-link" onClick={() => serialBus.clear(boardId)}>
          Clear
        </button>
      </div>
      <pre ref={outRef} className="lab-serial-out" data-serial-out>
        {text || (python ? 'print() output and error messages show up here.' : 'Serial.print() output shows up here.')}
      </pre>
      <div className="lab-serial-in">
        <input
          value={line}
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') send()
          }}
          placeholder={python ? 'Type a line for input()…' : 'Type a line for Serial.read()…'}
          aria-label="Send to the board"
        />
        <button type="button" className="lab-btn" onClick={send}>
          Send
        </button>
      </div>
    </div>
  )
}
