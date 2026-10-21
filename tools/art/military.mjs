import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { root, readImage, resizeNearest, reduce, cut, validate, writeImage } from './ingest.mjs';
import { normalizeSequence } from './vfx.mjs';
import { MILITARY_CLIPS } from '../../packages/render/src/vfxCatalog.ts';

export const output = resolve(root, 'apps/client/public/assets/military');
export function build() {
  const sources = JSON.parse(readFileSync(new URL('./military-sources.json', import.meta.url)));
  const manifest = { version: 2, style: 'pixel', assets: {} },
    report = {};
  const preview = resolve(root, 'assets-in/previews/military');
  mkdirSync(preview, { recursive: true });
  for (const source of sources) {
    // Repair retained separately: the first gunship source clipped its outer tail tip.
    const input = source.name === 'gunship' ? 'military/gunship-v2.png' : source.source;
    const raw = readImage(resolve(root, 'assets-in', input));
    if (Math.abs(raw.w / raw.h - 1) > 0.01) throw new Error('Expected a square 2x2 source');
    const im = reduce(resizeNearest(raw, 1024, 1024), { w: 256, h: 256 });
    const cells = [0, 1, 2, 3].map((i) =>
      cut(im, (i % 2) * 128, Math.floor(i / 2) * 128, 128, 128),
    );
    let offset = 0;
    for (const name of source.clips) {
      const clip = MILITARY_CLIPS[name];
      const frames = normalizeSequence(cells.slice(offset, offset + clip.frames), clip);
      offset += clip.frames;
      for (const [i, frame] of frames.entries()) {
        const id = `vfx/${name}_${i}`,
          file = `${id}.png`;
        manifest.assets[id] = { file, w: clip.w, h: clip.h };
        report[id] = {
          source: `assets-in/${input}`,
          raw: [raw.w, raw.h],
          bbox: frame.bbox,
          scale: frame.scale,
          anchor: clip.anchor,
          ...validate(frame.im),
        };
        writeImage(resolve(output, file), frame.im);
      }
      execFileSync('magick', [
        'montage',
        ...Array.from({ length: clip.frames }, (_, i) => resolve(output, `vfx/${name}_${i}.png`)),
        '-background',
        '#323c39',
        '-tile',
        `${clip.frames}x`,
        '-geometry',
        '+3+3',
        resolve(preview, `${name}.png`),
      ]);
      execFileSync('magick', [
        resolve(preview, `${name}.png`),
        '-filter',
        'point',
        '-resize',
        '400%',
        resolve(preview, `${name}-x4.png`),
      ]);
    }
  }
  writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(resolve(output, 'acceptance.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Exported ${Object.keys(manifest.assets).length} military frames; ${preview}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
