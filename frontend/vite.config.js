// vite.config.js - Vite configuration file to set up development server and proxy for API and WebSocket requests
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 1. Forward standard API database requests to the FastAPI backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // 2. Forward persistent multiplayer WebSocket traffic to the FastAPI backend
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})