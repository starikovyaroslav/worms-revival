import { BufferImageSource, Container, Sprite, Texture } from 'pixi.js';
import { Material, type Terrain } from '@wr/sim';
import { snap } from './palette';
import type { Theme } from './theme';

const CHUNK = 256;
/** Depth of the surface (grass) layer in pixels. */
const SURFACE_DEPTH = 7;
/** Shading depends on distance to the nearest air up to this many pixels. */
const DEPTH_REACH = 24;
/** Recolour this far around a change, because colours depend on nearby land. */
const MARGIN = DEPTH_REACH + 2;
/** Distance field padding around a repainted region. */
const FIELD_PAD = DEPTH_REACH + 4;
/** Chamfer distance units per pixel (3 = orthogonal step, 4 = diagonal step). */
const CH = 3;
/** Ordered-dither strength (0..255) when snapping the land to the palette. */
const DITHER = 14;
/** Direction towards the light (from the top left), unit-ish. */
const LIGHT_X = -0.62;
const LIGHT_Y = -0.78;

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
  /** Distance-to-air field for the region currently being repainted. */
  private field = { x0: 0, y0: 0, w: 0, h: 0, data: new Uint8Array(0) };

  constructor(
    private readonly terrain: Terrain,
    private theme: Theme,
  ) {
    this.cols = Math.ceil(terrain.width / CHUNK);
    const rows = Math.ceil(terrain.height / CHUNK);
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const w = Math.min(CHUNK, terrain.width - cx * CHUNK);
        const h = Math.min(CHUNK, terrain.height - cy * CHUNK);
        const pixels = new Uint8Array(w * h * 4);
        const source = new BufferImageSource({
          resource: pixels,
          width: w,
          height: h,
          scaleMode: 'nearest',
        });
        const sprite = new Sprite(new Texture({ source }));
        sprite.position.set(cx * CHUNK, cy * CHUNK);
        this.container.addChild(sprite);
        this.chunks.push({ cx, cy, w, h, pixels, source });
      }
    }
    this.redrawAll();
    terrain.dirty.length = 0;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
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
        chunk.source.update(ly0 * chunk.w, (ly1 + 1) * chunk.w);
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

  private paint(chunk: Chunk, lx0: number, ly0: number, lx1: number, ly1: number): void {
    const t = this.terrain;
    const th = this.theme;
    const size = th.texSize;
    const px = chunk.pixels;
    const ox = chunk.cx * CHUNK;
    const oy = chunk.cy * CHUNK;
    for (let ly = ly0; ly <= ly1; ly++) {
      const y = oy + ly;
      for (let lx = lx0; lx <= lx1; lx++) {
        const x = ox + lx;
        const o = (ly * chunk.w + lx) * 4;
        const m = t.data[y * t.width + x] as number;
        if (m === Material.Air) {
          px[o + 3] = 0;
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
            // Surface layer: original soil with open sky a few pixels above becomes
            // grass/sand/snow. Freshly blasted surfaces (scorched rim) stay bare.
            let depth = 0;
            let above: number = Material.Soil;
            while (depth < SURFACE_DEPTH && y - depth - 1 >= 0) {
              above = t.data[(y - depth - 1) * t.width + x] as number;
              if (above !== Material.Soil) break;
              depth++;
            }
            if (depth < SURFACE_DEPTH && y - depth - 1 >= 0 && above === Material.Air) {
              const k = depth / SURFACE_DEPTH;
              const top = th.surfaceRgb;
              const bot = th.surfaceDarkRgb;
              r = top[0] + (bot[0] - top[0]) * k;
              g = top[1] + (bot[1] - top[1]) * k;
              b = top[2] + (bot[2] - top[2]) * k;
            }
          }
        }
        // Volume: land gets darker the deeper it is, and its rim is lit from the top left,
        // so ledges and crater edges read as three-dimensional.
        const dpx = this.depthAt(x, y) / CH;
        let shade = 1.12 - 0.2 * (Math.min(dpx, DEPTH_REACH) / DEPTH_REACH);
        if (dpx < 7) {
          const gx = this.depthAt(x + 2, y) - this.depthAt(x - 2, y);
          const gy = this.depthAt(x, y + 2) - this.depthAt(x, y - 2);
          const len = Math.sqrt(gx * gx + gy * gy);
          if (len > 0) {
            // The gradient points into the land; the surface normal points out of it.
            const lit = (-gx / len) * LIGHT_X + (-gy / len) * LIGHT_Y;
            shade += lit * 0.12 * (1 - dpx / 7);
          }
        }
        r *= shade;
        g *= shade;
        b *= shade;
        // Cartoon outline wherever land meets air.
        if (dpx <= 1.7) {
          const ol = th.outlineRgb;
          r = r * 0.25 + ol[0] * 0.75;
          g = g * 0.25 + ol[1] * 0.75;
          b = b * 0.25 + ol[2] * 0.75;
        }
        // Retro look: snap to the palette, dithering the gradients into checkerboard blends.
        const c = snap(r, g, b, x, y, DITHER);
        px[o] = (c >> 16) & 255;
        px[o + 1] = (c >> 8) & 255;
        px[o + 2] = c & 255;
        px[o + 3] = 255;
      }
    }
  }
}
