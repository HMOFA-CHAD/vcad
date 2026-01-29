import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/index.js',
  external: [
    '@vcad/core',
    '@vcad/engine',
    '@vcad/ir',
    '@vcad/kernel-wasm',
    'react-devtools-core',
  ],
  banner: {
    js: '#!/usr/bin/env node',
  },
});

console.log('Build complete');
