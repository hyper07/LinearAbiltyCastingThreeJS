/**
 * Instrument readings the lab table can take with "Use reading": the bench
 * panels publish their latest measurements here (scope.ch2.rise, bode.f0 …);
 * DMM and supply readings come straight from the live telemetry.
 */
import { useStore } from '../state/store'

const values = new Map<string, number>()
const images = new Map<string, string>()
const listeners = new Set<() => void>()

export const benchReadings = {
  set(key: string, v: number | null | undefined): void {
    if (v === null || v === undefined || !Number.isFinite(v)) values.delete(key)
    else values.set(key, v)
    for (const l of listeners) l()
  },
  setImage(key: string, dataUrl: string): void {
    images.set(key, dataUrl)
  },
  images(): Map<string, string> {
    return images
  },
  get(key: string): number | undefined {
    return values.get(key)
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

/** the present value of a table source, or undefined when the instrument has none */
export function readSource(key: string): number | undefined {
  const st = useStore.getState()
  const tele = st.telemetry?.components ?? {}
  if (key === 'dmm' || key.startsWith('dmm:')) {
    const id = key.slice(4) || st.layout.components.find((c) => c.type === 'multimeter')?.id
    const v = id ? tele[id]?.value : undefined
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined
  }
  if (key === 'probe') {
    const lp = st.layout.components.find((c) => c.type === 'logic_probe')
    const r = lp ? tele[lp.id]?.reading : undefined
    return r === 'HIGH' ? 1 : r === 'LOW' ? 0 : undefined
  }
  if (key.startsWith('supply.')) {
    const ps = st.layout.components.find((c) => c.type === 'bench_supply')
    const v = ps ? tele[ps.id]?.extra?.[key.slice(7)] : undefined
    return typeof v === 'number' ? v : undefined
  }
  return values.get(key)
}

/** a short human name for a source key */
export function sourceName(key: string): string {
  if (key.startsWith('dmm:')) return `DMM ${key.slice(4)}`
  if (key === 'dmm') return 'DMM'
  const [inst, ...rest] = key.split('.')
  return `${inst[0].toUpperCase()}${inst.slice(1)} ${rest.join(' ')}`
}
