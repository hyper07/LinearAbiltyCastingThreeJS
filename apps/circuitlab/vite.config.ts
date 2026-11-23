import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const platformRoot = fileURLToPath(new URL('../../', import.meta.url))

// Circuit Lab is served by the platform at /circuitlab/ (dev: a nested Vite
// server from the root vite.config.js; build: dist/circuitlab). Relative asset
// paths keep the built files working under that folder.
export default defineConfig({
  base: './',
  plugins: [react()],
  // the platform's shared How-to-play panel, used as-is
  resolve: { alias: { '@platform/helpPanel': `${platformRoot}src/shared/helpPanel.js` } },
  server: { fs: { allow: [platformRoot] } },
  build: { chunkSizeWarningLimit: 2000, target: 'es2022' },
  test: { environment: 'node' },
} as Parameters<typeof defineConfig>[0])
