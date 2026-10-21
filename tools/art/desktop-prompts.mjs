/** Saved built-in imagegen requests. Exporting these records never calls a generation service. */
import { readFileSync } from 'node:fs';
const legacy = JSON.parse(readFileSync(new URL('./legacy-hd-sources.json', import.meta.url)));
const arsenal = JSON.parse(readFileSync(new URL('./arsenal-sources.json', import.meta.url)));
export const prompts = [
  ...legacy.map((spec) => ({
    output: `assets-in/${spec.source}`,
    reference:
      spec.name === 'worm-walk'
        ? 'assets-in/desktop/worm-states.png'
        : 'assets-in/style/style-ref.png',
    transparent_background: true,
    prompt:
      spec.name === 'worm-walk'
        ? 'Use case: identity-preserve. Asset type: desktop game character animation sprite sheet. Image1 is the approved character identity reference from the new state sheet; preserve its exact face, colors, turquoise headband and segmented pink body. ' +
          spec.description +
          ' Square1024x1024, EXACT4x4 equal cells, ample transparent gutters, one complete same-scale worm in each cell. Pixel art with FINE1-2 image-pixel details, not chunky8px blocks. Transparent background, no text, labels, grid, scenery, weapons or shadows. Keep all bodies within their cells.'
        : 'Use case: stylized-concept. Asset type: production desktop-resolution pixel-art sprite sheet for Worms revival. Input image1 is a palette/style reference only: keep its pixel-art material language but use MUCH FINER DETAIL, not its huge blocks. ' +
          spec.description +
          ' Composition: square 1024x1024 sheet with EXACTLY four equal columns and four equal rows (16 cells), each object isolated in its own cell with generous transparent gutters, no part touches a cell edge. Detailed crisp pixel clusters at 1-2 image pixels, not 8-16px blocks. Limited muted DB32-compatible colors, sharp outlines, real material highlights. No captions, grid lines, text, labels, watermark, scenery or cast shadows. Genuinely transparent background. Each full object visible, consistent scale across animation cells.',
  })),
  ...arsenal.map((spec) => ({
    output: `assets-in/desktop/${spec.name}.png`,
    reference: 'assets-in/style/style-ref.png',
    transparent_background: true,
    prompt:
      'Use case: stylized-concept. Production DESKTOP-DETAIL pixel-art game sprite sheet, NOT tiny phone icons. Image1 is ONLY palette/material style reference. EXACT 4 columns x4 rows, 16 equal cells, genuinely transparent background, ample gutters. Fine1-2pixel detailing, sharp silhouettes, 4-6 discrete material shades, muted steel/olive/amber/cyan, DB32-compatible. NO text, grid, borders, labels, background, shadow or watermark. Preserve each entire subject inside its cell. Row-major subjects:\n' +
      spec.cells.map((c, i) => `${i + 1}. ${c.description}`).join('\n') +
      '\nFor weapon icons show clear polished material construction, not flat emoji. For projectile sprites preserve the stated direction. Full resolution details must survive exporting each icon to84x84, do not design on a16x16 art grid.',
  })),
];
