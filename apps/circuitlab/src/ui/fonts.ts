/**
 * The lab's own type, all free (SIL Open Font Licence, bundled — no network):
 *  - Chakra Petch: square-cornered like PCB traces — the interface, headings
 *    and the silkscreen printed on parts and boards.
 *  - JetBrains Mono: values, pin names, code and the scope grid.
 *  - DSEG7 Classic: a real seven-segment LCD for meter and supply readouts.
 * Canvas textures (labels on parts) are drawn once, so `fontsReady()` is
 * awaited before the bench is built.
 */
import '@fontsource/chakra-petch/400.css'
import '@fontsource/chakra-petch/500.css'
import '@fontsource/chakra-petch/600.css'
import '@fontsource/chakra-petch/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/jetbrains-mono/700.css'
import lcdBold from 'dseg/fonts/DSEG7-Classic/DSEG7Classic-Bold.woff2?url'

export const UI_FONT = '"Chakra Petch", system-ui, sans-serif'
export const MONO_FONT = '"JetBrains Mono", ui-monospace, Menlo, monospace'
export const LCD_FONT = '"DSEG7 Classic", "JetBrains Mono", monospace'

/** a canvas font string in the UI face, e.g. ui(600, 40) */
export const ui = (weight: number | string, px: number): string => `${weight} ${px}px ${UI_FONT}`
export const mono = (weight: number | string, px: number): string => `${weight} ${px}px ${MONO_FONT}`
export const lcd = (px: number): string => `700 ${px}px ${LCD_FONT}`

let ready: Promise<void> | null = null

/** load every face the canvases use (at most ~1.5 s, then fall back quietly) */
export function fontsReady(): Promise<void> {
  if (ready) return ready
  if (typeof document === 'undefined' || !document.fonts) return (ready = Promise.resolve())
  try {
    document.fonts.add(new FontFace('DSEG7 Classic', `url(${lcdBold}) format("woff2")`, { weight: '700' }))
  } catch {
    /* FontFace unsupported: the LCD falls back to the mono face */
  }
  const faces = [ui(400, 16), ui(600, 16), ui(700, 16), mono(400, 16), mono(600, 16), mono(700, 16), lcd(16)]
  const load = Promise.all(faces.map((f) => document.fonts.load(f).catch(() => []))).then(() => undefined)
  return (ready = Promise.race([load, new Promise<void>((r) => setTimeout(r, 1500))]))
}

/**
 * A meter readout: the number in the seven-segment LCD face, its unit ("V",
 * "kHz", "mA") after it in the UI face (seven segments can't draw letters).
 * `x` is the right edge or the centre; draws with a left text align.
 */
export function drawReadout(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  px: number,
  align: 'right' | 'center' = 'center',
): void {
  const m = /^([-+]?[0-9.:\- ]*[0-9-])(.*)$/.exec(text)
  const num = m ? m[1] : ''
  const unit = m ? m[2] : text
  const unitFont = ui(700, Math.round(px * 0.6))
  g.font = lcd(px)
  const wn = g.measureText(num).width
  g.font = unitFont
  const wu = g.measureText(unit).width
  const left = align === 'right' ? x - wn - wu : x - (wn + wu) / 2
  g.textAlign = 'left'
  g.font = lcd(px)
  g.fillText(num, left, y)
  g.font = unitFont
  g.fillText(unit, left + wn, y + px * 0.12)
}
