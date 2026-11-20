import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'libs/reader/src/index.ts' },
  format: ['esm'],
  dts: { compilerOptions: { composite: false } },
  tsconfig: 'libs/reader/tsconfig.lib.json',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  clean: true,
  outDir: 'dist',
});
