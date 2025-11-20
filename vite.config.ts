import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'playwright-core': path.resolve(__dirname, './src/shims/playwright-core.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['playwright-core'],
  },
  build: {
    rollupOptions: {
      external: ['playwright-core'],
    },
  },
})
