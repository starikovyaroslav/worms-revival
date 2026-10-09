// Renders the catalog to retro pixel-art PNGs with headless Chrome and writes a contact sheet.
//   node tools/art/build.mjs [--out apps/client/public/assets] [--sheet docs/design/img/art-sheet.png]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';
import { CATALOG } from './catalog.mjs';
import { PALETTE, PIXELIZE_SOURCE } from './pixelize.mjs';

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const outDir = arg('--out', 'apps/client/public/assets');
const sheetPath = arg('--sheet', '/tmp/art-sheet.png');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.setContent('<body></body>');
await page.addScriptTag({ content: `${PIXELIZE_SOURCE};window.pixelize=pixelize;` });

// Keep entries this script does not own (hand-made sprites, sliced sheets); replace only catalog ones.
const manifestPath = join(outDir, 'manifest.json');
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : { version: 2, style: 'pixel', assets: {} };
const rendered = [];
for (const a of CATALOG) {
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(a.svg)}`;
  const r = await page.evaluate(
    ([u, px, pal, crop]) => window.pixelize(u, px, { palette: pal, crop }),
    [uri, a.px, PALETTE, a.crop !== false],
  );
  const file = join(outDir, `${a.id}.png`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(r.url.split(',')[1], 'base64'));
  manifest.assets[a.id] = { file: `${a.id}.png`, w: r.w, h: r.h };
  rendered.push({ id: a.id, url: r.url, w: r.w, h: r.h });
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`rendered ${rendered.length} pixel assets into ${outDir}`);

// Contact sheet at 3x, nearest-neighbour, on a game-like green.
const cell = (r) =>
  `<div class="c"><img src="${r.url}" width="${r.w * 3}" height="${r.h * 3}"><span>${r.id.replace(/^[a-z]+\//, '')} ${r.w}×${r.h}</span></div>`;
const groups = {
  icons: rendered.filter((r) => r.id.startsWith('weapons/')),
  world: rendered.filter((r) => !r.id.startsWith('weapons/') && !r.id.startsWith('worm/')),
  worm: rendered.filter((r) => r.id.startsWith('worm/') && !r.id.endsWith('_band')),
};
writeFileSync(
  '/tmp/art-sheet.html',
  `<body style="margin:0;background:#4a7a3a;font:10px monospace;color:#fff"><style>.g{display:flex;flex-wrap:wrap;gap:6px;padding:10px}.c{background:#5f9a4a;padding:5px;text-align:center;border-radius:3px}img{image-rendering:pixelated;display:block;margin:0 auto 3px}</style>
<div class="g">${groups.icons.map(cell).join('')}</div><div class="g" style="background:#3e6a30">${groups.world.map(cell).join('')}</div><div class="g" style="background:#2a5a8a">${groups.worm.map((r) => cell(r)).join('')}</div></body>`,
);
const sheet = await browser.newPage({ viewport: { width: 1500, height: 900 } });
await sheet.goto('file:///tmp/art-sheet.html');
await sheet.screenshot({ path: sheetPath, fullPage: true });
console.log(`contact sheet: ${sheetPath}`);
await browser.close();
