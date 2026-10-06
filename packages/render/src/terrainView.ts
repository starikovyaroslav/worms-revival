import { BufferImageSource, Container, Sprite, Texture } from 'pixi.js';
import { Material, type Terrain } from '@wr/sim';
import type { Theme } from './theme';

const CHUNK = 256;
/** Depth of the surface (grass) layer in pixels. */
const SURFACE_DEPTH = 7;
/** Recolour this far around a change, because colours depend on neighbouring pixels. */
const MARGIN = SURFACE_DEPTH + 2;

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
        // Cartoon outline wherever land meets air.
        if (
          !t.isSolid(x - 1, y) ||
          !t.isSolid(x + 1, y) ||
          !t.isSolid(x, y - 1) ||
          !t.isSolid(x, y + 1) ||
          !t.isSolid(x - 2, y) ||
          !t.isSolid(x + 2, y) ||
          !t.isSolid(x, y + 2)
        ) {
          const ol = th.outlineRgb;
          r = r * 0.25 + ol[0] * 0.75;
          g = g * 0.25 + ol[1] * 0.75;
          b = b * 0.25 + ol[2] * 0.75;
        }
        px[o] = r;
        px[o + 1] = g;
        px[o + 2] = b;
        px[o + 3] = 255;
      }
    }
  }
}
