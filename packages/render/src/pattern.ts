import { hex, mix, shade, type RGB } from './color';

// Cosmetic noise for textures. Rendering is not part of the simulation, so it may use anything,
// but it must still be seeded so a theme always looks the same.

function hash(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Value noise that tiles with the given integer period. */
function tiledNoise(x: number, y: number, period: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const w = (i: number) => ((i % period) + period) % period;
  const a = hash(w(ix), w(iy), seed);
  const b = hash(w(ix + 1), w(iy), seed);
  const c = hash(w(ix), w(iy + 1), seed);
  const d = hash(w(ix + 1), w(iy + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export interface PatternSpec {
  base: number;
  dark: number;
  /** Pebbles / embedded objects. */
  speck: number;
  speckDensity: number;
  seed: number;
}

/** A tileable RGB texture (size × size × 3) used to fill solid land. */
export function makePattern(spec: PatternSpec, size = 128): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 3);
  const base = hex(spec.base);
  const dark = hex(spec.dark);
  const speck = hex(spec.speck);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let n = 0;
      let amp = 0.5;
      for (let o = 0, period = 8; o < 4; o++, period *= 2) {
        n += tiledNoise((x / size) * period, (y / size) * period, period, spec.seed + o) * amp;
        amp *= 0.5;
      }
      const c: RGB = mix(dark, base, Math.min(1, Math.max(0, (n - 0.15) * 1.6)));
      const i = (y * size + x) * 3;
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
    }
  }
  // Pebbles: randomly placed little ellipses with a highlight, wrapped so the texture tiles.
  let state = spec.seed * 2654435761;
  const rand = () => {
    state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0;
    return (state >>> 0) / 4294967296;
  };
  const count = Math.round(size * size * spec.speckDensity * 0.004);
  for (let k = 0; k < count; k++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const rx = 1.5 + rand() * 3.5;
    const ry = rx * (0.5 + rand() * 0.5);
    const tint = mix(speck, dark, rand() * 0.4);
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
      for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
        const e = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        if (e > 1) continue;
        const px = (((Math.floor(cx) + dx) % size) + size) % size;
        const py = (((Math.floor(cy) + dy) % size) + size) % size;
        // Lit from the top left.
        const light = dx + dy < -1 ? 1.25 : dx + dy > 1 ? 0.75 : 1;
        const c = shade(tint, light);
        const i = (py * size + px) * 3;
        out[i] = c[0];
        out[i + 1] = c[1];
        out[i + 2] = c[2];
      }
    }
  }
  return out;
}
