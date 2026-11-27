/**
 * Circuit Lab chrome on top of ohmlet's: the top-right corner (Home, ?, Credits),
 * the platform's How-to-play panel (H, src/shared/helpPanel.js — the same panel
 * every game uses) and the Credits panel listing everything the lab is built on.
 */
import { useEffect, useRef } from 'react'
import { HelpPanel, helpButton } from '@platform/helpPanel'
import { CONTROLS } from './controls'
import { CREDITS } from './credits'
import './lab.css'

export const HELP_ID = 'circuitlab'

/** back to the platform: the host page when embedded, else the platform's home */
export function goHome(): void {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'circuitlab:close' }, window.location.origin)
    return
  }
  window.location.href = new URL('../', window.location.href).href
}

let panel: HelpPanel | null = null
export function helpPanel(): HelpPanel {
  panel ??= new HelpPanel({ host: document.body, id: HELP_ID, table: CONTROLS })
  return panel
}

export function LabCorner({ onCredits, onSaved, onInspect }: { onCredits: () => void; onSaved: () => void; onInspect?: () => void }) {
  const qRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = qRef.current
    if (!host) return
    const b = helpButton(host, () => helpPanel().toggle(), { style: 'position:static' })
    return () => b.remove()
  }, [])
  return (
    <div className="lab-corner">
      <button type="button" className="lab-corner-btn" data-home onClick={goHome} title="Back to home" aria-label="Back to home">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v9.5h13V10" />
        </svg>
        <span>Home</span>
      </button>
      <button type="button" className="lab-corner-btn" data-saved onClick={onSaved} title="Save this circuit under a name, or open a saved one (Ctrl+S)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 3h11l3 3v15H5z" />
          <path d="M8 3v6h8V3M8 21v-7h8v7" />
        </svg>
        <span>Save / Open</span>
      </button>
      {onInspect && (
        <button type="button" className="lab-corner-btn" data-inspect onClick={onInspect} title="Inspect a board: every chip and part on an ESP32, Arduino or Pico, what it does and how (I)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 5 5M8.5 11h5M11 8.5v5" />
          </svg>
          <span>Inspect board</span>
        </button>
      )}
      <div ref={qRef} className="lab-corner-q" />
      <button type="button" className="lab-corner-btn" data-credits onClick={onCredits} title="Credits and licences">
        <span>Credits</span>
      </button>
    </div>
  )
}

export function CreditsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
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
  if (!open) return null
  return (
    <div className="lab-modal" role="dialog" aria-label="Credits" data-credits-panel onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lab-modal-card">
        <h2>Credits</h2>
        <p className="lab-dim">Circuit Lab is built from open-source work. Thank you to everyone below.</p>
        <ul className="lab-credits">
          {CREDITS.map((c) => (
            <li key={c.name}>
              <a href={c.url} target="_blank" rel="noreferrer">
                {c.name}
              </a>
              <span className="lab-lic">{c.licence}</span>
              <span className="lab-dim">{c.what}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="lab-btn is-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

/** first visit: the How-to-play panel opens by itself (platform convention) */
let firstHelpShown = false
export function useFirstHelp(): void {
  useEffect(() => {
    // StrictMode mounts twice in dev: the first timer is cleared, the second one opens it
    const t = window.setTimeout(() => {
      if (firstHelpShown) return
      firstHelpShown = true
      helpPanel().openFirstTime()
    }, 400)
    return () => window.clearTimeout(t)
  }, [])
}
