import { Container, Graphics } from 'pixi.js';
import type { Terrain, Worm } from '@wr/sim';

/** Distance from the worm centre to the crosshair centre (world px), independent of power. */
const CROSSHAIR_DIST = 60;
/** The power wedge starts here and is `WEDGE_LEN * power` long, so it ends before the crosshair. */
const WEDGE_START = 10;
const WEDGE_LEN = 46;

const HALO = 0x222034;
const CYAN = 0x5fcde4;
const WHITE = 0xffffff;
const YELLOW = 0xfbf236;
const BANDS = [0xdf7126, 0xd95763, 0xac3232, 0xac3232];
const SPINE = 0xd95763;
const LASER = 0xac3232;
const LASER_END = 0xff6060;

// T tick, r ring, W centre dot (its 4 neighbours are drawn in the ring colour).
const CROSSHAIR = [
  '......T......',
  '......T......',
  '....rrrrr....',
  '...r.....r...',
  '..r.......r..',
  '..r.......r..',
  'TTr...W...rTT',
  '..r.......r..',
  '..r.......r..',
  '...r.....r...',
  '....rrrrr....',
  '......T......',
  '......T......',
];

const IDLE_STEP_FRAMES = 20;
const FLASH_FRAMES = 4;

/**
 * Pixel-art crosshair and power wedge. Everything is a k x k filled square in world space (k
 * follows the camera zoom so the overlay stays about 1.5 screen px per art pixel), each lit pixel
 * gets a dark halo for contrast on any background.
 */
export class AimView {
  readonly container = new Container();
  private g = new Graphics();
  /** Current pixel size; kept between frames for hysteresis. */
  private k = 2;
  private frame = 0;

  constructor(private readonly painted = false) {
    this.container.addChild(this.g);
  }

  /** Pixel size for a zoom level: clamp(round(1.5 / zoom), 1, 3) with a dead band at the steps. */
  private pixelSize(zoom: number): number {
    const raw = 1.5 / Math.max(0.01, zoom);
    if (Math.abs(raw - this.k) > 0.5 + 0.15) this.k = Math.min(3, Math.max(1, Math.round(raw)));
    return this.k;
  }

