// vite.config.js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
      // Removed the spark-md5 alias
    },
  },

  // Proactively define 'global' as 'window' 
  // to prevent PouchDB's inevitable ReferenceError
  define: {
    global: 'window',
  },
  // If you still see issues, add this specifically:
  optimizeDeps: {
    include: ['pouchdb/dist/pouchdb.js']
  }
});