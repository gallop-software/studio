import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'server/index': 'src/server/index.ts',
  },
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: false, // Don't clean - Vite will add client files
  external: ['sharp', '@aws-sdk/client-s3', 'express'],
  platform: 'node',
  target: 'node18',
  banner: {
    js: '// @ts-nocheck',
  },
})
