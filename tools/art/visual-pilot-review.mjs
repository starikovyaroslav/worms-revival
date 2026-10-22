/** Build an offline art-direction review; embed the actual game CRT, not an approximation. */
import { readFileSync, writeFileSync } from 'node:fs';
import { CRT_PRESETS } from '../../packages/render/src/crtPresets.ts';

const shader = readFileSync(new URL('../../packages/render/src/crt.ts', import.meta.url), 'utf8');
const fragment = shader.match(/const fragment = `([\s\S]*?)`;/)?.[1];
if (!fragment) throw new Error('Game CRT shader contract changed; update the pilot adapter');
const template = readFileSync(new URL('./visual-pilot-review.html', import.meta.url), 'utf8');
const html = template
  .replace('__GAME_FRAGMENT__', JSON.stringify(fragment))
  .replace('__GAME_PRESETS__', JSON.stringify(CRT_PRESETS))
  .replace(
    '__PILOT_IMAGE__',
    JSON.stringify(
      'data:image/png;base64,' +
        readFileSync(
          new URL('../../docs/design/concepts/visual-pilot-v2/meadow-pilot.png', import.meta.url),
        ).toString('base64'),
    ),
  )
  .replace(
    '__BEFORE_IMAGE__',
    JSON.stringify(
      'data:image/png;base64,' +
        readFileSync(
          new URL('../../docs/design/concepts/visual-pilot-v2/before.png', import.meta.url),
        ).toString('base64'),
    ),
  );
if (/__GAME_/.test(html)) throw new Error('Unresolved review template field');
writeFileSync(
  new URL('../../docs/design/concepts/visual-pilot-v2/review.html', import.meta.url),
  html,
);
console.log('Saved standalone visual-pilot-v2/review.html with the production CRT shader/presets');
