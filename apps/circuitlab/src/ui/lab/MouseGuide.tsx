/**
 * Always-on mouse guide (desktop): which mouse button rotates, which moves
 * the view, and that the scroll wheel zooms — with a mouse drawn and the
 * button in question lit. It can be folded to a small mouse icon (remembered).
 */
import { useState } from 'react'

const KEY = 'circuitlab.mouseGuide.folded'

function Mouse({ lit }: { lit: 'left' | 'right' | 'wheel' }) {
  const on = '#0a84ff'
  return (
    <svg width="18" height="26" viewBox="0 0 18 26" aria-hidden="true">
      <rect x="1" y="1" width="16" height="24" rx="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {lit === 'left' && <path d="M9 1.8 V10 H1.8 V9 A7.2 7.2 0 0 1 9 1.8 Z" fill={on} />}
      {lit === 'right' && <path d="M9 1.8 V10 H16.2 V9 A7.2 7.2 0 0 0 9 1.8 Z" fill={on} />}
      <line x1="1.5" y1="10" x2="16.5" y2="10" stroke="currentColor" strokeWidth="1.2" />
      <line x1="9" y1="1.5" x2="9" y2="10" stroke="currentColor" strokeWidth="1.2" />
      <rect x="7.4" y="3.6" width="3.2" height="5" rx="1.6" fill={lit === 'wheel' ? on : 'currentColor'} opacity={lit === 'wheel' ? 1 : 0.55} />
    </svg>
  )
}

export function MouseGuide() {
  const [folded, setFolded] = useState(() => {
    try {
      return window.localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  const fine = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches
  if (!fine) return null
  const fold = (v: boolean) => {
    setFolded(v)
    try {
      window.localStorage.setItem(KEY, v ? '1' : '0')
    } catch {
      /* not remembered */
    }
  }
  if (folded) {
    return (
      <button type="button" className="lab-mouse is-folded" onClick={() => fold(false)} title="Show the mouse controls" aria-label="Show the mouse controls">
        <Mouse lit="left" />
      </button>
    )
  }
  return (
    <div className="lab-mouse" role="note" aria-label="Mouse controls" data-mouse-guide>
      <span className="lab-mouse-item">
        <Mouse lit="left" />
        <span>
          <b>Left-drag</b> rotate
        </span>
      </span>
      <span className="lab-mouse-item">
        <Mouse lit="right" />
        <span>
          <b>Right-drag</b> move
        </span>
      </span>
      <span className="lab-mouse-item">
        <Mouse lit="wheel" />
        <span>
          <b>Scroll</b> zoom
        </span>
      </span>
      <span className="lab-mouse-item lab-mouse-small">
        <b>Double-click</b> fit
      </span>
      <button type="button" className="lab-mouse-x" onClick={() => fold(true)} title="Hide" aria-label="Hide the mouse controls">
        ×
      </button>
    </div>
  )
}
