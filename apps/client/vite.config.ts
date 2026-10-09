import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  // Relative base so the build works when served from a subpath (GitHub Pages project site)
  // while `vite dev` still serves at the root. Runtime asset URLs derive from BASE_URL (main.tsx).
  base: './',
  plugins: [preact()],
  server: { port: 5173 },
});
