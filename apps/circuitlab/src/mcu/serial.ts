/**
 * Serial monitor plumbing: what each board prints (by component id), kept
 * outside React and the store so a chatty sketch never re-renders the app.
 * The code panel subscribes; the board chip appends. Typed lines go the other
 * way through the live board (store.ts → engine.chip(id)).
 */

const MAX_CHARS = 20000

interface Channel {
  text: string
  version: number
}

const channels = new Map<string, Channel>()
const listeners = new Set<(id: string) => void>()

function channel(id: string): Channel {
  let c = channels.get(id)
  if (!c) {
    c = { text: '', version: 0 }
    channels.set(id, c)
  }
  return c
}

export const serialBus = {
  write(id: string, text: string): void {
    if (!text) return
    const c = channel(id)
    c.text += text
    if (c.text.length > MAX_CHARS) c.text = c.text.slice(c.text.length - MAX_CHARS * 0.75)
    c.version++
    for (const l of listeners) l(id)
  },
  read(id: string): string {
    return channels.get(id)?.text ?? ''
  },
  version(id: string): number {
    return channels.get(id)?.version ?? 0
  },
  clear(id?: string): void {
    if (id) channels.delete(id)
    else channels.clear()
    for (const l of listeners) l(id ?? '')
  },
  subscribe(fn: (id: string) => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
