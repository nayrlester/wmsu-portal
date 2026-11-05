import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const webRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(webRoot, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5185,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3500',
        changeOrigin: true,
      },
    },
  },
})
