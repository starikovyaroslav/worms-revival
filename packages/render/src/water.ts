import { Container, Graphics, Texture, TilingSprite } from 'pixi.js';
import { Material, type Terrain } from '@wr/sim';
import { hex, mix, shade } from './color';
import { snapColor } from './palette';
import type { Theme } from './theme';

const toNum = (c: [number, number, number]) =>
  (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);

/** Wave profile period in world pixels (every layer scrolls through it in whole pixels). */
const PERIOD = 256;
/** Column width of the stepped waves. */
const COL = 2;
/** Vertical step of the gradient bands, in world pixels. */
const BAND = 30;
/** Height of the dithered transition between two bands. */
const DITHER_H = 4;

/** Integer wave heights over one period: sums of sines with whole numbers of cycles. */
function profile(seed: number, amp: number): Int8Array {
  const out = new Int8Array(PERIOD);
  for (let x = 0; x < PERIOD; x++) {
    const a = Math.sin(((x * 2 * Math.PI) / PERIOD) * 3 + seed);
    const b = Math.sin(((x * 2 * Math.PI) / PERIOD) * 5 + seed * 2.3) * 0.45;
    out[x] = Math.round((a + b) * amp);
  }
  return out;
}

/** A 2x2 checker tile: tinted, it dithers one gradient band into the next. */
function checker(): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 1, 1);
  g.fillRect(1, 1, 1, 1);
  const t = Texture.from(c);
  t.source.scaleMode = 'nearest';
  return t;
}

/**
 * Water drawn in world space on the pixel grid. The back layer (an opaque gradient of DB32 bands
 * under a far wave) sits behind the land and the worms; the front layer (two translucent stepped
 * waves, crest sparkles and foam where the surface touches land) in front of them. Waves are
 * integer-height profiles scrolled in whole pixels, drawn only for the columns on screen.
 */
export class WaterView {
  readonly back = new Container();
  readonly front = new Container();
  private backBody = new Graphics();
  private dither = new Container();
  private frontWaves = new Graphics();
  private deepTint = new Graphics();
  private foam = new Graphics();
  private time = 0;
  /** Gradient colours from the surface down, snapped to the palette. */
  private ramp: number[];
  private frontColors: [number, number];
  private foamColor = 0xffffff;
  private foamSoft = 0xcbdbfc;
  private deepColor = 0x222034;
  private profiles = [profile(0.7, 1.5), profile(2.1, 2), profile(4.3, 2.4)];
  private checkerTex = checker();
  private bandSprites: TilingSprite[] = [];

  constructor(
    theme: Theme,
    private readonly terrain: Terrain,
  ) {
    this.back.addChild(this.backBody, this.dither);
    this.front.addChild(this.deepTint, this.frontWaves, this.foam);
    const base = hex(theme.water);
    // Surface to depth. Themes list their own DB32 ramp; otherwise derive one from the colour.
    this.ramp = (
      theme.waterRamp ??
      [
        mix(base, [190, 220, 255], 0.3),
        base,
        shade(base, 0.8),
        shade(base, 0.6),
        shade(base, 0.45),
      ].map((c) => snapColor(toNum(c)))
    ).slice();
    if (theme.waterFoam) [this.foamColor, this.foamSoft] = theme.waterFoam;
    this.frontColors = [
      this.ramp[Math.min(2, this.ramp.length - 1)] as number,
      this.ramp[Math.min(3, this.ramp.length - 1)] as number,
    ];
  }

  /** Wave surface (world y) of layer i at column x. */
  private waveY(level: number, i: number, x: number): number {
    const speeds = [-7, 11, -16];
    const offs = Math.floor(this.time * (speeds[i] as number));
    const p = this.profiles[i] as Int8Array;
    const base = [level - 6, level - 3, level + 1][i] as number;
    return base + (p[(((x + offs) % PERIOD) + PERIOD) % PERIOD] as number);
  }

