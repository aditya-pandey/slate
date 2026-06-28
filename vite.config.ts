import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served at https://aditya-pandey.github.io/pdf-editor/ — assets must be
  // requested relative to that subpath, not the domain root.
  base: '/pdf-editor/',
})