  update(
    worm: Worm | null,
    alpha: number,
    show: boolean,
    power: number,
    charging: boolean,
    terrain?: Terrain,
    zoom = 1,
    ray?: { x: number; y: number; angle: number } | null,
  ): void {
    const g = this.g.clear();
    if (!worm || !show || !(worm.grounded || worm.state === 'roped')) return;
    this.frame++;
    const k = this.pixelSize(zoom);
    const x = worm.prevX + (worm.x - worm.prevX) * alpha + (ray?.x ?? 0);
    const y = worm.prevY + (worm.y - worm.prevY) * alpha + (ray?.y ?? -6.5);
    const angle = ray?.angle ?? worm.aim;
    const dx = Math.cos(angle) * worm.facing;
    const dy = -Math.sin(angle);
    const maxPower = power >= 0.999;
    if (this.painted) {
      const unit = 1 / Math.max(0.01, zoom),
        cx = x + dx * CROSSHAIR_DIST,
        cy = y + dy * CROSSHAIR_DIST;
      const color = maxPower ? 0xffd66b : 0x9be9ef;
      if (worm.laser && terrain) {
        let distance = 12;
        while (distance < 900 && !terrain.isSolid(x + dx * distance, y + dy * distance))
          distance += 2;
        g.moveTo(x + dx * 12, y + dy * 12)
          .lineTo(x + dx * distance, y + dy * distance)
          .stroke({ color: 0xff5353, width: 1.2 * unit, alpha: 0.8 });
      }
      if (charging && power > 0) {
        const reach = WEDGE_START + WEDGE_LEN * power,
          spread = 4 * power;
        g.poly([
          x + dx * WEDGE_START,
          y + dy * WEDGE_START,
          x + dx * reach - dy * spread,
          y + dy * reach + dx * spread,
          x + dx * reach + dy * spread,
          y + dy * reach - dx * spread,
        ])
          .fill({ color: maxPower ? 0xffc261 : 0xe47946, alpha: 0.75 })
          .stroke({ color: 0x17252b, width: unit });
      }
      const path = () => {
        g.circle(cx, cy, 8 * unit);
        for (const [a, b] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const)
          g.moveTo(cx + a * 11 * unit, cy + b * 11 * unit).lineTo(
            cx + a * 5 * unit,
            cy + b * 5 * unit,
          );
      };
      path();
      g.stroke({ color: 0x17252b, width: 4 * unit, alpha: 0.8 });
      path();
      g.stroke({ color, width: 1.5 * unit });
      g.circle(cx, cy, 1.5 * unit).fill(0xfff4d9);
      return;
    }

    if (worm.laser && terrain) {
      // Laser sight: a thin dark red line out to the first solid pixel.
      let d = 12;
      while (d < 900 && !terrain.isSolid(x + dx * d, y + dy * d)) d += 2;
      for (let t = 12; t < d; t += k) {
        g.rect(snap(x + dx * t, k), snap(y + dy * t, k), k, k).fill(LASER);
      }
      const ex = snap(x + dx * d, k);
      const ey = snap(y + dy * d, k);
      g.rect(ex - k, ey - k, k * 3, k * 3).fill(LASER_END);
    }

    // Lit pixels as grid cells (in units of k), later writes win.
    const lit = new Map<number, number>();
    const put = (i: number, j: number, color: number): void => {
      lit.set(key(i, j), color);
    };

    if (charging && power > 0) {
      const len = WEDGE_LEN * power;
      const ox = x;
      const oy = y;
      const reach = Math.ceil((WEDGE_START + len + 5 * k) / k);
      const i0 = Math.floor(ox / k);
      const j0 = Math.floor(oy / k);
      for (let j = j0 - reach; j <= j0 + reach; j++) {
        for (let i = i0 - reach; i <= i0 + reach; i++) {
          // Cell centre relative to the worm centre, split along / across the aim line.
          const rx = (i + 0.5) * k - ox;
          const ry = (j + 0.5) * k - oy;
          const t = rx * dx + ry * dy - WEDGE_START;
          if (t < 0 || t > len) continue;
          const s = Math.abs(rx * -dy + ry * dx);
          const width = 1 + 8 * (t / WEDGE_LEN);
          // A little slack keeps the thin tip from breaking into diagonal dots.
          if (s > (width * k) / 2 + k * 0.3) continue;
          const band = Math.min(3, Math.floor((t / WEDGE_LEN) * 4));
          let color = BANDS[band] as number;
          // 2x2 checker dither across the band borders.
          const edge = (t / WEDGE_LEN) * 4 - band;
          if (band < 3 && edge > 1 - (2 * k) / (WEDGE_LEN / 4) && (i + j) % 2 === 0)
            color = BANDS[band + 1] as number;
          if (band === 3 && s < k) color = SPINE;
          if (maxPower && s < k * 0.5) color = YELLOW;
          put(i, j, color);
        }
      }
    }

    // Crosshair, centred on a grid cell.
    const ci = Math.round((x + dx * CROSSHAIR_DIST) / k);
    const cj = Math.round((y + dy * CROSSHAIR_DIST) / k);
    const ringColor = maxPower && Math.floor(this.frame / FLASH_FRAMES) % 2 === 0 ? YELLOW : CYAN;
    // Idle: the ticks breathe out and in by a pixel; steady while charging.
    const shift = !charging && Math.floor(this.frame / IDLE_STEP_FRAMES) % 2 === 1 ? 1 : 0;
    for (let row = 0; row < 13; row++) {
      for (let col = 0; col < 13; col++) {
        const c = CROSSHAIR[row]?.[col];
        if (c === '.' || c === undefined) continue;
        let i = ci + col - 6;
        let j = cj + row - 6;
        if (c === 'T') {
          if (col === 6) j += row < 6 ? -shift : shift;
          else i += col < 6 ? -shift : shift;
        }
        put(i, j, c === 'W' ? WHITE : c === 'r' ? ringColor : CYAN);
      }
    }
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const)
      put(ci + di, cj + dj, CYAN);
    put(ci, cj, WHITE);

    // 1px halo first, then the lit pixels.
    const halo = new Set<number>();
    for (const kk of lit.keys()) {
      const [i, j] = unkey(kk);
      for (let b = -1; b <= 1; b++)
        for (let a = -1; a <= 1; a++) {
          const n = key(i + a, j + b);
          if (!lit.has(n)) halo.add(n);
        }
    }
    for (const kk of halo) {
      const [i, j] = unkey(kk);
      g.rect(i * k, j * k, k, k).fill(HALO);
    }
    for (const [kk, color] of lit) {
      const [i, j] = unkey(kk);
      g.rect(i * k, j * k, k, k).fill(color);
    }
  }
}

const OFFSET = 32768;
const key = (i: number, j: number): number => (i + OFFSET) * 65536 + (j + OFFSET);
const unkey = (kk: number): [number, number] => [
  Math.floor(kk / 65536) - OFFSET,
  (kk % 65536) - OFFSET,
];
const snap = (v: number, k: number): number => Math.round(v / k) * k;
