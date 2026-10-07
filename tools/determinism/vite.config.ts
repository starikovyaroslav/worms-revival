import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    outDir: fileURLToPath(new URL('../../.determinism', import.meta.url)),
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./harness.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'harness',
    },
    minify: false,
  },
});
