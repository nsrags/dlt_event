/* eslint-env node */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'; 

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Define `process.env.NODE_ENV` at build time so existing client-side
  // code that uses `process.env.NODE_ENV` continues to work without
  // changing imports across the codebase.
  define: {
  'process.env.NODE_ENV': JSON.stringify((globalThis.process && globalThis.process.env && globalThis.process.env.NODE_ENV) || 'development'),
  },
})
