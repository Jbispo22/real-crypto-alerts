import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Garante caminhos relativos em vez de absolutos para o protocolo file:// do Electron
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets', // Organiza JS e CSS em uma subpasta limpa dentro de dist/
  },
})