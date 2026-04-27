import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteSingleFile } from 'vite-plugin-singlefile'

const singleFile = process.env.SINGLE_FILE === '1'

export default defineConfig({
  base: singleFile ? './' : '/solar-simulator/',
  plugins: singleFile ? [react(), viteSingleFile()] : [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
