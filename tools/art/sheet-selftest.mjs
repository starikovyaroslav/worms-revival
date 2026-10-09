// Builds a fake "AI" sheet from our own worm art (magenta background, jittered sizes and positions,
// anti-aliased edges, cyan bandana) so the slicer can be verified without a generator.
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { wormFrame, wormPoses } from './wormframes.mjs';

const names = [
  'idle_0',
  'idle_1',
  'idle_2',
  'idle_3',
  'idle_blink',
  'walk_0',
  'walk_3',
  'walk_6',
  'walk_9',
  'walk_12',
  'walk_1',
  'walk_4',
  'walk_7',
  'jump',
  'fall',
  'land',
  'hurt_0',
  'hurt_1',
  'win_0',
  'win_1',
];
const poses = wormPoses();
const cells = names.map((n, i) => {
  const f = wormFrame(poses[n]);
  const uri = (m) => `data:image/svg+xml;utf8,${encodeURIComponent(m)}`;
  const col = i % 5,
    row = Math.floor(i / 5);
  const k = 2.7 + ((i * 7) % 5) * 0.08;
  const x = col * 340 + 30 + ((i * 13) % 40) - 20;
  const y = row * 330 + 20 + ((i * 29) % 25) - 10;
  // The band layer is recoloured cyan with an SVG filter so it can be keyed.
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${96 * k}px;height:${96 * k}px">
    <img src="${uri(f.body)}" style="position:absolute;inset:0;width:100%">
    <img src="${uri(f.band)}" style="position:absolute;inset:0;width:100%;filter:grayscale(1) brightness(1.4) sepia(1) hue-rotate(130deg) saturate(8)"></div>`;
});
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1700, height: 1320 } });
await page.setContent(
  `<body style="margin:0;background:#ff00ff;position:relative;width:1700px;height:1320px">${cells.join('')}</body>`,
);
await page.waitForTimeout(400);
await page.screenshot({ path: 'assets-in/worm.png' });
await browser.close();
writeFileSync('/tmp/selftest.ok', '1');
