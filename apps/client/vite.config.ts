import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Relative base so the build works when served from a subpath (GitHub Pages project site)
  // while `vite dev` still serves at the root. Runtime asset URLs derive from BASE_URL (main.tsx).
  base: './',
  plugins: [
    preact(),
    {
      // Serves ./personal at /personal in dev only (never part of a build), for private assets.
      name: 'personal-assets',
      configureServer(server) {
        const root = fileURLToPath(new URL('./personal', import.meta.url));
        server.middlewares.use('/personal', (req, res, next) => {
          const file = normalize(
            join(root, decodeURIComponent((req.url ?? '/').split('?')[0] as string)),
          );
          if (!file.startsWith(root) || !existsSync(file) || extname(file) === '') return next();
          res.setHeader(
            'Content-Type',
            extname(file) === '.json' ? 'application/json' : 'image/png',
          );
          createReadStream(file).pipe(res);
        });
      },
    },
  ],
  server: { port: 5173 },
});
