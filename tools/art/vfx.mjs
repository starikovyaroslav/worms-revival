import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  root,
  readImage,
  resizeNearest,
  reduce,
  cut,
  bbox,
  writeImage,
  validate,
  countIslands,
} from './ingest.mjs';
import { BASE_VFX_CLIPS as VFX_CLIPS, VFX_DENSITY } from '../../packages/render/src/vfxCatalog.ts';

export const sources = JSON.parse(readFileSync(new URL('./vfx-sources.json', import.meta.url)));
export const grids = [
  [0, 78, 139, 194, 256],
  [0, 65, 128, 190, 256],
  [0, 71, 135, 184, 256],
  [0, 90, 153, 219, 256],
];
export const output = resolve(root, 'apps/client/public/assets/vfx');

/** Crop reviewed normalized sheet boundaries at native resolution, BEFORE any spatial reduction. */
export function nativeCell(im, x0, y0, x1, y1, grid = 256) {
  const x = Math.round((x0 * im.w) / grid),
    y = Math.round((y0 * im.h) / grid);
  const w = Math.round((x1 * im.w) / grid) - x,
    h = Math.round((y1 * im.h) / grid) - y;
  return { im: cut(im, x, y, w, h), crop: [x, y, w, h] };
}

/** A sequence shares ONE scale; shrinking its initial stage independently would erase the animation. */
export function normalizeSequence(frames, clip) {
  const boxes = frames.map(bbox);
  const pad = clip.padding ?? 2;
  const scale = Math.min(
    (clip.w - pad * 2) / Math.max(...boxes.map((b) => b.w)),
    (clip.h - pad * 2) / Math.max(...boxes.map((b) => b.h)),
  );
  return frames.map((frame, i) => {
    const b = boxes[i];
    if (b.x === 0 || b.y === 0 || b.x + b.w === frame.w || b.y + b.h === frame.h)
      throw new Error('Frame touches source boundary; review crop');
    const cropped = cut(frame, b.x, b.y, b.w, b.h);
    const resized = resizeNearest(
      cropped,
      Math.max(1, Math.round(b.w * scale)),
      Math.max(1, Math.round(b.h * scale)),
    );
    const result = { w: clip.w, h: clip.h, data: Buffer.alloc(clip.w * clip.h * 4) };
    const x =
      clip.anchor[0] === 1 ? clip.w - pad - resized.w : Math.floor((clip.w - resized.w) / 2);
    const y =
      clip.anchor[1] === 1 ? clip.h - pad - resized.h : Math.floor((clip.h - resized.h) / 2);
    for (let line = 0; line < resized.h; line++)
      resized.data.copy(
        result.data,
        ((y + line) * clip.w + x) * 4,
        line * resized.w * 4,
        (line + 1) * resized.w * 4,
      );
    return { im: result, bbox: b, scale };
  });
}

export function build() {
  const groups = new Map();
  for (const [s, source] of sources.entries()) {
    const raw = readImage(resolve(root, 'assets-in', source.source));
    if (Math.abs(raw.w / raw.h - 1) > 0.01) throw new Error('Expected square source');
    // Palette/alpha normalization only. A 1px source detail must not vanish in a 4x4 majority vote.
    const native = reduce(raw, { w: raw.w, h: raw.h });
    for (const [i, cell] of source.cells.entries()) {
      const row = Math.floor(i / 4),
        col = i % 4;
      const cellImage = nativeCell(
        native,
        col * 64,
        grids[s][row],
        (col + 1) * 64,
        grids[s][row + 1],
      );
      const entry = {
        ...cell,
        ...cellImage,
        source: source.source,
        raw: [raw.w, raw.h],
      };
      if (!groups.has(cell.prefix)) groups.set(cell.prefix, []);
      groups.get(cell.prefix).push(entry);
    }
  }
  const manifest = { version: 2, style: 'pixel', assets: {} },
    report = {};
  for (const [prefix, clip] of Object.entries(VFX_CLIPS)) {
    const cells = groups.get(prefix);
    if (cells?.length !== clip.frames) throw new Error(`Incomplete clip ${prefix}`);
    const frames = normalizeSequence(
      cells.map((c) => c.im),
      { ...clip, w: clip.w * VFX_DENSITY, h: clip.h * VFX_DENSITY, padding: 2 * VFX_DENSITY },
    );
    for (const [i, frame] of frames.entries()) {
      const cell = cells[i],
        file = `${cell.id}.png`;
      manifest.assets[cell.id] = {
        file,
        w: clip.w,
        h: clip.h,
        pixelW: frame.im.w,
        pixelH: frame.im.h,
      };
      report[cell.id] = {
        source: `assets-in/${cell.source}`,
        raw: cell.raw,
        crop: cell.crop,
        bbox: frame.bbox,
        scale: frame.scale,
        anchor: clip.anchor,
        display: [clip.w, clip.h],
        density: VFX_DENSITY,
        processing: 'native crop -> DB32/binary alpha -> one final fit; no low-res intermediate',
        ...validate(frame.im),
        islands: countIslands(frame.im),
      };
      writeImage(resolve(output, file), frame.im);
    }
  }
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(resolve(output, 'acceptance.json'), JSON.stringify(report, null, 2) + '\n');
  const preview = resolve(root, 'assets-in/previews/vfx');
  mkdirSync(preview, { recursive: true });
  for (const prefix of Object.keys(VFX_CLIPS)) {
    const files = Object.entries(manifest.assets)
      .filter(([id]) => id.startsWith(`vfx/${prefix}_`))
      .map(([, v]) => resolve(output, v.file));
    execFileSync('magick', [
      'montage',
      ...files,
      '-background',
      '#323c39',
      '-tile',
      `${files.length}x`,
      '-geometry',
      '+2+2',
      resolve(preview, `${prefix}.png`),
    ]);
    execFileSync('magick', [
      resolve(preview, `${prefix}.png`),
      '-filter',
      'point',
      '-resize',
      '400%',
      resolve(preview, `${prefix}-x4.png`),
    ]);
  }
  console.log(
    `Exported ${Object.keys(manifest.assets).length} frames in ${groups.size} clips; ${preview}`,
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
