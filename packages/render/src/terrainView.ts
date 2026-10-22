import { BufferImageSource, Container, Sprite, Texture } from 'pixi.js';
import { Material, type Terrain } from '@wr/sim';
import { snap } from './palette';
import type { Theme } from './theme';
import { terrainArtForTheme, terrainArtPixel, terrainArtRGBA, type TerrainArt } from './terrainArt';

const CHUNK = 256;
/** At most ~64 MB each of CPU/GPU terrain pixels, independently of collision resolution. */
export function terrainDensity(w: number, h: number): number {
  return Math.max(1, Math.min(3, Math.floor(Math.sqrt(16_000_000 / (w * h)))));
}
/** Depth of the surface (grass) layer in pixels. */
const SURFACE_DEPTH = 7;
/** Grass body thickness below the 1px cap. */
const GRASS_THICK = 3;
/** Dark root crust between the grass and the open subsoil. */
const ROOT_THICK = 2;
/** Vertical period of the geological strata bands in the subsoil. */
const STRATA_H = 30;
/** Shading depends on distance to the nearest air up to this many pixels. */
const DEPTH_REACH = 24;
/** Recolour this far around a change, because colours depend on nearby land. */
const MARGIN = DEPTH_REACH + 2;
/** Distance field padding around a repainted region. */
const FIELD_PAD = DEPTH_REACH + 4;
/** Chamfer distance units per pixel (3 = orthogonal step, 4 = diagonal step). */
const CH = 3;
/** Ordered-dither strength (0..255) when snapping the land to the palette. */
const DITHER = 8;
/** Direction towards the light (from the top left), unit-ish. */
const LIGHT_X = -0.62;
const LIGHT_Y = -0.78;

/** Cheap stable horizontal wobble (px) used to bend the strata lines. */
function strataWobble(x: number): number {
  let h = Math.imul(x >> 3, 0x1b873593) ^ Math.imul(0x9e3779b1, 0x85ebca6b);
  h = (h ^ (h >>> 13)) >>> 0;
  return (h % 21) - 10;
}

