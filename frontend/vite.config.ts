/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const railsUrl = process.env.RAILS_URL ?? 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // Same-origin in development too: the browser talks only to Vite,
    // which forwards API calls to Rails, so session cookies just work.
    // changeOrigin stays false: Rails must see the browser's Host (localhost:5173),
    // or its CSRF origin check rejects every POST, since the Origin header won't match.
    proxy: {
      '/api': { target: railsUrl, changeOrigin: false },
      '/up': { target: railsUrl, changeOrigin: false },
    },
  },
  build: {
    // Rails serves the compiled app from its public/ directory (single deploy).
    // Rails keeps its own files there (404.html, robots.txt…), so we don't wipe it;
    // `prebuild` removes only our previous output.
    outDir: '../public',
    emptyOutDir: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
