// Dev proxy: forwards /api, /campaign, and /ws to the FastAPI backend.
import { copyFileSync, cpSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const here = path.dirname(fileURLToPath(import.meta.url))

// The notebook's sketch sheet runs Excalidraw (MIT), loaded only when the sheet opens.
// Excalidraw fetches its hand-drawn fonts at run time from window.EXCALIDRAW_ASSET_PATH
// (set in components/shared/sketch/loadSketchPad.js) and only falls back to a CDN when
// they are missing there. This copies the package's fonts into the build, under
// excalidraw/fonts (beside the licence, excalidraw/LICENSE.txt), so the site serves them
// itself.
function excalidrawAssets() {
  let outDir
  return {
    name: 'candela-excalidraw-assets',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    writeBundle() {
      const pkg = path.join(here, 'node_modules', '@excalidraw', 'excalidraw')
      const fonts = path.join(pkg, 'dist', 'prod', 'fonts')
      if (!existsSync(fonts)) {
        const seen = existsSync(path.join(pkg, 'dist')) ? readdirSync(path.join(pkg, 'dist')).join(', ') : 'no dist'
        throw new Error(`Excalidraw's fonts are not in ${fonts} (dist holds: ${seen})`)
      }
      cpSync(fonts, path.join(outDir, 'excalidraw', 'fonts'), { recursive: true })
      // The npm package (0.18.0) ships no licence file, so public/excalidraw/LICENSE.txt
      // carries the project's MIT notice; a package that brings its own replaces it.
      const licence = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'].map(f => path.join(pkg, f)).find(existsSync)
      if (licence) copyFileSync(licence, path.join(outDir, 'excalidraw', 'LICENSE.txt'))
    },
  }
}

export default defineConfig({
  plugins: [react(), excalidrawAssets()],
  // Excalidraw's build reads this to tell React from Preact
  define: {
    'process.env.IS_PREACT': JSON.stringify('false'),
  },
  resolve: {
    alias: {
      // Excalidraw's text-to-diagram dialog (never shown on the sketch sheet) brings all of
      // Mermaid, which the build cannot hold in memory: a small stand-in takes its place
      '@excalidraw/mermaid-to-excalidraw': path.join(here, 'src/components/shared/sketch/noMermaid.js'),
    },
  },
  // The build has to fit the heap .npmrc gives it, on the 1 GB machine that runs the site.
  // Rollup's cache (kept for watch mode, which a one-off build never uses) and gzipping every
  // chunk to report its size are memory it does not need: with both off it fits in 512 MB,
  // with both on it did not.
  build: {
    rollupOptions: { cache: false },
    reportCompressedSize: false,
  },
  server: {
    proxy: {
      // 1. Forward standard API database requests to the FastAPI backend
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      // 2. Forward campaign management routes (join, approve, roster)
      '/campaign': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      // 3. Forward persistent multiplayer WebSocket traffic to the FastAPI backend
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
