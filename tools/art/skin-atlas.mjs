/** Native-RGBA pose export: sixteen painted frames share one scale and one ground anchor. */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, readImage, writeImage, cut, bbox, resizeNearest } from './ingest.mjs';
import { empty, blit, sheet } from './desktop-world.mjs';
import { validate } from './rgba.mjs';
import { SKINS, SKIN_POSES } from '../../packages/render/src/skins.ts';
import { skinCells } from './skin-cells.mjs';
const unavailable = JSON.parse(
  readFileSync(new URL('./skin-animation-status.json', import.meta.url)),
);
const repairs = JSON.parse(readFileSync(new URL('./skin-animation-repairs.json', import.meta.url)));
const layoutRepairs = new Set(
  JSON.parse(readFileSync(new URL('./skin-roster-repairs.json', import.meta.url))).map(
    (repair) => repair.id,
  ),
);

const out = resolve(root, 'apps/client/public/assets/skins');
const FRAME = 192,
  DISPLAY = 32;
const manifest = { version: 2, style: 'pixel', assets: {}, unavailable },
  report = {};
mkdirSync(out, { recursive: true });
const visibleBox = (im) =>
  bbox({ ...im, data: Buffer.from(im.data.map((v, i) => (i % 4 === 3 && v < 128 ? 0 : v))) });
for (const skin of SKINS) {
  const path = resolve(root, 'assets-in/skins', `${skin.id}.png`);
  if (unavailable[skin.id]?.state === 'blocked') {
    console.warn(`${skin.id}: unavailable (${unavailable[skin.id].reason})`);
    continue;
  }
  if (!existsSync(path)) {
    if (process.argv.includes('--available')) {
      console.warn(`Draft export: skipping ${skin.id}`);
      continue;
    }
    throw new Error(`Missing native animation master: ${path}`);
  }
  const source = readImage(path);
  const cells = skinCells(source);
  const frames = SKIN_POSES.map((pose, i) => {
    const cell = cells[i];
    const repair = repairs[`${skin.id}/${pose}`];
    if (repair) {
      const raw = readImage(resolve(root, repair.source)),
        b = visibleBox(raw);
      if (!b.w || b.x === 0 || b.y === 0 || b.x + b.w >= raw.w || b.y + b.h >= raw.h)
        throw new Error(`${skin.id}/${pose}: repair has clipped bounds`);
      const cropped = cut(raw, b.x, b.y, b.w, b.h);
      const h = cell.art.h;
      return {
        ...cell,
        pose,
        art: resizeNearest(cropped, Math.round((cropped.w * h) / cropped.h), h),
        touchesSourceEdge: false,
        repair: repair.source,
      };
    }
    if (cell.touchesSourceEdge)
      throw new Error(`${skin.id}/${pose}: clipped native pose requires repair`);
    return { ...cell, pose };
  });
  const scale = Math.min(
    160 / Math.max(...frames.map((f) => f.art.w)),
    160 / Math.max(...frames.map((f) => f.art.h)),
  );
  const atlas = empty(FRAME * 4, FRAME * 4);
  frames.forEach((f, i) => {
    const frame = empty(FRAME, FRAME);
    const art = resizeNearest(
      f.art,
      Math.max(1, Math.round(f.art.w * scale)),
      Math.max(1, Math.round(f.art.h * scale)),
    );
    blit(frame, art, Math.round((FRAME - art.w) / 2), Math.round((FRAME * 29) / 32 - art.h));
    const x = (i % 4) * FRAME,
      y = Math.floor(i / 4) * FRAME;
    blit(atlas, frame, x, y);
    const id = `skins/${skin.id}/${f.pose}`;
    manifest.assets[id] = {
      file: `${skin.id}.png`,
      w: DISPLAY,
      h: DISPLAY,
      pixelW: FRAME,
      pixelH: FRAME,
      frame: { x, y, w: FRAME, h: FRAME },
    };
    const b = f.box;
    report[id] = {
      source: `assets-in/skins/${skin.id}.png`,
      profile: skin.profile,
      scale,
      display: [DISPLAY, DISPLAY],
      pixels: [FRAME, FRAME],
      sourceBounds: b,
      touchesSourceEdge: f.touchesSourceEdge,
      ...(f.repair ? { repair: f.repair } : {}),
      ...(layoutRepairs.has(skin.id)
        ? { layoutRepair: `tools/art/skin-roster-repairs.json#${skin.id}` }
        : {}),
      ...validate(frame),
    };
  });
  writeImage(resolve(out, `${skin.id}.png`), atlas);
  console.log(`${skin.id}: sixteen poses on one 768x768 RGBA atlas`);
}
// Shared standalone gun masters keep aiming/throwing identity-independent without baking old bodies.
const weaponSpec = JSON.parse(
  (await import('node:fs')).readFileSync(new URL('./legacy-hd-sources.json', import.meta.url)),
).find((s) => s.name === 'weapons');
const cells = sheet(weaponSpec.source),
  weapons = empty(FRAME * 4, FRAME * 4);
weaponSpec.cells.forEach((name, i) => {
  const b = visibleBox(cells[i]),
    cropped = cut(cells[i], b.x, b.y, b.w, b.h);
  const scale = Math.min(160 / cropped.w, 160 / cropped.h);
  const art = resizeNearest(cropped, Math.round(cropped.w * scale), Math.round(cropped.h * scale));
  const x = (i % 4) * FRAME,
    y = Math.floor(i / 4) * FRAME;
  blit(weapons, art, x + (FRAME - art.w) / 2, y + (FRAME - art.h) / 2);
  manifest.assets[`skins/weapons/${name}`] = {
    file: 'weapons.png',
    w: DISPLAY,
    h: DISPLAY,
    pixelW: FRAME,
    pixelH: FRAME,
    frame: { x, y, w: FRAME, h: FRAME },
  };
});
writeImage(resolve(out, 'weapons.png'), weapons);
const equipmentNames = ['mortar-base', 'mortar-barrel', 'radio', 'detonator'];
const equipment = empty(FRAME * 2, FRAME * 2);
skinCells(readImage(resolve(root, 'assets-in/skins/equipment.png')), 2).forEach((cell, i) => {
  const { art } = cell,
    factor = 160 / Math.max(art.w, art.h);
  const fitted = resizeNearest(art, Math.round(art.w * factor), Math.round(art.h * factor));
  const x = (i % 2) * FRAME,
    y = Math.floor(i / 2) * FRAME;
  blit(equipment, fitted, x + (FRAME - fitted.w) / 2, y + (FRAME - fitted.h) / 2);
  manifest.assets[`skins/equipment/${equipmentNames[i]}`] = {
    file: 'equipment.png',
    w: DISPLAY,
    h: DISPLAY,
    pixelW: FRAME,
    pixelH: FRAME,
    frame: { x, y, w: FRAME, h: FRAME },
  };
});
writeImage(resolve(out, 'equipment.png'), equipment);
writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(resolve(out, 'acceptance.json'), JSON.stringify(report, null, 2) + '\n');
