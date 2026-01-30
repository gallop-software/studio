import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.tsx',
    'src/handlers/index.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'next', 'sharp', '@aws-sdk/client-s3', 'blurhash'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
    // Required for Emotion's css prop
    options.jsxImportSource = '@emotion/react'
  },
})
