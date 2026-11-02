import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { localApiPlugin } from './server/vite-plugin.mjs'

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    host: true
  }
})
