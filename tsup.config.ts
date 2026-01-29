import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.tsx',
    'src/api/list.ts',
    'src/api/upload.ts',
    'src/api/delete.ts',
    'src/api/scan.ts',
    'src/api/sync.ts',
    'src/api/reprocess.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'next', 'sharp', '@aws-sdk/client-s3'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
