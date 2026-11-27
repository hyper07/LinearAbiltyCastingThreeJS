/**
 * Inspect board: a full-screen teardown of one microcontroller board. Hover a part
 * for its name and a one-liner, click it for the detail panel (role on this board,
 * specs, nets, how it works, facts), pull it out of the board, explode the whole
 * board, flip it, peel the layers, light up pin groups, and follow nets in the
 * synced schematic. Data: knowledge/circuit-boards.json (loaded on open).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { InspectScene, type Layers, type PartsLayer } from './inspect-scene'
import {
  findBoard,
  groupAnchor,
  loadBoards,
  netColor,
  netsOfPart,
  pinsOfGroup,
  resolvePart,
  schematicLayout,
  type BoardData,
  type BoardsDoc,
  type ResolvedPart,
} from './boards'
import './inspect.css'

export interface InspectBoardProps {
  /** a board id from circuit-boards.json or a Circuit Lab board type */
  initialBoard: string | null
  onClose: () => void
}

const PARTS_CYCLE: PartsLayer[] = ['solid', 'ghost', 'hidden']

export default function InspectBoard({ initialBoard, onClose }: InspectBoardProps) {
  const [doc, setDoc] = useState<BoardsDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [boardId, setBoardId] = useState<string | null>(initialBoard)
  const [selected, setSelected] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [pulled, setPulled] = useState(false)
  const [exploded, setExploded] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [layers, setLayers] = useState<Layers>({ silk: true, copper: false, parts: 'solid' })
  const [net, setNet] = useState<string | null>(null)
  const [shown, setShown] = useState<string[]>([])
  const [focusGroup, setFocusGroup] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [schOpen, setSchOpen] = useState(true)

  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<InspectScene | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const pulledLabelRef = useRef<HTMLDivElement>(null)
  const calloutRefs = useRef(new Map<string, HTMLDivElement>())
  const leaderRefs = useRef(new Map<string, SVGLineElement>())
  const dotRefs = useRef(new Map<string, SVGCircleElement>())
  const hoverRef = useRef<string | null>(null)

  useEffect(() => {
    let live = true
    loadBoards()
      .then((d) => live && setDoc(d))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      live = false
    }
  }, [])

  const board: BoardData | null = useMemo(() => (doc ? findBoard(doc, boardId) : null), [doc, boardId])
  const resolved = useMemo(() => {
    const m = new Map<string, ResolvedPart>()
    if (doc && board) for (const p of board.parts) m.set(p.ref, resolvePart(doc, p))
    return m
  }, [doc, board])
  const sel = selected ? resolved.get(selected) ?? null : null
  const hov = hover ? resolved.get(hover) ?? null : null

  // refs the frame callback reads without re-subscribing
  const live = useRef({ board, shown, selected, pulled, exploded })
  live.current = { board, shown, selected, pulled, exploded }

  const placeOverlays = useCallback(() => {
    const s = sceneRef.current
    const st = live.current
    if (!s || !st.board) return
    const centre = s.boardCentre()
    for (const g of st.board.pinGroups) {
      const el = calloutRefs.current.get(g.id)
      const line = leaderRefs.current.get(g.id)
      const dot = dotRefs.current.get(g.id)
      if (!el) continue
      const a = groupAnchor(st.board, g)
      const p = s.projectBoardPoint(a.x, a.y)
      if (!p || !centre) {
        el.style.opacity = '0'
        continue
      }
      // push the pill away from the board centre so it sits off the board, like a label on a drawing
      const dx = p.x - centre.x
      const dy = p.y - centre.y
      const len = Math.hypot(dx, dy) || 1
      const px = p.x + (dx / len) * 64
      const py = p.y + (dy / len) * 64
      el.style.opacity = '1'
      el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`
      line?.setAttribute('x1', String(p.x))
      line?.setAttribute('y1', String(p.y))
      line?.setAttribute('x2', String(px))
      line?.setAttribute('y2', String(py))
      dot?.setAttribute('cx', String(p.x))
      dot?.setAttribute('cy', String(p.y))
    }
    const pl = pulledLabelRef.current
    if (pl) {
      const p = st.selected && (st.pulled || st.exploded) ? s.projectPart(st.selected) : null
      pl.style.opacity = p ? '1' : '0'
      if (p) pl.style.transform = `translate(${p.x}px, ${p.y - 18}px) translate(-50%, -100%)`
    }
  }, [])

  // the scene lives as long as the overlay
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const s = new InspectScene(host, {
      onHover: (ref, cx, cy) => {
        if (hoverRef.current !== ref) {
          hoverRef.current = ref
          setHover(ref)
        }
        const card = cardRef.current
        if (card && ref) {
          const r = host.getBoundingClientRect()
          const x = Math.min(cx - r.left + 18, r.width - 300)
          const y = Math.min(cy - r.top + 18, r.height - 120)
          card.style.transform = `translate(${x}px, ${y}px)`
        }
      },
      onPick: (ref) => {
        // a new pick puts the previously pulled part back
        setSelected(ref)
        setPulled(false)
      },
      onFrame: placeOverlays,
    })
    sceneRef.current = s
    return () => {
      s.dispose()
      sceneRef.current = null
    }
  }, [placeOverlays])

  // board change: rebuild and reset the teardown state
  useEffect(() => {
    if (!board || !sceneRef.current) return
    sceneRef.current.setBoard(board)
    setSelected(null)
    setPulled(false)
    setExploded(false)
    setFlipped(false)
    setNet(null)
    setFocusGroup(null)
    setShown(board.callouts)
  }, [board])

  useEffect(() => sceneRef.current?.setSelected(selected), [selected, board])
  useEffect(() => sceneRef.current?.setHighlightNet(net), [net, board])
  useEffect(() => sceneRef.current?.setLayers(layers), [layers, board])
  useEffect(() => sceneRef.current?.setFlipped(flipped), [flipped, board])
  useEffect(() => sceneRef.current?.pullOut(pulled ? selected : null, exploded), [pulled, exploded, selected, board])
  // new callout elements need one frame to find their place
  useEffect(() => sceneRef.current?.invalidate(), [shown, focusGroup, selected, pulled, exploded])
  useEffect(() => {
    const g = board?.pinGroups.find((x) => x.id === focusGroup)
    sceneRef.current?.setPinHighlight(g && board ? pinsOfGroup(board, g).map((p) => p.id) : [], g?.color ?? null)
  }, [focusGroup, board])

  // keys: captured so the lab underneath does not react (H still opens How to play)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return
      if (e.code === 'KeyH' || e.metaKey || e.ctrlKey) return
      e.stopPropagation()
      if (e.code === 'Escape') {
        e.preventDefault()
        if (pulled) setPulled(false)
        else if (selected || net || focusGroup) {
          setSelected(null)
          setNet(null)
          setFocusGroup(null)
        } else onClose()
      } else if (e.code === 'KeyP' && selected) setPulled((v) => !v)
      else if (e.code === 'KeyX') setExploded((v) => !v)
      else if (e.code === 'KeyF') setFlipped((v) => !v)
      else if (e.code === 'KeyQ') sceneRef.current?.orbit(0.26)
      else if (e.code === 'KeyE') sceneRef.current?.orbit(-0.26)
      else if (e.code === 'KeyR') sceneRef.current?.resetView()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [pulled, selected, net, focusGroup, onClose])

  const select = (ref: string | null) => {
    setSelected(ref)
    if (!ref) setPulled(false)
  }

  const toggleGroup = (id: string) => setShown((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const sch = useMemo(() => (board ? schematicLayout(board) : null), [board])
  const netKind = (n: string) => board?.nets.find((x) => x.name === n)?.kind ?? 'signal'
  const selNets = sel ? netsOfPart(sel) : []

  return (
    <div className="ib-root" role="dialog" aria-label="Inspect board" data-inspect-board={board?.id ?? ''}>
      <div ref={hostRef} className="ib-canvas" />

      {/* pin-group callouts: a dot on the header, a dotted leader, a pill like a label on a drawing */}
      <svg className="ib-leaders" aria-hidden="true">
        {board?.pinGroups
          .filter((g) => shown.includes(g.id))
          .map((g) => (
            <g key={g.id}>
              <line
                ref={(el) => {
                  if (el) leaderRefs.current.set(g.id, el)
                  else leaderRefs.current.delete(g.id)
                }}
                stroke={g.color}
              />
              <circle
                ref={(el) => {
                  if (el) dotRefs.current.set(g.id, el)
                  else dotRefs.current.delete(g.id)
                }}
                r="7"
                fill="#fffdf8"
                stroke={g.color}
                strokeWidth="3"
              />
            </g>
          ))}
      </svg>
      {board?.pinGroups
        .filter((g) => shown.includes(g.id))
        .map((g) => (
          <div
            key={g.id}
            ref={(el) => {
              if (el) calloutRefs.current.set(g.id, el)
              else calloutRefs.current.delete(g.id)
            }}
            className={`ib-callout${focusGroup === g.id ? ' is-on' : ''}`}
            data-group={g.id}
            onClick={() => setFocusGroup((f) => (f === g.id ? null : g.id))}
          >
            <i style={{ background: g.color }} />
            {g.label}
          </div>
        ))}

      {/* hover card */}
      <div ref={cardRef} className={`ib-hover${hov && hov.ref !== selected ? ' is-on' : ''}`} aria-hidden={!hov}>
        {hov && (
          <>
            <b>{hov.name}</b>
            <span>{hov.kid}</span>
          </>
        )}
      </div>

      <div ref={pulledLabelRef} className="ib-pulled">
        {sel && (
          <>
            <b>{sel.ref}</b> {sel.name}
          </>
        )}
      </div>

      {/* top bar */}
      <div className="ib-top">
        <div className="ib-title">
          <span className="ib-eyebrow">Inspect board</span>
          {doc && (
            <select value={board?.id ?? ''} onChange={(e) => setBoardId(e.target.value)} aria-label="Board">
              {doc.boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          {board && (
            <button type="button" className={`ib-chip${board.positions === 'estimated' ? ' is-est' : ''}`} onClick={() => setAboutOpen((v) => !v)} title="About this board, its sources and licences">
              {board.positions === 'design-file' ? 'From the design file' : 'Positions estimated'} · Sources
            </button>
          )}
        </div>
        <div className="ib-tools">
          <button type="button" className={pulled ? 'is-on' : ''} disabled={!selected} onClick={() => setPulled((v) => !v)} title="Pull the selected part out of the board (P)">
            {pulled ? 'Put back' : 'Pull out'}
          </button>
          <button type="button" className={exploded ? 'is-on' : ''} onClick={() => setExploded((v) => !v)} title="Lift every part off the board (X)">
            Explode
          </button>
          <button type="button" className={flipped ? 'is-on' : ''} onClick={() => setFlipped((v) => !v)} title="Turn the board over (F)">
            Flip
          </button>
          <span className="ib-sep" />
          <button type="button" className={layers.silk ? 'is-on' : ''} onClick={() => setLayers((l) => ({ ...l, silk: !l.silk }))} title="Silkscreen: the white printing">
            Silkscreen
          </button>
          <button type="button" className={layers.copper ? 'is-on' : ''} onClick={() => setLayers((l) => ({ ...l, copper: !l.copper }))} title="Copper: every net drawn as a link (not the real traces)">
            Copper
          </button>
          <button
            type="button"
            className={layers.parts !== 'solid' ? 'is-on' : ''}
            onClick={() => setLayers((l) => ({ ...l, parts: PARTS_CYCLE[(PARTS_CYCLE.indexOf(l.parts) + 1) % 3] }))}
            title="Parts: solid → x-ray → hidden"
          >
            Parts: {layers.parts === 'solid' ? 'solid' : layers.parts === 'ghost' ? 'x-ray' : 'off'}
          </button>
          <span className="ib-sep" />
          <button type="button" onClick={() => sceneRef.current?.resetView()} title="Reset the view (R)">
            ⤢
          </button>
          <button type="button" className="ib-close" onClick={onClose} title="Back to the lab (Esc)">
            Close
          </button>
        </div>
      </div>

      {error && <div className="ib-msg">Could not load the board data: {error}</div>}
      {!doc && !error && <div className="ib-msg">Loading boards…</div>}

      {/* about this board */}
      {board && aboutOpen && (
        <div className="ib-about">
          <h3>{board.name}</h3>
          <p>{board.summary}</p>
          <p className="ib-dim">{board.positionsNote}</p>
          {board.facts && board.facts.length > 0 && (
            <ul>
              {board.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          <h4>Sources</h4>
          <ul className="ib-sources">
            {board.sources.map((s) => (
              <li key={s.title}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
                <span className="ib-dim"> — {s.licence}. {s.used}.</span>
              </li>
            ))}
          </ul>
          <p className="ib-dim">{board.licence}</p>
        </div>
      )}

      {/* parts list + pin groups */}
      {board && (
        <div className="ib-left">
          <button type="button" className="ib-listbtn" onClick={() => setListOpen((v) => !v)}>
            Parts ({board.parts.length}) {listOpen ? '▾' : '▸'}
          </button>
          {listOpen && (
            <ul className="ib-list">
              {board.parts.map((p) => (
                <li key={p.ref}>
                  <button type="button" className={p.ref === selected ? 'is-on' : ''} onClick={() => select(p.ref)} data-ref={p.ref}>
                    <code>{p.ref}</code> {p.name}
                    {p.fitted === false && <em> (not fitted)</em>}
                    {p.side === 'bottom' && <em> (underside)</em>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="ib-groups">
            {board.pinGroups.map((g) => (
              <button key={g.id} type="button" className={shown.includes(g.id) ? 'is-on' : ''} onClick={() => toggleGroup(g.id)} title={g.note}>
                <i style={{ background: g.color }} />
                {g.label}
              </button>
            ))}
          </div>
          {focusGroup &&
            (() => {
              const g = board.pinGroups.find((x) => x.id === focusGroup)
              if (!g) return null
              return (
                <div className="ib-groupnote" style={{ borderColor: g.color }}>
                  <b>{g.label}</b>
                  <span>{g.note}</span>
                  {g.warning && <span className="ib-warn">⚠ {g.warning}</span>}
                  <span className="ib-dim">{[...new Set(g.pins)].join(' · ')}</span>
                </div>
              )
            })()}
        </div>
      )}

      {/* detail panel */}
      {sel && (
        <aside className="ib-detail" data-detail={sel.ref}>
          <div className="ib-detail-head">
            <div>
              <span className="ib-eyebrow">
                {sel.ref} · {sel.kindLabel}
                {sel.side === 'bottom' ? ' · underside' : ''}
              </span>
              <h2>{sel.name}</h2>
              {sel.marking && <code className="ib-marking">{sel.marking}</code>}
            </div>
            <button type="button" className="ib-x" onClick={() => select(null)} aria-label="Close details">
              ×
            </button>
          </div>
          <p className="ib-kid">{sel.kid}</p>
          <h4>On this board</h4>
          <p>{sel.role}</p>
          {sel.note && <p className="ib-dim">Note: {sel.note}</p>}
          <h4>Specs</h4>
          <table className="ib-specs">
            <tbody>
              {Object.entries(sel.specs).map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
              {sel.package && !sel.specs.Package && (
                <tr>
                  <th>Package</th>
                  <td>{sel.package}</td>
                </tr>
              )}
            </tbody>
          </table>
          {selNets.length > 0 && (
            <>
              <h4>Connected to</h4>
              <div className="ib-nets">
                {selNets.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={net === n ? 'is-on' : ''}
                    style={{ '--net': netColor(n, netKind(n)) } as CSSProperties}
                    onClick={() => setNet((x) => (x === n ? null : n))}
                    title={board?.nets.find((x) => x.name === n)?.about ?? 'Show every part on this net'}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </>
          )}
          <h4>How it works</h4>
          <p>{sel.deep}</p>
          {sel.facts.length > 0 && (
            <>
              <h4>Did you know?</h4>
              <ul>
                {sel.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          )}
          {sel.misconceptions.length > 0 && (
            <>
              <h4>Common mix-ups</h4>
              <ul>
                {sel.misconceptions.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          )}
          <div className="ib-detail-foot">
            {sel.fitted !== false && (
              <button type="button" className={`ib-btn${pulled ? ' is-on' : ''}`} onClick={() => setPulled((v) => !v)}>
                {pulled ? 'Put it back' : 'Pull it out'}
              </button>
            )}
            {sel.datasheet &&
              (sel.datasheet.url ? (
                <a href={sel.datasheet.url} target="_blank" rel="noreferrer">
                  {sel.datasheet.title}
                </a>
              ) : (
                <span className="ib-dim">{sel.datasheet.title}</span>
              ))}
          </div>
        </aside>
      )}

      {/* schematic, synced both ways */}
      {board && sch && (
        <div className={`ib-sch${schOpen ? '' : ' is-closed'}`}>
          <button type="button" className="ib-sch-head" onClick={() => setSchOpen((v) => !v)}>
            <span>⁄⁄ Schematic</span>
            <span className="ib-dim">{net ? `net ${net}` : sel ? sel.ref : `${sch.rails.length} nets · ${sch.columns.length} parts`}</span>
          </button>
          {schOpen && (
            <div className="ib-sch-body">
              <svg width={sch.width} height={sch.height} viewBox={`0 0 ${sch.width} ${sch.height}`} role="img" aria-label="Schematic: nets as rails, parts as columns">
                {sch.rails.map((r) => {
                  const lit = net === r.net || selNets.includes(r.net)
                  const col = netColor(r.net, r.kind)
                  return (
                    <g key={r.net} className="ib-rail" onClick={() => setNet((x) => (x === r.net ? null : r.net))}>
                      <rect x={0} y={r.y - 6} width={sch.width} height={12} fill="transparent" />
                      <text x={sch.left - 6} y={r.y + 3} textAnchor="end" className={lit ? 'is-lit' : ''}>
                        {r.net.length > 11 ? `${r.net.slice(0, 10)}…` : r.net}
                      </text>
                      <line x1={sch.left} x2={sch.width - 8} y1={r.y} y2={r.y} stroke={col} strokeWidth={lit ? 2.6 : 1.1} opacity={net && !lit ? 0.25 : lit ? 1 : 0.7} />
                    </g>
                  )
                })}
                {sch.columns.map((c) => {
                  const on = c.ref === selected
                  const onNet = net ? c.nets.includes(net) : false
                  const ys = c.nets.map((n) => sch.rails.find((r) => r.net === n)!.y)
                  const yMax = ys.length ? Math.max(...ys) : sch.top
                  return (
                    <g key={c.ref} className={`ib-col${on ? ' is-on' : ''}${onNet ? ' is-net' : ''}`} onClick={() => select(c.ref)}>
                      <rect x={c.x - 10} y={0} width={20} height={sch.height} fill="transparent" />
                      <text x={c.x} y={12} textAnchor="middle" className="ib-col-ref">
                        {c.ref.length > 5 ? c.ref.slice(0, 5) : c.ref}
                      </text>
                      <Symbol kind={c.symbol} x={c.x} y={22} on={on || onNet} />
                      <line x1={c.x} x2={c.x} y1={30} y2={yMax} className="ib-stub" />
                      {c.nets.map((n) => {
                        const y = sch.rails.find((r) => r.net === n)!.y
                        return <circle key={n} cx={c.x} cy={y} r={on || net === n ? 3.2 : 2.2} fill={netColor(n, netKind(n))} />
                      })}
                    </g>
                  )
                })}
              </svg>
            </div>
          )}
        </div>
      )}

      <div className="ib-hint">Hover a part · click for details · left-drag to turn · right-drag to move · scroll to zoom · P pull out · X explode · F flip · Esc back</div>
    </div>
  )
}

function Symbol({ kind, x, y, on }: { kind: string; x: number; y: number; on: boolean }) {
  const s = on ? '#3b74d8' : '#2b2433'
  const common = { stroke: s, strokeWidth: 1.4, fill: 'none' }
  switch (kind) {
    case 'res':
      return <path d={`M${x - 7} ${y} l2 -3 l3 6 l3 -6 l3 6 l2 -3`} {...common} />
    case 'cap':
      return <path d={`M${x - 2} ${y - 5} v10 M${x + 2} ${y - 5} v10`} {...common} />
    case 'led':
    case 'diode':
      return (
        <g>
          <path d={`M${x - 5} ${y - 4} l8 4 l-8 4 z M${x + 3} ${y - 4} v8`} {...common} />
          {kind === 'led' && <path d={`M${x} ${y - 6} l3 -3 M${x + 3} ${y - 5} l3 -3`} {...common} />}
        </g>
      )
    case 'xtal':
      return <path d={`M${x - 6} ${y - 4} v8 M${x + 6} ${y - 4} v8 M${x - 3} ${y - 5} h6 v10 h-6 z`} {...common} />
    case 'switch':
      return <path d={`M${x - 7} ${y + 2} h3 l7 -5 M${x + 3} ${y + 2} h4`} {...common} />
    case 'coil':
      return <path d={`M${x - 7} ${y} a2 2 0 0 1 4 0 a2 2 0 0 1 4 0 a2 2 0 0 1 4 0`} {...common} />
    case 'fet':
      return <path d={`M${x - 6} ${y} h4 M${x - 2} ${y - 5} v10 M${x + 1} ${y - 5} v10 M${x + 1} ${y - 3} h5 M${x + 1} ${y + 3} h5`} {...common} />
    case 'conn':
      return <path d={`M${x - 5} ${y - 5} h10 v10 h-10 z M${x - 2} ${y - 2} h4 v4 h-4 z`} {...common} />
    default:
      return <rect x={x - 7} y={y - 6} width={14} height={12} rx={1.5} {...common} fill={on ? '#e6eefc' : '#fffdf8'} />
  }
}
