import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the same build works unmodified both on GitHub Pages
  // (served from /slate/) and inside the Tauri desktop shell (served from
  // the app's own local root) — a hardcoded '/slate/' base would 404 every
  // asset in the desktop build, the same class of bug that broke the logo
  // path earlier.
  base: './',
  clearScreen: false,
  server: {
    strictPort: true,
  },
})
