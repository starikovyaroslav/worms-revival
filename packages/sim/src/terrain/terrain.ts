import type { Hasher } from '../core/hash';

/** Per-pixel land material. Anything non-zero is solid. */
export const Material = {
  Air: 0,
  Soil: 1,
  /** Indestructible land (borders, Shopper maps, girders on indestructible schemes). */
  Rock: 2,
  /** Soil next to a crater — still solid, rendered as a burnt outline. */
  Scorched: 3,
  /** Placed girder. Destructible, rendered as steel. */
  Girder: 4,
} as const;
export type Material = (typeof Material)[keyof typeof Material];

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Width of the burnt outline left around craters, in pixels. */
const SCORCH_WIDTH = 3;

export class Terrain {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
  /** Regions changed since the renderer last drained them. Not part of the simulation state. */
  dirty: Rect[] = [];

  constructor(width: number, height: number, data?: Uint8Array) {
    this.width = width;
    this.height = height;
    this.data = data ?? new Uint8Array(width * height);
    if (this.data.length !== width * height) throw new Error('terrain data size mismatch');
  }

  /** Out of bounds is air: the sides and the sky are open, the bottom is water. */
  get(x: number, y: number): number {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return Material.Air;
    return this.data[y * this.width + x] as number;
  }

  isSolid(x: number, y: number): boolean {
    return this.get(x, y) !== Material.Air;
  }

  set(x: number, y: number, m: Material): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.data[y * this.width + x] = m;
  }

  markDirty(x0: number, y0: number, x1: number, y1: number): void {
    const r = {
      x0: Math.max(0, Math.floor(x0)),
      y0: Math.max(0, Math.floor(y0)),
      x1: Math.min(this.width - 1, Math.ceil(x1)),
      y1: Math.min(this.height - 1, Math.ceil(y1)),
    };
    if (r.x0 <= r.x1 && r.y0 <= r.y1) this.dirty.push(r);
  }

  markAllDirty(): void {
    this.markDirty(0, 0, this.width - 1, this.height - 1);
  }

  /**
   * Removes destructible land in a circle and scorches a thin ring around it.
   * Returns the number of pixels removed.
   */
  carveCircle(cx: number, cy: number, r: number, scorch = true): number {
    if (r <= 0) return 0;
    const outer = scorch ? r + SCORCH_WIDTH : r;
    const r2 = r * r;
    const o2 = outer * outer;
    const x0 = Math.max(0, Math.floor(cx - outer));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + outer));
    const y0 = Math.max(0, Math.floor(cy - outer));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + outer));
    let removed = 0;
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      const row = y * this.width;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const d2 = dx * dx + dy * dy;
        if (d2 > o2) continue;
        const i = row + x;
        const m = this.data[i];
        if (m === Material.Air || m === Material.Rock) continue;
        if (d2 <= r2) {
          this.data[i] = Material.Air;
          removed++;
        } else if (m === Material.Soil) {
          this.data[i] = Material.Scorched;
        }
      }
    }
    this.markDirty(x0, y0, x1, y1);
    return removed;
  }

  /** Fills air pixels in a circle with the given material. */
  fillCircle(cx: number, cy: number, r: number, m: Material): void {
    const r2 = r * r;
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= r2 && this.data[y * this.width + x] === Material.Air) {
          this.data[y * this.width + x] = m;
        }
      }
    }
    this.markDirty(x0, y0, x1, y1);
  }

  /**
   * Fills air pixels of a rotated rectangle (a girder). The rectangle is centred at (cx, cy) with
   * half-extents (hw, hh) along the unit axis (ax, ay) and its perpendicular.
   */
  fillRotatedRect(
    cx: number,
    cy: number,
    hw: number,
    hh: number,
    ax: number,
    ay: number,
    m: Material,
  ): void {
    const ex = Math.abs(ax) * hw + Math.abs(ay) * hh;
    const ey = Math.abs(ay) * hw + Math.abs(ax) * hh;
    const x0 = Math.max(0, Math.floor(cx - ex));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + ex));
    const y0 = Math.max(0, Math.floor(cy - ey));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + ey));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const u = dx * ax + dy * ay;
        const v = -dx * ay + dy * ax;
        if (
          u >= -hw &&
          u <= hw &&
          v >= -hh &&
          v <= hh &&
          this.data[y * this.width + x] === Material.Air
        ) {
          this.data[y * this.width + x] = m;
        }
      }
    }
    this.markDirty(x0, y0, x1, y1);
  }

  /** True if any solid pixel lies within the circle. */
  circleCollides(cx: number, cy: number, r: number): boolean {
    const r2 = r * r;
    const x0 = Math.floor(cx - r);
    const x1 = Math.ceil(cx + r);
    const y0 = Math.floor(cy - r);
    const y1 = Math.ceil(cy + r);
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= r2 && this.isSolid(x, y)) return true;
      }
    }
    return false;
  }

  /** True if any solid pixel lies within the axis-aligned rectangle (inclusive pixel bounds). */
  rectCollides(x0: number, y0: number, x1: number, y1: number): boolean {
    x0 = Math.floor(x0);
    y0 = Math.floor(y0);
    x1 = Math.floor(x1);
    y1 = Math.floor(y1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (this.isSolid(x, y)) return true;
      }
    }
    return false;
  }

  /**
   * Approximate surface normal at a point: the normalised sum of vectors from nearby solid pixels
   * towards the point. Returns null if there is no land around (or it is perfectly enclosed).
   */
  normalAt(px: number, py: number, radius = 5): { x: number; y: number } | null {
    let nx = 0;
    let ny = 0;
    const r2 = radius * radius;
    const cx = Math.floor(px);
    const cy = Math.floor(py);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        if (this.isSolid(cx + dx, cy + dy)) {
          nx -= dx;
          ny -= dy;
        }
      }
    }
    const len = Math.sqrt(nx * nx + ny * ny);
    if (len < 1e-9) return null;
    return { x: nx / len, y: ny / len };
  }

  /**
   * Marches a ray from (x, y) along the unit direction (dx, dy) up to maxDist pixels.
   * Returns the distance to the first solid pixel or -1.
   */
  raycast(x: number, y: number, dx: number, dy: number, maxDist: number): number {
    for (let d = 0; d <= maxDist; d += 0.5) {
      if (this.isSolid(x + dx * d, y + dy * d)) return d;
    }
    return -1;
  }

  hashInto(h: Hasher): void {
    h.u32(this.width).u32(this.height).bytes(this.data);
  }

  clone(): Terrain {
    return new Terrain(this.width, this.height, this.data.slice());
  }
}
