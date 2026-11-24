/** A small canvas plotter for the bench and lab graphs (linear or log x, markers, legends). */
import { mono, ui } from '../fonts'
export interface Series {
  label: string
  color: string
  points: { x: number; y: number }[]
  dashed?: boolean
  dots?: boolean
}
export interface PlotOpts {
  logX?: boolean
  xLabel?: string
  yLabel?: string
  markers?: { x: number; label: string; color?: string }[]
  hLines?: { y: number; label: string }[]
  yRange?: [number, number]
  xRange?: [number, number]
  bg?: string
}

const nice = (span: number) => {
  const p = 10 ** Math.floor(Math.log10(span || 1))
  const m = span / p
  return (m <= 2 ? 0.2 : m <= 5 ? 0.5 : 1) * p
}
export function fmt(v: number): string {
  const a = Math.abs(v)
  if (a === 0) return '0'
  if (a >= 1e6) return `${+(v / 1e6).toPrecision(3)}M`
  if (a >= 1e3) return `${+(v / 1e3).toPrecision(3)}k`
  if (a < 1e-3) return `${+(v * 1e6).toPrecision(3)}µ`
  if (a < 1) return `${+(v * 1e3).toPrecision(3)}m`
  return `${+v.toPrecision(3)}`
}

export function drawPlot(canvas: HTMLCanvasElement, series: Series[], o: PlotOpts = {}): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height
  ctx.fillStyle = o.bg ?? '#0b0e13'
  ctx.fillRect(0, 0, W, H)
  const pts = series.flatMap((s) => s.points).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && (!o.logX || p.x > 0))
  if (!pts.length) {
    ctx.fillStyle = '#6b7380'
    ctx.font = ui(500, 13)
    ctx.fillText('no data yet', W / 2 - 30, H / 2)
    return
  }
  const L = 52
  const R = 12
  const T = 14
  const B = 34
  const tx = (x: number) => (o.logX ? Math.log10(x) : x)
  let x0 = o.xRange ? tx(o.xRange[0]) : Math.min(...pts.map((p) => tx(p.x)))
  let x1 = o.xRange ? tx(o.xRange[1]) : Math.max(...pts.map((p) => tx(p.x)))
  let y0 = o.yRange?.[0] ?? Math.min(...pts.map((p) => p.y))
  let y1 = o.yRange?.[1] ?? Math.max(...pts.map((p) => p.y))
  if (x1 - x0 < 1e-12) x1 = x0 + 1
  if (y1 - y0 < 1e-12) {
    y0 -= 1
    y1 += 1
  }
  const pad = (y1 - y0) * 0.08
  if (!o.yRange) {
    y0 -= pad
    y1 += pad
  }
  const X = (x: number) => L + ((tx(x) - x0) / (x1 - x0)) * (W - L - R)
  const Y = (y: number) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B)
  ctx.strokeStyle = '#1e2530'
  ctx.fillStyle = '#8b94a3'
  ctx.font = mono(400, 11)
  ctx.lineWidth = 1
  // grid
  if (o.logX) {
    for (let d = Math.floor(x0); d <= Math.ceil(x1); d++) {
      for (let k = 1; k < 10; k++) {
        const v = k * 10 ** d
        if (Math.log10(v) < x0 || Math.log10(v) > x1) continue
        const x = X(v)
        ctx.globalAlpha = k === 1 ? 1 : 0.4
        ctx.beginPath()
        ctx.moveTo(x, T)
        ctx.lineTo(x, H - B)
        ctx.stroke()
        if (k === 1) ctx.fillText(fmt(v), x - 10, H - B + 14)
      }
    }
    ctx.globalAlpha = 1
  } else {
    const st = nice(x1 - x0)
    for (let v = Math.ceil(x0 / st) * st; v <= x1; v += st) {
      ctx.beginPath()
      ctx.moveTo(X(v), T)
      ctx.lineTo(X(v), H - B)
      ctx.stroke()
      ctx.fillText(fmt(v), X(v) - 10, H - B + 14)
    }
  }
  const sy = nice(y1 - y0)
  for (let v = Math.ceil(y0 / sy) * sy; v <= y1; v += sy) {
    ctx.beginPath()
    ctx.moveTo(L, Y(v))
    ctx.lineTo(W - R, Y(v))
    ctx.stroke()
    ctx.fillText(fmt(v), 6, Y(v) + 4)
  }
  if (o.xLabel) ctx.fillText(o.xLabel, W / 2 - 20, H - 6)
  if (o.yLabel) {
    ctx.save()
    ctx.translate(12, T + 40)
    ctx.fillText(o.yLabel, 0, 0)
    ctx.restore()
  }
  for (const h of o.hLines ?? []) {
    ctx.strokeStyle = '#ff9f0a'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(L, Y(h.y))
    ctx.lineTo(W - R, Y(h.y))
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#ff9f0a'
    ctx.fillText(h.label, W - R - 60, Y(h.y) - 4)
  }
  for (const m of o.markers ?? []) {
    if (!Number.isFinite(m.x)) continue
    ctx.strokeStyle = m.color ?? '#ff453a'
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(X(m.x), T)
    ctx.lineTo(X(m.x), H - B)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = m.color ?? '#ff453a'
    ctx.fillText(m.label, X(m.x) + 4, T + 12)
  }
  series.forEach((s, si) => {
    ctx.strokeStyle = s.color
    ctx.fillStyle = s.color
    ctx.lineWidth = 2
    ctx.setLineDash(s.dashed ? [6, 4] : [])
    ctx.beginPath()
    let pen = false
    for (const p of s.points) {
      if (!Number.isFinite(p.y) || (o.logX && p.x <= 0)) {
        pen = false
        continue
      }
      if (pen) ctx.lineTo(X(p.x), Y(p.y))
      else ctx.moveTo(X(p.x), Y(p.y))
      pen = true
    }
    if (!s.dots) ctx.stroke()
    ctx.setLineDash([])
    if (s.dots) for (const p of s.points) if (Number.isFinite(p.y)) ctx.fillRect(X(p.x) - 3, Y(p.y) - 3, 6, 6)
    ctx.fillText(s.label, L + 8 + si * 130, T + 12)
  })
}

/** download text or a data URL as a file */
export function download(name: string, data: string, type = 'text/csv'): void {
  const a = document.createElement('a')
  a.href = data.startsWith('data:') ? data : URL.createObjectURL(new Blob([data], { type }))
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
}
