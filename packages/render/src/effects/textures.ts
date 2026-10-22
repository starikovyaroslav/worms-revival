import { Texture } from 'pixi.js';
import { assets } from '../assets';
import { clipTextures } from '../clipEffects';

export type FxTextureId =
  | 'soft'
  | 'smoke'
  | 'spark'
  | 'ring'
  | 'chunk'
  | 'ember'
  | 'px'
  | 'puff'
  | 'paper'
  | 'wool'
  | 'metal'
  | 'banana'
  | 'toxic';

// Deterministic cosmetic noise so the textures look the same on every run.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    return s / 4294967296;
  };
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function softTexture(): Texture {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.28)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return Texture.from(c);
}

/** Billowy smoke puff: many soft blobs, masked so the edge fades out. */
function smokeTexture(seed: number): Texture {
  const [c, g] = canvas(128, 128);
  const r = rng(seed);
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 30;
    const x = 64 + Math.cos(a) * d;
    const y = 64 + Math.sin(a) * d;
    const rad = 16 + r() * 22;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, 'rgba(255,255,255,0.32)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  g.globalCompositeOperation = 'destination-in';
  const mask = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(0.7, 'rgba(0,0,0,0.8)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = mask;
  g.fillRect(0, 0, 128, 128);
  return Texture.from(c);
}

/** Horizontal streak, brightest in the middle: stretched along the velocity of a spark. */
function sparkTexture(): Texture {
  const [c, g] = canvas(64, 16);
  const grad = g.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(32, 8, 32, 5, 0, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'destination-in';
  const v = g.createLinearGradient(0, 0, 0, 16);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.5, 'rgba(0,0,0,1)');
  v.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = v;
  g.fillRect(0, 0, 64, 16);
  return Texture.from(c);
}

function ringTexture(): Texture {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.72, 'rgba(255,255,255,0)');
  grad.addColorStop(0.88, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.95, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return Texture.from(c);
}

function emberTexture(): Texture {
  const [c, g] = canvas(32, 32);
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return Texture.from(c);
}

/**
 * Retro look: shrinks a smooth texture to a handful of pixels and makes every pixel fully opaque
 * or fully transparent, so effects are made of crisp squares, never soft gradients.
 */
function pixelate(tex: Texture, w: number, h: number, cut = 0.45): Texture {
  const src = tex.source.resource as HTMLCanvasElement;
  const [c, g] = canvas(w, h);
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, w, h);
  // Only the small result survives; the temporary high-resolution canvas has no consumers.
  tex.destroy(true);
  const d = g.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) {
    const on = (d.data[i * 4 + 3] as number) / 255 >= cut;
    d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = 255;
    d.data[i * 4 + 3] = on ? 255 : 0;
  }
  g.putImageData(d, 0, 0);
  const t = Texture.from(c);
  t.source.scaleMode = 'nearest';
  return t;
}

function fromPixels(w: number, h: number, paint: (x: number, y: number) => number | null): Texture {
  const [c, g] = canvas(w, h);
  const d = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = paint(x, y);
      const o = (y * w + x) * 4;
      if (col === null) continue;
      d.data[o] = (col >> 16) & 255;
      d.data[o + 1] = (col >> 8) & 255;
      d.data[o + 2] = col & 255;
      d.data[o + 3] = 255;
    }
  }
  g.putImageData(d, 0, 0);
  const t = Texture.from(c);
  t.source.scaleMode = 'nearest';
  return t;
}

/** A solid 1x1 pixel: sparks, droplets, embers (scaled by whole numbers). */
function pxTexture(): Texture {
  return fromPixels(1, 1, () => 0xffffff);
}

/** A 3x3 earth clod, white with a darker lower-right edge so tinting keeps the light direction. */
function clodTexture(seed: number): Texture {
  const r = rng(seed);
  const cut = Math.floor(r() * 4);
  return fromPixels(3, 3, (x, y) => {
    if ((x === 0 || x === 2) && (y === 0 || y === 2) && (x + y * 2) % 4 === cut) return null;
    return x === 2 || y === 2 ? 0xb4b4b4 : 0xffffff;
  });
}

/**
 * A pixel smoke puff in baked DB32 greys: lit top left, shaded bottom right, darker outline on the
 * shaded edge. Built from a few overlapping discs so the outline is lumpy.
 */
function puffTexture(n: number, seed: number): Texture {
  const r = rng(seed);
  const c = (n - 1) / 2;
  const discs = [{ x: c, y: c, r: n * 0.34 }];
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2;
    discs.push({
      x: c + Math.cos(a) * n * 0.24,
      y: c + Math.sin(a) * n * 0.24,
      r: n * (0.14 + r() * 0.1),
    });
  }
  const inside = (x: number, y: number) =>
    discs.some((d) => (x - d.x) ** 2 + (y - d.y) ** 2 <= d.r * d.r);
  return fromPixels(n, n, (x, y) => {
    if (!inside(x, y)) return null;
    const edgeBR = !inside(x + 1, y) || !inside(x, y + 1);
    const lit = (x + y) / (2 * n);
    if (edgeBR && lit > 0.35) return 0x595652;
    return lit < 0.34 ? 0x9badb7 : lit < 0.58 ? 0x847e87 : 0x696a6a;
  });
}

/** All procedural effect textures. Replace with hand-made atlases later (same ids). */
export function createFxTextures(
  owned = new Set<Texture>(),
  namespace = 'vfx',
): Record<FxTextureId, Texture[]> {
  const smoke = clipTextures('smoke', namespace),
    gas = clipTextures('gas');
  const paper = clipTextures('letter');
  const banana = assets.get('creatures/banana_1');
  const shared = new Set([...smoke, ...gas, ...paper, ...(banana ? [banana] : [])]);
  const result: Record<FxTextureId, Texture[]> = {
    soft: [pixelate(softTexture(), 16, 16, 0.4)],
    smoke: smoke.length ? smoke : [1, 2, 3, 4].map((n) => pixelate(smokeTexture(n), 16, 16, 0.3)),
    spark: [pixelate(sparkTexture(), 8, 2, 0.35)],
    ring: [pixelate(ringTexture(), 48, 48, 0.35)],
    chunk: [1, 2, 3, 4].map((n) => clodTexture(n)),
    ember: [pixelate(emberTexture(), 2, 2, 0.4)],
    px: [pxTexture()],
    // Smoke life stages, small to large (see BurstLayer.stages).
    puff: smoke.length ? smoke : [12, 18, 24, 30].map((n, i) => puffTexture(n, 7 + i)),
    paper: paper.length ? paper : [pxTexture()],
    wool: [puffTexture(5, 3)],
    metal: [fromPixels(3, 2, (x, y) => (x === 0 ? 0x696a6a : y === 0 ? 0xcbdbfc : 0x9badb7))],
    banana: banana ? [banana] : [pxTexture()],
    toxic: gas.length ? gas : [puffTexture(8, 4)],
  };
  for (const texture of Object.values(result).flat()) {
    if (!shared.has(texture)) owned.add(texture);
  }
  return result;
}