  /** `cx` is the camera's world x and `halfView` half the visible width in world pixels. */
  update(dtMs: number, level: number, cx: number, halfView: number): void {
    this.time += dtMs / 1000;
    const x0 = Math.floor((cx - halfView - 16) / COL) * COL;
    const x1 = Math.ceil((cx + halfView + 16) / COL) * COL;
    const span = x1 - x0;
    const bottom = level + 4000;

    // Back: far wave strip in the first band colour, then flat gradient bands with a dithered seam.
    const b = this.backBody;
    b.clear();
    const r = ramp(this.ramp);
    for (let x = x0; x < x1; x += COL) {
      const wy = this.waveY(level, 0, x);
      b.rect(x, wy, COL, level + 4 - wy).fill(r(0));
    }
    const top = level + 4;
    const n = this.ramp.length;
    for (let i = 0; i < n; i++) {
      const y = top + i * BAND;
      b.rect(x0, y, span, i === n - 1 ? bottom - y : BAND).fill(r(i));
    }
    while (this.bandSprites.length < n - 1) {
      const s = new TilingSprite({ texture: this.checkerTex, width: 1, height: DITHER_H });
      this.dither.addChild(s);
      this.bandSprites.push(s);
    }
    for (let i = 0; i < n - 1; i++) {
      const s = this.bandSprites[i] as TilingSprite;
      s.tint = r(i + 1);
      s.position.set(x0, top + (i + 1) * BAND - DITHER_H);
      s.width = span;
    }

    // Front: two translucent stepped waves (columns, so every edge is on the grid).
    const f = this.frontWaves;
    f.clear();
    for (let i = 1; i <= 2; i++) {
      const col = this.frontColors[i - 1] as number;
      for (let x = x0; x < x1; x += COL) {
        const wy = this.waveY(level, i, x);
        f.rect(x, wy, COL, bottom - wy);
      }
      f.fill({ color: col, alpha: i === 1 ? 0.4 : 0.45 });
    }
    // A 2-row lit skin along the first front wave.
    const skin = this.ramp[0] as number;
    for (let x = x0; x < x1; x += COL) f.rect(x, this.waveY(level, 1, x), COL, 2);
    f.fill({ color: skin, alpha: 0.6 });
    // Darker depth tint, a flat palette colour at low alpha.
    this.deepTint.clear();
    this.deepTint.rect(x0, level + 70, span, 4000).fill({ color: this.deepColor, alpha: 0.28 });

    // Foam: crest sparkles on the front wave, and a 2-row lap wherever the surface touches land.
    const m = this.foam;
    m.clear();
    const phase = Math.floor(this.time * 6);
    const t = this.terrain;
    const solidAt = (x: number, y: number) =>
      x >= 0 &&
      y >= 0 &&
      x < t.width &&
      y < t.height &&
      (t.data[y * t.width + x] as number) !== Material.Air;
    let prev = this.waveY(level, 1, x0 - COL);
    for (let x = x0; x < x1; x += COL) {
      const wy = this.waveY(level, 1, x);
      const wave = (x / COL + phase) & 7;
      // Contact: land and open air both within a few pixels of the waterline in this row.
      const land = solidAt(x - 3, wy) || solidAt(x, wy) || solidAt(x + 3, wy);
      const air = !solidAt(x - 3, wy) || !solidAt(x, wy) || !solidAt(x + 3, wy);
      const contact = land && air;
      if (contact) {
        // Lapping foam: a bright top row over a soft row, bobbing with the wave.
        const lift = wave < 2 ? 1 : 0;
        m.rect(x, wy - 1 - lift, COL, 1).fill(this.foamColor);
        m.rect(x, wy - lift, COL, 2).fill(this.foamSoft);
      } else if (!land && wy < prev && wave % 3 === 0) {
        // A sparkle on a rising crest, here and there.
        m.rect(x, wy - 1, COL, 1).fill(this.foamColor);
      }
      prev = wy;
    }
  }
}

function ramp(colors: number[]): (i: number) => number {
  return (i) => colors[Math.min(colors.length - 1, Math.max(0, i))] as number;
}
