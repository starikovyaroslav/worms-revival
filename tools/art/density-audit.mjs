import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './ingest.mjs';

/** Inventory actual files, not just the merged runtime store which could hide old low-res copies. */
export function audit() {
  const base = resolve(root, 'apps/client/public/assets'),
    files = [],
    referenced = new Set();
  const walk = (dir) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, f.name);
      if (f.isDirectory()) walk(path);
      else if (f.name.endsWith('.png')) files.push(path);
    }
  };
  walk(base);
  const problems = [],
    packs = [];
  for (const pack of [
    '',
    'generated',
    'arsenal',
    'vfx',
    'military',
    'skins',
    'painted-meadow',
    'painted-desert',
    'painted-arctic',
    'painted-hell',
    'painted-common',
    'painted-hud',
    'comic-ui',
  ]) {
    const manifest = JSON.parse(readFileSync(resolve(base, pack, 'manifest.json')));
    const packFiles = new Set();
    let bytes = 0,
      minimumDensity = Infinity;
    for (const [id, a] of Object.entries(manifest.assets)) {
      const path = resolve(base, pack, a.file),
        png = readFileSync(path);
      referenced.add(path);
      if (!packFiles.has(path)) bytes += png.length;
      packFiles.add(path);
      const atlasW = png.readUInt32BE(16),
        atlasH = png.readUInt32BE(20);
      const w = a.frame?.w ?? atlasW,
        h = a.frame?.h ?? atlasH;
      if (
        a.frame &&
        (a.frame.x < 0 || a.frame.y < 0 || a.frame.x + w > atlasW || a.frame.y + h > atlasH)
      )
        problems.push({ pack, id, invalidFrame: a.frame, atlas: [atlasW, atlasH] });
      const density = Math.min(w / a.w, h / a.h);
      const expected =
        pack === 'military' || id.startsWith('bg/') || id.startsWith('ui/')
          ? 3
          : id.startsWith('weapons/icon/')
            ? 6
            : 4;
      minimumDensity = Math.min(minimumDensity, density);
      if (w !== a.pixelW || h !== a.pixelH || density < expected || Math.max(w, h) < 64)
        problems.push({
          pack,
          id,
          display: [a.w, a.h],
          png: [w, h],
          declared: [a.pixelW, a.pixelH],
          density,
          expected,
        });
    }
    packs.push({
      pack: pack || 'legacy paths (rebuilt)',
      images: packFiles.size,
      frames: Object.keys(manifest.assets).length,
      minimumDensity,
      pngBytes: bytes,
    });
  }
  for (const path of files)
    if (!referenced.has(path)) problems.push({ orphan: relative(base, path) });
  return {
    policy:
      'all on-disk PNGs: declared native pixels, >=3x display density (icons 6x; other sprites 4x), longest edge >=64; no unregistered leftovers',
    totalPng: files.length,
    registeredPng: referenced.size,
    packs,
    problems,
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = audit();
  writeFileSync(
    resolve(root, 'docs/design/asset-density-audit.json'),
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(JSON.stringify(result, null, 2));
  if (result.problems.length) process.exitCode = 1;
}
