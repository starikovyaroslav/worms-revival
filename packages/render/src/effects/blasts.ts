import { BufferImageSource, Container, Sprite, Texture } from 'pixi.js';

/** Pixel steps per second: blasts are redrawn in discrete frames, like a hand-drawn sprite sheet. */
const STEP = 1 / 15;

// DB32 colours, hot to cool: white, yellow, orange, red, brown, dark purple.
const FIRE = [0xffffff, 0xfbf236, 0xdf7126, 0xac3232, 0x663931, 0x45283c];
const RING = 0xffffff;
const RING_COOL = 0xcbdbfc;
const SPLASH = [0xffffff, 0xcbdbfc, 0x5fcde4];

function hash(i: number): number {
  let h = Math.imul(i, 0x27d4eb2d) ^ 0x165667b1;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

interface Blast {
  kind: 'fireball' | 'splash';
  sprite: Sprite;
  source: BufferImageSource;
  pixels: Uint8Array;
  size: number;
  half: number;
  radius: number;
  age: number;
  life: number;
  step: number;
  /** Distance of each pixel from the centre, and the same divided by the lumpy outline radius. */
  dist: Float32Array;
  norm: Float32Array;
  jitter: Float32Array;
}

/**
 * Procedural pixel-art blasts: a fireball with hard colour bands, a ring and a splash ring, painted
 * 1 texel = 1 world pixel into a small texture and redrawn 15 times a second. Cosmetic only (may use
 * Math.random).
 */
export class PixelBlasts {
  readonly container = new Container();
  private blasts: Blast[] = [];

  get activeCount(): number {
    return this.blasts.length;
  }

  /** Flash, banded fireball and expanding ring for a blast of the given radius (world px). */
  fireball(x: number, y: number, radius: number): void {
    this.add('fireball', x, y, Math.max(8, radius), 0.55);
  }

  /** A flat, expanding ring on the water surface. */
  splash(x: number, y: number, radius: number): void {
    this.add('splash', x, y, Math.max(8, radius), 0.5);
  }

  private add(kind: Blast['kind'], x: number, y: number, radius: number, life: number): void {
    const half = Math.ceil(radius * (kind === 'fireball' ? 1.5 : 1.2)) + 2;
    const size = half * 2;
    const pixels = new Uint8Array(size * size * 4);
    const source = new BufferImageSource({
      resource: pixels,
      width: size,
      height: size,
      scaleMode: 'nearest',
    });
    const sprite = new Sprite(new Texture({ source }));
    sprite.position.set(Math.round(x) - half, Math.round(y) - half);
    // Lumpy outline: a smooth random radius per angle.
    const seed = Math.floor(Math.random() * 1e6);
    const lumps = 12;
    const lump = (a: number) => {
      const f = ((((a / (Math.PI * 2)) % 1) + 1) % 1) * lumps;
      const i = Math.floor(f);
      const u = f - i;
      const s = u * u * (3 - 2 * u);
      const r0 = 0.78 + 0.36 * hash(seed + (i % lumps));
      const r1 = 0.78 + 0.36 * hash(seed + ((i + 1) % lumps));
      return r0 + (r1 - r0) * s;
    };
    const dist = new Float32Array(size * size);
    const norm = new Float32Array(size * size);
    const jitter = new Float32Array(size * size);
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const dx = i - half + 0.5;
        const dy = j - half + 0.5;
        const d = Math.sqrt(dx * dx + dy * dy);
        const k = j * size + i;
        dist[k] = d;
        norm[k] = d / (radius * (kind === 'fireball' ? lump(Math.atan2(dy, dx)) : 1));
        jitter[k] = Math.random();
      }
    }
    this.container.addChild(sprite);
    this.blasts.push({
      kind,
      sprite,
      source,
      pixels,
      size,
      half,
      radius,
      age: 0,
      life,
      step: -1,
      dist,
      norm,
      jitter,
    });
  }

  update(dtMs: number): void {
    const dt = Math.min(0.05, dtMs / 1000);
    let write = 0;
    for (const b of this.blasts) {
      b.age += dt;
      if (b.age >= b.life) {
        b.sprite.destroy({ texture: true, textureSource: true });
        continue;
      }
      this.blasts[write++] = b;
      const step = Math.floor(b.age / STEP);
      if (step === b.step) continue;
      b.step = step;
      if (b.kind === 'fireball') this.paintFireball(b, step);
      else this.paintSplash(b, step);
      b.source.update();
    }
    this.blasts.length = write;
  }

  private put(b: Blast, k: number, color: number): void {
    const o = k * 4;
    b.pixels[o] = (color >> 16) & 255;
    b.pixels[o + 1] = (color >> 8) & 255;
    b.pixels[o + 2] = color & 255;
    b.pixels[o + 3] = 255;
  }

  private paintFireball(b: Blast, step: number): void {
    const u = (step * STEP) / b.life;
    const { pixels, dist, norm, jitter } = b;
    pixels.fill(0);
    // Frames 0-1: a white-hot flash, then the ball swells fast and slows down.
    const flash = step < 2;
    const grow = flash ? 0.55 + step * 0.15 : 0.7 + 0.3 * (1 - (1 - Math.min(1, u * 1.6)) ** 2);
    // The ring races out of the ball over the first 40% of life.
    const ringT = u / 0.4;
    const ringR = b.radius * (0.7 + 0.5 * Math.min(1, ringT));
    const cool = flash ? 0 : u;
    for (let k = 0; k < norm.length; k++) {
      const v = (norm[k] as number) / grow + ((jitter[k] as number) - 0.5) * 0.1;
      if (v < 1) {
        if (flash) {
          this.put(b, k, step === 0 || v < 0.55 ? FIRE[0]! : FIRE[1]!);
          continue;
        }
        // The edge crumbles away in the last third of life.
        if ((jitter[k] as number) < (u - 0.7) * 2) continue;
        const band = Math.floor(Math.max(0, v) * 3.6);
        const idx = band + Math.floor(cool * 3.4);
        if (idx > 4) continue;
        this.put(b, k, FIRE[idx] as number);
      } else if (ringT < 1 && Math.abs((dist[k] as number) - ringR) < 0.75) {
        // Ring of dots (every third pixel along a diagonal pattern), never a solid line.
        const x = k % b.size;
        const y = Math.floor(k / b.size);
        if ((x + 2 * y) % 3 === 0) this.put(b, k, ringT < 0.5 ? RING : RING_COOL);
      }
    }
  }

  private paintSplash(b: Blast, step: number): void {
    const u = (step * STEP) / b.life;
    const { pixels, dist, jitter } = b;
    pixels.fill(0);
    const r = b.radius * (0.25 + 0.75 * (1 - (1 - u) ** 2));
    const size = b.size;
    const half = b.half;
    // A flat ellipse (the surface seen from the side) two pixels thick near the start.
    const thick = u < 0.5 ? 1.5 : 1.0;
    for (let j = 0; j < size; j++) {
      const dy = (j - half + 0.5) * 3.2;
      for (let i = 0; i < size; i++) {
        const k = j * size + i;
        const dx = i - half + 0.5;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(d - r) > thick) continue;
        if (u > 0.55 && (jitter[k] as number) < (u - 0.55) * 2.2) continue;
        this.put(b, k, SPLASH[u < 0.35 ? 0 : u < 0.7 ? 1 : 2] as number);
      }
    }
    void dist;
  }

  clear(): void {
    for (const b of this.blasts) b.sprite.destroy({ texture: true, textureSource: true });
    this.blasts.length = 0;
  }
}
