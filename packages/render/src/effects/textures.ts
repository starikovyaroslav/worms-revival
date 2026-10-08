import { Texture } from 'pixi.js';

export type FxTextureId = 'soft' | 'smoke' | 'spark' | 'ring' | 'chunk' | 'ember';

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

/** Irregular little rock, white so it can be tinted to any terrain colour. */
function chunkTexture(seed: number): Texture {
  const [c, g] = canvas(24, 24);
  const r = rng(seed);
  g.fillStyle = '#fff';
  g.beginPath();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = 7 + r() * 4;
    const x = 12 + Math.cos(a) * rad;
    const y = 12 + Math.sin(a) * rad;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  // Light from the top left: a darker lower right edge.
  g.globalCompositeOperation = 'source-atop';
  const shade = g.createLinearGradient(4, 4, 20, 20);
  shade.addColorStop(0, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 24, 24);
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

/** All procedural effect textures. Replace with hand-made atlases later (same ids). */
export function createFxTextures(): Record<FxTextureId, Texture[]> {
  return {
    soft: [softTexture()],
    smoke: [smokeTexture(1), smokeTexture(2), smokeTexture(3), smokeTexture(4)],
    spark: [sparkTexture()],
    ring: [ringTexture()],
    chunk: [chunkTexture(1), chunkTexture(2), chunkTexture(3), chunkTexture(4)],
    ember: [emberTexture()],
  };
}
