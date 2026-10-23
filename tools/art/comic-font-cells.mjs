/** Native glyph-sheet ingestion only; no resampling or creative edits. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readImage, writeImage, root, bbox, cut } from './ingest.mjs';
import { paintedGrid } from './painted-grid.mjs';
import { glyphContours } from './glyph-contours.mjs';
const output = resolve(root, 'assets-in/comic-font-cells');
mkdirSync(output, { recursive: true });
const vectors = resolve(root, 'docs/design/concepts/comic-menu-v2/font/outlines');
mkdirSync(vectors, { recursive: true });
const glyphs = [];
for (const [sheet, alphabet] of [
  ['cyrillic', 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ012'],
  ['latin', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'],
]) {
  const cells = paintedGrid(
    readImage(resolve(root, `docs/design/concepts/comic-menu-v2/font/${sheet}.png`)),
    6,
  );
  for (const [index, char] of [...alphabet].entries()) {
    if (sheet === 'cyrillic' && /[012]/.test(char)) continue;
    const cell = cells[index];
    if (cell.touchesSourceEdge) throw new Error(`Clipped glyph ${char}`);
    const name = `uni${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
    const core = bbox({
      ...cell.art,
      data: Buffer.from(cell.art.data.map((v, i) => (i % 4 === 3 && v < 128 ? 0 : v))),
    });
    const art = cut(cell.art, core.x, core.y, core.w, core.h);
    writeImage(resolve(output, `${name}.png`), art);
    const paths = glyphContours(art)
      .map((points) => `M${points.map((p) => p.join(',')).join('L')}Z`)
      .join('');
    writeFileSync(
      resolve(vectors, `${name}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" width="${art.w}" height="${art.h}" viewBox="0 0 ${art.w} ${art.h}"><path fill="black" fill-rule="nonzero" d="${paths}"/></svg>\n`,
    );
    glyphs.push({ char, name, w: art.w, h: art.h });
  }
}
writeFileSync(resolve(output, 'glyphs.json'), JSON.stringify(glyphs, null, 2) + '\n');
console.log(`Prepared ${glyphs.length} original glyphs for tracing.`);
