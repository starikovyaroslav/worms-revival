// Renders every SVG asset to PNG with headless Chrome and writes a contact sheet.
//   node tools/art/build.mjs [--scale 2] [--out apps/client/public/assets]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';
import { wormAssets } from './worm.mjs';
import { iconAssets } from './icons.mjs';

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const scale = Number(arg('--scale', '2'));
const outDir = arg('--out', 'apps/client/public/assets');
const sheetPath = arg('--sheet', '/tmp/art-sheet.png');

const assets = { ...wormAssets(), ...iconAssets() };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ deviceScaleFactor: scale });
let count = 0;
for (const [name, markup] of Object.entries(assets)) {
  const m = markup.match(/width="(\d+)" height="(\d+)"/);
  const [w, h] = [Number(m[1]), Number(m[2])];
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<body style="margin:0;background:transparent">${markup}</body>`);
  const file = join(outDir, `${name}.png`);
  mkdirSync(dirname(file), { recursive: true });
  await page.screenshot({
    path: file,
    omitBackground: true,
    clip: { x: 0, y: 0, width: w, height: h },
  });
  count++;
}
console.log(`rendered ${count} assets at ${scale}x into ${outDir}`);

// Contact sheet: every asset on a light and dark checker, plus assembled worm emotions.
const dataUri = (markup) => `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;
const cell = (name, markup) => {
  const m = markup.match(/width="(\d+)" height="(\d+)"/);
  const w = Number(m[1]);
  const h = Number(m[2]);
  const k = Math.min(1, 200 / Math.max(w, h));
  return `<div class="c"><img src="${dataUri(markup)}" width="${w * k}" height="${h * k}"><span>${name}</span></div>`;
};
const A = assets;
// Assemble a worm: strip + bandana + face. Head is on the right of the strip.
const worm = (eye, brow, mouth, pupilDx = 0, pupilDy = 0, body = 'normal') => {
  const img = (n, x, y, w, h, extra = '') =>
    `<img src="${dataUri(A[n])}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}">`;
  const eyes = (cx) =>
    img(`character/eye-${eye}`, cx - 33, 26, 66, 66) +
    (eye === 'closed' || eye === 'dead'
      ? ''
      : img('character/pupil', cx - 13 + pupilDx, 45 + pupilDy, 27, 27)) +
    img(`character/brow-${brow}`, cx - 33, 0, 66, 33, cx < 540 ? 'transform:scaleX(-1)' : '');
  return `<div class="worm">${img(`character/body-${body}`, 0, 0, 640, 160)}${img('character/bandana', 390, 0, 120, 160, 'filter:hue-rotate(190deg) saturate(2.2)')}
    ${eyes(488)}${eyes(556)}${img(`character/mouth-${mouth}`, 490, 94, 66, 44)}</div>`;
};
const html = `<body style="margin:0;background:#8fd0f0;font:11px sans-serif">
<style>.g{display:flex;flex-wrap:wrap;gap:8px;padding:12px}.c{background:repeating-conic-gradient(#fff 0 25%,#dfe6f2 0 50%) 0 0/16px 16px;padding:6px;text-align:center;border-radius:6px}.c span{display:block;color:#333}
.w{display:flex;flex-wrap:wrap;gap:6px;padding:12px;background:#4a8a3a}.worm{position:relative;width:640px;height:160px;transform:scale(.62);transform-origin:0 0;margin:0 -240px -60px 0}</style>
<div class="g">${Object.entries(A)
  .map(([n, m]) => cell(n, m))
  .join('')}</div>
<div class="w">${[
  worm('open', 'neutral', 'smile', 4, 2),
  worm('open', 'angry', 'grit', 6, 0),
  worm('wide', 'worried', 'scream'),
  worm('half', 'neutral', 'smug', 6, 4),
  worm('closed', 'raised', 'open'),
  worm('dead', 'sad', 'dead', 0, 0, 'hurt'),
].join('')}</div></body>`;
writeFileSync('/tmp/art-sheet.html', html);
const sheet = await browser.newPage({
  viewport: { width: 1500, height: 1000 },
  deviceScaleFactor: 1,
});
await sheet.goto('file:///tmp/art-sheet.html');
await sheet.waitForTimeout(500);
await sheet.screenshot({ path: sheetPath, fullPage: true });
console.log(`contact sheet: ${sheetPath}`);
await browser.close();
