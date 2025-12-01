/* eslint-env node */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import commonjs from '@rollup/plugin-commonjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Force pre-bundling of some CommonJS deps that can cause runtime ESM/CJS
  // interop errors (like `semver` used by `web-solc`). This helps the dev
  // server serve ESM-compatible versions, and instructs Rollup to convert
  // CommonJS modules during the build.
  optimizeDeps: {
    include: ['web-solc', 'semver'],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    rollupOptions: {
      plugins: [commonjs()]
    }
  },
  // Define `process.env.NODE_ENV` at build time so existing client-side
  // code that uses `process.env.NODE_ENV` continues to work without
  // changing imports across the codebase.
  define: {
    'process.env.NODE_ENV': JSON.stringify((globalThis.process && globalThis.process.env && globalThis.process.env.NODE_ENV) || 'development')
  }
})
