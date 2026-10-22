/** Approval-only contact sheet: crop/scale source RGBA, never install unapproved skins in the game. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, readImage, writeImage, cut, bbox, resizeNearest } from './ingest.mjs';

const dir = resolve(root, 'docs/design/concepts');
const version = process.argv[2] ?? 'v1';
if (!['v1', 'v2'].includes(version))
  throw new Error('Usage: node tools/art/worm-skin-preview.mjs [v1|v2]');
const sheetName = `worm-skins-${version}`;
const source = readImage(resolve(dir, `${sheetName}.png`));
const originalNames = [
  ['brutal', 'Брутальный'],
  ['soft', 'Мягкотелый'],
  ['glam-femme', 'Гламурная дива'],
  ['glam-masc', 'Гламурный красавчик'],
  ['elder', 'Старый ворчун'],
  ['sickly', 'Больной'],
  ['veteran', 'Потрёпанный ветеран'],
  ['classic', 'Классический нахал'],
];
const expansionNames = [
  ['commando-femme', 'Брутальная коммандо'],
  ['soft-femme', 'Мягкотелая героиня'],
  ['dominatrix', 'Доминатрикс'],
  ['glam-rocker', 'Гламурный рокер'],
  ['elder-femme', 'Старая ворчунья'],
  ['sickly-femme', 'Больная героиня'],
  ['veteran-femme', 'Потрёпанная ветеранка'],
  ['classic-femme', 'Классическая нахалка'],
];
const names = version === 'v2' ? expansionNames : originalNames;
const output = resolve(dir, sheetName);
mkdirSync(output, { recursive: true });
// Reviewed native gutters: generated cells drift; never cut a face or crutch at a nominal grid line.
const columns =
  version === 'v2'
    ? [
        [0, 429 / 1536, 805 / 1536, 1153 / 1536, 1],
        [0, 404 / 1536, 772 / 1536, 1202 / 1536, 1],
      ]
    : [
        [0, 0.25, 0.5, 0.75, 1],
        [0, 0.25, 0.5, 1184 / 1536, 1],
      ];
const card = (id, label, i, folder) =>
  `<article><h2>${i + 1}. ${label}</h2><div class="large"><img src="${folder}/${id}.png" height="160" alt="${label}"></div><div class="sizes"><figure><img src="${folder}/${id}.png" height="32" alt=""><figcaption>32 px</figcaption></figure><figure><img src="${folder}/${id}.png" height="48" alt=""><figcaption>48 px</figcaption></figure></div></article>`;
const cards = names.map(([id, label], i) => {
  const column = i % 4,
    row = Math.floor(i / 4);
  const x = Math.round(columns[row][column] * source.w),
    y = Math.round((Math.floor(i / 4) * source.h) / 2);
  const cell = cut(
    source,
    x,
    y,
    Math.round(columns[row][column + 1] * source.w) - x,
    Math.round(((Math.floor(i / 4) + 1) * source.h) / 2) - y,
  );
  // Alpha threshold is ONLY for layout detection; the exported RGBA pixels are never thresholded.
  const box = bbox({
    ...cell,
    data: Buffer.from(cell.data.map((v, k) => (k % 4 === 3 && v < 128 ? 0 : v))),
  });
  if (
    !box.w ||
    !box.h ||
    box.x === 0 ||
    box.y === 0 ||
    box.x + box.w >= cell.w ||
    box.y + box.h >= cell.h
  )
    throw new Error(`${id}: missing transparent gutters; review source before cropping`);
  const left = Math.max(0, box.x - 6),
    top = Math.max(0, box.y - 6);
  const art = cut(
    cell,
    left,
    top,
    Math.min(cell.w, box.x + box.w + 6) - left,
    Math.min(cell.h, box.y + box.h + 6) - top,
  );
  const sprite = resizeNearest(art, Math.max(1, Math.round((192 * art.w) / art.h)), 192);
  writeImage(resolve(output, `${id}.png`), sprite);
  return card(id, label, i, sheetName);
});
const page = (title, items) => `<!doctype html>
<html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Worms revival — ${title}</title><style>
*{box-sizing:border-box}body{margin:0;padding:28px;background:#171d22;color:#eee;font:16px system-ui}
h1{font-size:24px}p{max-width:900px;line-height:1.5;color:#bbc6ce}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
article{padding:18px;border:1px solid #46535b;background:#29353a}h2{font-size:16px;margin:0 0 16px}.large{height:190px;display:flex;align-items:end;justify-content:center;padding-bottom:12px;background:#42514a}
img{image-rendering:pixelated;max-width:100%;object-fit:contain}.sizes{display:flex;justify-content:center;gap:40px;align-items:end;min-height:95px}figure{margin:12px 0 0;text-align:center}figcaption{font-size:12px;color:#bbc6ce;margin-top:8px}
</style><h1>${title}</h1>
<p>Концепты, не игровые анимации. Внизу каждого варианта — фактическая высота изображения 32 и 48 CSS px без сглаживания. Разные тела сохранят одинаковые игровые коллизии. Нынешний герой не заменён.</p>
<div class="grid">${items.join('\n')}</div></html>`;
writeFileSync(
  resolve(dir, `${sheetName}.html`),
  page(`Скины червей: выбор направления ${version}`, cards),
);
if (version === 'v2') {
  const all = [
    ...originalNames.map(([id, label], i) => card(id, label, i, 'worm-skins-v1')),
    ...expansionNames.map(([id, label], i) => card(id, label, i + 8, 'worm-skins-v2')),
  ];
  writeFileSync(resolve(dir, 'worm-skins-all.html'), page('Скины червей: все 16 типажей', all));
}
console.log(`Saved 8 RGBA review crops and ${resolve(dir, `${sheetName}.html`)}`);
