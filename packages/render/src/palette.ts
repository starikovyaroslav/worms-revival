/**
 * The retro palette (DawnBringer's 32 colours) and helpers to snap any colour to it, with optional
 * ordered dithering. Keep in sync with tools/art/pixelize.mjs.
 */
export const DB32 = [
  0x000000, 0x222034, 0x45283c, 0x663931, 0x8f563b, 0xdf7126, 0xd9a066, 0xeec39a, 0xfbf236,
  0x99e550, 0x6abe30, 0x37946e, 0x4b692f, 0x524b24, 0x323c39, 0x3f3f74, 0x306082, 0x5b6ee1,
  0x639bff, 0x5fcde4, 0xcbdbfc, 0xffffff, 0x9badb7, 0x847e87, 0x696a6a, 0x595652, 0x76428a,
  0xac3232, 0xd95763, 0xd77bba, 0x8f974a, 0x8a6f30,
];

/** 5 bits per channel → palette colour (r, g, b bytes). Built once. */
const LUT = (() => {
  const lut = new Uint8Array(32 * 32 * 32 * 3);
  const pal = DB32.map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]);
  for (let r = 0; r < 32; r++) {
    for (let g = 0; g < 32; g++) {
      for (let b = 0; b < 32; b++) {
        const R = (r << 3) | (r >> 2);
        const G = (g << 3) | (g >> 2);
        const B = (b << 3) | (b >> 2);
        let best = 0;
        let bd = Infinity;
        for (let i = 0; i < pal.length; i++) {
          const p = pal[i] as number[];
          const dr = R - (p[0] as number);
          const dg = G - (p[1] as number);
          const db = B - (p[2] as number);
          const d = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        const o = ((r << 10) | (g << 5) | b) * 3;
        const p = pal[best] as number[];
        lut[o] = p[0] as number;
        lut[o + 1] = p[1] as number;
        lut[o + 2] = p[2] as number;
      }
    }
  }
  return lut;
})();

/** 4×4 Bayer matrix, values in (-0.5, 0.5). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => (v + 0.5) / 16 - 0.5,
);

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/**
 * Snaps an RGB colour (0..255) to the palette. `dither` > 0 adds an ordered-dither offset that
 * depends on the pixel position, producing the classic checkerboard blends between two colours.
 * Returns a packed 0xRRGGBB number.
 */
export function snap(r: number, g: number, b: number, x = 0, y = 0, dither = 0): number {
  const d = dither ? (BAYER[((y & 3) << 2) | (x & 3)] as number) * dither : 0;
  const o = (((clamp(r + d) >> 3) << 10) | ((clamp(g + d) >> 3) << 5) | (clamp(b + d) >> 3)) * 3;
  return ((LUT[o] as number) << 16) | ((LUT[o + 1] as number) << 8) | (LUT[o + 2] as number);
}

/** Snaps a packed colour without dithering. */
export function snapColor(c: number): number {
  return snap((c >> 16) & 255, (c >> 8) & 255, c & 255);
}
