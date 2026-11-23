/**
 * Regenerate the compiled-mode test fixtures (tests/fixtures/*.hex) with the
 * same in-browser compiler the app loads from the CDN, run here in Node:
 *
 *   npm pack @horang-corp/avr-gcc-wasm@0.2.0 && tar xzf horang-corp-avr-gcc-wasm-0.2.0.tgz
 *   GCC_PKG=$PWD/package npx vite-node scripts/compile-fixtures.ts
 *
 * The package fetches its tools by URL; a small fetch shim serves them from disk.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { prepareSketch } from '../src/mcu/avr/compile'
import { BLINK_CODE, PRESETS } from '../src/lessons/presets'

const pkg = process.env.GCC_PKG
if (!pkg) throw new Error('set GCC_PKG to an unpacked @horang-corp/avr-gcc-wasm package')
const BASE = 'http://gcc.local/'
const realFetch = globalThis.fetch
globalThis.fetch = (async (u: string | URL, o?: RequestInit) => {
  const s = String(u)
  if (!s.startsWith(BASE)) return realFetch(u, o)
  try {
    const body = readFileSync(resolve(pkg, decodeURIComponent(s.slice(BASE.length))))
    return new Response(body, { status: 200, headers: { 'content-type': s.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' } })
  } catch {
    return new Response('not found', { status: 404 })
  }
}) as typeof fetch

const { buildFirmware } = await import(pathToFileURL(resolve(pkg, 'firmware-builder.js')).href)

const SKETCHES: Record<string, string> = {
  'blink-uno': BLINK_CODE,
  'inputs-uno': `void setup() {
  Serial.begin(9600);
  pinMode(2, INPUT_PULLUP);
  pinMode(9, OUTPUT);
  analogWrite(9, 64);
}
void loop() {
  int raw = analogRead(A0);
  Serial.print("A0=");
  Serial.print(raw);
  Serial.print(" D2=");
  Serial.println(digitalRead(2));
  delay(100);
}
`,
}

// every Uno lesson must also compile for a real ATmega328P
for (const p of PRESETS) {
  const u = p.layout.components.find((c) => c.type === 'arduino_uno')
  if (u && p.id !== 'blink') SKETCHES[`${p.id}-uno`] = String(u.params?.code)
}

for (const [name, src] of Object.entries(SKETCHES)) {
  const prep = prepareSketch(src)
  const r = await buildFirmware({ source: prep.code, sensors: prep.sensors, assetsBase: BASE })
  writeFileSync(resolve('tests/fixtures', `${name}.hex`), r.hex)
  console.log(name, r.flashBytes, 'bytes')
}
