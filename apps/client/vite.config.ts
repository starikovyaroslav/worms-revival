import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  // Relative base so the build works when served from a subpath (GitHub Pages project site)
  // while `vite dev` still serves at the root. Runtime asset URLs derive from BASE_URL (main.tsx).
  base: './',
  plugins: [preact()],
  // Changes on every build; used as a cache-busting query for assets.
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  server: { port: 5173 },
});
