import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Note: Removed vueDevTools import

export default defineConfig({
  plugins: [
    vue(),
    // Removed vueDevTools() - this removes bottom center icon
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5174,
  }
})