/** Stable hash of two ints to 0..1 (cosmetic: terrain looks the same on every run). */
function hash2(a: number, b: number): number {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise with ~`cell` pixel features, 0..1: breaks up any repetition of the pattern tile. */
function lowNoise(x: number, y: number, cell: number, seed: number): number {
  const fx = x / cell;
  const fy = y / cell;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const u = fx - ix;
  const v = fy - iy;
  const su = u * u * (3 - 2 * u);
  const sv = v * v * (3 - 2 * v);
  const a = hash2(ix + seed, iy);
  const b = hash2(ix + 1 + seed, iy);
  const c = hash2(ix + seed, iy + 1);
  const d = hash2(ix + 1 + seed, iy + 1);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}

interface Chunk {
  cx: number;
  cy: number;
  w: number;
  h: number;
  pixels: Uint8Array;
  source: BufferImageSource;
}

/** Renders the terrain mask as a grid of RGBA chunk textures, recolouring only changed areas. */
export class TerrainView {
  readonly container = new Container();
  private chunks: Chunk[] = [];
  private cols: number;
  private art: TerrainArt | undefined;
  private density: number;
  /** Distance-to-air field for the region currently being repainted. */
  private field = { x0: 0, y0: 0, w: 0, h: 0, data: new Uint8Array(0) };

  constructor(
    private readonly terrain: Terrain,
    private theme: Theme,
  ) {
    this.art = terrainArtForTheme(theme.id, theme.artStyle === 'painted');
    this.density = this.art ? terrainDensity(terrain.width, terrain.height) : 1;
    this.cols = Math.ceil(terrain.width / CHUNK);
    const rows = Math.ceil(terrain.height / CHUNK);
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const w = Math.min(CHUNK, terrain.width - cx * CHUNK);
        const h = Math.min(CHUNK, terrain.height - cy * CHUNK);
        const pixels = new Uint8Array(w * h * this.density ** 2 * 4);
        const source = new BufferImageSource({
          resource: pixels,
          width: w * this.density,
          height: h * this.density,
          scaleMode: this.art?.painted ? 'linear' : 'nearest',
        });
        const sprite = new Sprite(new Texture({ source }));
        sprite.position.set(cx * CHUNK, cy * CHUNK);
        sprite.scale.set(1 / this.density);
        this.container.addChild(sprite);
        this.chunks.push({ cx, cy, w, h, pixels, source });
      }
    }
    this.redrawAll();
    terrain.dirty.length = 0;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.art = terrainArtForTheme(theme.id, theme.artStyle === 'painted');
    for (const chunk of this.chunks)
      chunk.source.scaleMode = this.art?.painted ? 'linear' : 'nearest';
    this.redrawAll();
  }

  redrawAll(): void {
    this.redraw(0, 0, this.terrain.width - 1, this.terrain.height - 1);
  }

  /** Applies all terrain changes since the last call. */
  update(): void {
    const dirty = this.terrain.dirty;
    if (!dirty.length) return;
    for (const r of dirty) this.redraw(r.x0 - MARGIN, r.y0 - MARGIN, r.x1 + MARGIN, r.y1 + MARGIN);
    dirty.length = 0;
  }

  private redraw(x0: number, y0: number, x1: number, y1: number): void {
    const t = this.terrain;
    x0 = Math.max(0, x0);
    y0 = Math.max(0, y0);
    x1 = Math.min(t.width - 1, x1);
    y1 = Math.min(t.height - 1, y1);
    if (x0 > x1 || y0 > y1) return;
    this.buildField(x0, y0, x1, y1);
    for (let cy = Math.floor(y0 / CHUNK); cy <= Math.floor(y1 / CHUNK); cy++) {
      for (let cx = Math.floor(x0 / CHUNK); cx <= Math.floor(x1 / CHUNK); cx++) {
        const chunk = this.chunks[cy * this.cols + cx];
        if (!chunk) continue;
        const lx0 = Math.max(0, x0 - cx * CHUNK);
        const ly0 = Math.max(0, y0 - cy * CHUNK);
        const lx1 = Math.min(chunk.w - 1, x1 - cx * CHUNK);
        const ly1 = Math.min(chunk.h - 1, y1 - cy * CHUNK);
        this.paint(chunk, lx0, ly0, lx1, ly1);
        chunk.source.update();
      }
    }
  }

  /**
   * Distance from every land pixel to the nearest air pixel, in chamfer units (CH per pixel),
   * for the region plus padding. The land outside the map counts as air.
   */
  private buildField(x0: number, y0: number, x1: number, y1: number): void {
    const t = this.terrain;
    const rx0 = Math.max(0, x0 - FIELD_PAD);
    const ry0 = Math.max(0, y0 - FIELD_PAD);
    const rx1 = Math.min(t.width - 1, x1 + FIELD_PAD);
    const ry1 = Math.min(t.height - 1, y1 + FIELD_PAD);
    const w = rx1 - rx0 + 1;
    const h = ry1 - ry0 + 1;
    const W = w + 2;
    const d = new Uint8Array(W * (h + 2)).fill(255);
    // A frame of air where the region touches the map edge, "unknown/far" elsewhere.
    for (let j = 0; j < h + 2; j++) {
      if (rx0 === 0) d[j * W] = 0;
      if (rx1 === t.width - 1) d[j * W + w + 1] = 0;
    }
    for (let i = 0; i < W; i++) {
      if (ry0 === 0) d[i] = 0;
      if (ry1 === t.height - 1) d[(h + 1) * W + i] = 0;
    }
    for (let j = 0; j < h; j++) {
      const row = (ry0 + j) * t.width + rx0;
      const o = (j + 1) * W + 1;
      for (let i = 0; i < w; i++) d[o + i] = t.data[row + i] === Material.Air ? 0 : 255;
    }
    for (let j = 1; j <= h; j++) {
      for (let i = 1; i <= w; i++) {
        const k = j * W + i;
        const v = d[k] as number;
        if (v === 0) continue;
        const a = Math.min(
          v,
          (d[k - 1] as number) + CH,
          (d[k - W] as number) + CH,
          (d[k - W - 1] as number) + CH + 1,
          (d[k - W + 1] as number) + CH + 1,
        );
        d[k] = Math.min(255, a);
      }
    }
    for (let j = h; j >= 1; j--) {
      for (let i = w; i >= 1; i--) {
        const k = j * W + i;
        const v = d[k] as number;
        if (v === 0) continue;
        const a = Math.min(
          v,
          (d[k + 1] as number) + CH,
          (d[k + W] as number) + CH,
          (d[k + W + 1] as number) + CH + 1,
          (d[k + W - 1] as number) + CH + 1,
        );
        d[k] = Math.min(255, a);
      }
    }
    this.field = { x0: rx0 - 1, y0: ry0 - 1, w: W, h: h + 2, data: d };
  }

  /** Distance to air in chamfer units; 255 when unknown. */
  private depthAt(x: number, y: number): number {
    const f = this.field;
    const i = x - f.x0;
    const j = y - f.y0;
    if (i < 0 || j < 0 || i >= f.w || j >= f.h) return 255;
    return f.data[j * f.w + i] as number;
  }

  /**
   * Cosmetic tuft above a soil surface: grass blades, snow caps or ash (and the odd ember), 1-3 px
   * tall in 2px-wide groups. Returns a colour, or -1 when this air pixel stays empty.
   */
  private tuft(x: number, y: number): number {
    const t = this.terrain;
    const th = this.theme;
    let d = 1;
    for (; d <= 3; d++) {
      if (y + d >= t.height) return -1;
      const m = t.data[(y + d) * t.width + x] as number;
      if (m === Material.Air) continue;
      if (m !== Material.Soil) return -1;
      break;
    }
    if (d > 3) return -1;
    const h = hash2(x >> 1, 13);
    const snow = th.rim === 'snow';
    const height = snow
      ? h < 0.5
        ? 2
        : h < 0.8
          ? 1
          : 0
      : h < 0.14
        ? 3
        : h < 0.34
          ? 2
          : h < 0.56
            ? 1
            : 0;
    if (th.rim === 'ash' && d === 1 && hash2(x, 29) < 0.035) return 0xdf7126;
    if (d > height) return -1;
    const top = d === height;
    switch (th.rim) {
      case 'snow':
        return top ? 0xffffff : 0xcbdbfc;
      case 'ash':
        return top ? 0x696a6a : 0x45283c;
      case 'sand':
        return top ? 0xeec39a : 0xd9a066;
      default:
        return top ? 0x99e550 : 0x6abe30;
    }
  }

  private paint(chunk: Chunk, lx0: number, ly0: number, lx1: number, ly1: number): void {
    const t = this.terrain;
    const th = this.theme;
    const size = th.texSize;
    const px = chunk.pixels;
    const ox = chunk.cx * CHUNK;
    const oy = chunk.cy * CHUNK;
    const density = this.density,
      stride = chunk.w * density;
    for (let ly = ly0; ly <= ly1; ly++) {
      const y = oy + ly;
      for (let lx = lx0; lx <= lx1; lx++) {
        const x = ox + lx;
        const write = (color: number, sx: number, sy: number, rgba = false) => {
          const o = ((ly * density + sy) * stride + lx * density + sx) * 4;
          px[o + 3] = color < 0 ? 0 : rgba ? color >>> 24 : 255;
          if (color >= 0) {
            px[o] = color >>> 16;
            px[o + 1] = (color >>> 8) & 255;
            px[o + 2] = color & 255;
          }
        };
        const fill = (color: number, rgba = false) => {
          for (let sy = 0; sy < density; sy++)
            for (let sx = 0; sx < density; sx++) write(color, sx, sy, rgba);
        };
        const m = t.data[y * t.width + x] as Material;
        if (this.art) {
          const sample = this.art.painted ? terrainArtRGBA : terrainArtPixel;
          const color = sample(t, this.art, x, y, m);
          if (color !== undefined) {
            if (density === 1) fill(color, this.art.painted);
            else
              for (let sy = 0; sy < density; sy++)
                for (let sx = 0; sx < density; sx++)
                  write(
                    sample(t, this.art, x, y, m, (sx + 0.5) / density, (sy + 0.5) / density) ??
                      color,
                    sx,
                    sy,
                    this.art.painted,
                  );
            continue;
          }
        }
        if (m === Material.Air) {
          const tuft = th.rim === 'none' ? -1 : this.tuft(x, y);
          fill(tuft);
          continue;
        }
        let r: number;
        let g: number;
        let b: number;
        const ti = ((y % size) * size + (x % size)) * 3;
        if (m === Material.Girder) {
          const stripe = (x + y) % 12 < 2 ? 0.75 : 1;
          [r, g, b] = th.girderRgb;
          r *= stripe;
          g *= stripe;
          b *= stripe;
        } else if (m === Material.Rock) {
          r = th.rockTex[ti] as number;
          g = th.rockTex[ti + 1] as number;
          b = th.rockTex[ti + 2] as number;
        } else {
          r = th.soilTex[ti] as number;
          g = th.soilTex[ti + 1] as number;
          b = th.soilTex[ti + 2] as number;
          if (m === Material.Scorched) {
            const s = th.scorchRgb;
            r = r * 0.35 + s[0] * 0.65;
            g = g * 0.35 + s[1] * 0.65;
            b = b * 0.35 + s[2] * 0.65;
          } else {
            // Surface detection: how many soil pixels above until air or rock.
            let depth = 0;
            let above: number = Material.Soil;
            while (depth < SURFACE_DEPTH && y - depth - 1 >= 0) {
              above = t.data[(y - depth - 1) * t.width + x] as number;
              if (above !== Material.Soil) break;
              depth++;
            }
            const exposed = y - depth - 1 >= 0 && above === Material.Air;
            const top = th.surfaceRgb;
            const bot = th.surfaceDarkRgb;
            if (exposed && depth === 0) {
              // Bright grass cap catching the light.
              r = Math.min(255, top[0] * 1.15);
              g = Math.min(255, top[1] * 1.15);
              b = Math.min(255, top[2] * 1.15);
            } else if (exposed && depth < GRASS_THICK) {
              const k = depth / GRASS_THICK;
              r = top[0] + (bot[0] - top[0]) * k;
              g = top[1] + (bot[1] - top[1]) * k;
              b = top[2] + (bot[2] - top[2]) * k;
            } else if (exposed && depth < GRASS_THICK + ROOT_THICK) {
              // Dark root crust sealing the grass from the dirt.
              r = bot[0] * 0.66;
              g = bot[1] * 0.66;
              b = bot[2] * 0.66;
            } else {
              // Subsoil: the pattern tile, broken up by uneven strata (each band has its own tone
              // and only some have a seam) and a slow large-scale blotch, so nothing repeats.
              const s = y + strataWobble(x) + strataWobble(x >> 1) * 0.5;
              const band = Math.floor(s / STRATA_H);
              const m = s - band * STRATA_H;
              const hb = hash2(band, 7);
              let f = 0.95 + hb * 0.08;
              if (m < 1 && hb < 0.35) f *= 0.84;
              f *= 0.97 + lowNoise(x, y, 44, 5) * 0.06;
              r *= f;
              g *= f;
              b *= f;
            }
          }
        }
        // Volume: land gets darker the deeper it is, and its rim is lit from the top left,
        // so ledges and crater edges read as three-dimensional.
        const dpx = this.depthAt(x, y) / CH;
        let shade = 1.06 - 0.3 * (Math.min(dpx, DEPTH_REACH) / DEPTH_REACH);
        if (dpx < 7) {
          const gx = this.depthAt(x + 2, y) - this.depthAt(x - 2, y);
          const gy = this.depthAt(x, y + 2) - this.depthAt(x, y - 2);
          const len = Math.sqrt(gx * gx + gy * gy);
          if (len > 0) {
            // The gradient points into the land; the surface normal points out of it.
            const lit = (-gx / len) * LIGHT_X + (-gy / len) * LIGHT_Y;
            // Three hard tones along the rim (highlight, mid, shadow), then a soft falloff inwards.
            if (dpx <= 3.4)
              shade = (lit > 0.3 ? 1.12 : lit < -0.3 ? 0.76 : 1.0) * (shade > 1 ? 1 : shade);
            else shade += lit * 0.17 * (1 - dpx / 7);
          }
        }
        r *= shade;
        g *= shade;
        b *= shade;
        // Crisp cartoon outline where land meets air: a hard 1px line plus a soft falloff.
        if (dpx <= 1.0) {
          const ol = th.outlineRgb;
          r = r * 0.4 + ol[0] * 0.6;
          g = g * 0.4 + ol[1] * 0.6;
          b = b * 0.4 + ol[2] * 0.6;
        } else if (dpx <= 1.7) {
          const ol = th.outlineRgb;
          r = r * 0.72 + ol[0] * 0.28;
          g = g * 0.72 + ol[1] * 0.28;
          b = b * 0.72 + ol[2] * 0.28;
        }
        // Retro look: snap to the palette, dithering the gradients into checkerboard blends.
        const c = snap(r, g, b, x, y, DITHER);
        fill(c);
      }
    }
  }
}
