import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    ssr: 'src/agents/canvas-transcriber.ts',
    outDir: 'dist-agent',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      external: [/^@livekit\//, /^@supabase\//],
      output: {
        entryFileNames: 'canvas-transcriber.js'
      }
    }
  }
})
