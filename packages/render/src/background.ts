import { CanvasSource, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { hex, mix, type RGB } from './color';
import { snap } from './palette';
import type { Theme } from './theme';
import type { Camera } from './camera';

interface Layer {
  g: Container;
  factor: number;
  baseY: number;
}

const snapRgb = (c: RGB, k = 1) => snap(c[0] * k, c[1] * k, c[2] * k);

/** Sky bands plus a few procedurally generated silhouette layers scrolling with parallax. */
export class Background {
  readonly container = new Container();
  private sky = new Graphics();
  private layers: Layer[] = [];
  private skyW = 0;
  private skyH = 0;

  constructor(
    private theme: Theme,
    private readonly mapWidth: number,
    private readonly mapHeight: number,
    seed = 1,
  ) {
    this.container.addChild(this.sky);
    const sky = hex(theme.skyBottom);
    const count = 3;
    for (let i = 0; i < count; i++) {
      const depth = (i + 1) / (count + 1);
      // Atmospheric perspective: the backdrop must read as "far away" and never compete with
      // the playable terrain. Every layer — even themed ones — is pushed toward the near-horizon
      // haze, gently desaturated, and the farther the layer the more it dissolves into the sky.
      // Bold cartoon outlines belong to the foreground, so the ridges get no dark stroke either.
      const haze = mix(hex(theme.skyTop), sky, 0.5);
      const keep = 0.4 + depth * 0.42;
      const base = hex(theme.hills[i] ?? theme.skyTop);
      const set = theme.hillColors?.[i];
      const raw = set ? hex(set[0]) : base;
      const rawShade = set ? hex(set[1]) : mix(raw, [0, 0, 0], 0.25);
      // Aerial fade: toward the near-horizon haze plus a gentle desaturation. Returns an RGB the
      // caller can shade further (for the rim) without reintroducing the raw, saturated hue.
      const faded = (col: RGB): RGB => {
        const m = mix(haze, col, keep);
        const luma = 0.3 * m[0] + 0.59 * m[1] + 0.11 * m[2];
        return mix(m, [luma, luma, luma], 0.35);
      };
      const fillRGB = faded(raw);
      const color = snapRgb(fillRGB);
      const shadeColor = snapRgb(faded(mix(raw, rawShade, 0.55)));
      const rimColor = snapRgb(mix(fillRGB, [255, 255, 255], 0.2));

      // Render the layer at a LOW resolution, then upscale with nearest-neighbour so it becomes
      // chunky, defocused "big pixels" — exactly how the original backgrounds were low-detail
      // art scaled up. Farther layers use larger pixels, so they blur out more (depth of field).
      const res = 4 + (count - 1 - i) * 3;
      const width = mapWidth * 2 + 2000;
      const TOP = -320;
      const BOTTOM = 2000;
      const ridge = (x: number) => {
        let h = 0;
        for (let o = 0; o < 4; o++) {
          const f = (0.002 + i * 0.0012) * (o + 1) * 1.7;
          h += (Math.sin(x * f + seed * (o + 3) + i * 11.3) * (120 - i * 25)) / (o + 1);
        }
        return h;
      };
      const holder = new Container();
      const canvas = document.createElement('canvas');
      const Wc = Math.ceil((width + 1000) / res) + 1;
      const Hc = Math.ceil((BOTTOM - TOP) / res) + 1;
      canvas.width = Wc;
      canvas.height = Hc;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const css = (c: number) => `#${(c >>> 0).toString(16).padStart(6, '0')}`;
        const cy = (cu: number) => (ridge(-1000 + cu * res) - TOP) / res;
        ctx.beginPath();
        ctx.moveTo(0, Hc);
        for (let cu = 0; cu <= Wc; cu++) ctx.lineTo(cu, cy(cu));
        ctx.lineTo(Wc, Hc);
        ctx.closePath();
        ctx.fillStyle = css(color);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, Hc);
        for (let cu = 0; cu <= Wc; cu++) ctx.lineTo(cu, cy(cu) + 46 / res);
        ctx.lineTo(Wc, Hc);
        ctx.closePath();
        ctx.fillStyle = css(shadeColor);
        ctx.fill();
        ctx.beginPath();
        for (let cu = 0; cu <= Wc; cu++) {
          const yy = cy(cu);
          if (cu === 0) ctx.moveTo(cu, yy);
          else ctx.lineTo(cu, yy);
        }
        ctx.strokeStyle = css(rimColor);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      const source = new CanvasSource({ resource: canvas, scaleMode: 'nearest' });
      source.scaleMode = 'nearest';
      const sprite = new Sprite(new Texture({ source }));
      sprite.scale.set(res);
      sprite.x = -1000;
      sprite.y = TOP;
      holder.addChild(sprite);
      this.container.addChild(holder);
      this.layers.push({ g: holder, factor: 0.15 + i * 0.2, baseY: mapHeight * (0.35 + i * 0.12) });
    }
  }

  update(camera: Camera, screenW: number, screenH: number): void {
    if (screenW !== this.skyW || screenH !== this.skyH) this.drawSky(screenW, screenH);
    for (const l of this.layers) {
      // Each layer moves at a fraction of the camera speed and is scaled less than the world.
      const z = 1 + (camera.zoom - 1) * l.factor;
      l.g.scale.set(z);
      l.g.position.set(
        screenW / 2 - (camera.x * l.factor + this.mapWidth * (1 - l.factor) * 0.5) * z,
        screenH / 2 + (l.baseY - (camera.y * l.factor + this.mapHeight * (1 - l.factor) * 0.5)) * z,
      );
    }
  }

  /** Flat sky bands from the palette, with a checkerboard dither strip at each boundary. */
  private drawSky(w: number, h: number): void {
    this.skyW = w;
    this.skyH = h;
    const top = hex(this.theme.skyTop);
    const bottom = hex(this.theme.skyBottom);
    const BANDS = this.theme.sky?.length ?? 9;
    const DITHER = 12;
    const colors: number[] = this.theme.sky
      ? this.theme.sky.slice()
      : Array.from({ length: BANDS }, (_, i) => snapRgb(mix(top, bottom, (i + 0.5) / BANDS)));
    const g = this.sky.clear();
    for (let i = 0; i < BANDS; i++) {
      const y0 = Math.floor((i * h) / BANDS);
      const y1 = Math.floor(((i + 1) * h) / BANDS);
      g.rect(0, y0, w, y1 - y0 + 1).fill(colors[i] as number);
    }
    // Dither strips, drawn only where neighbouring bands differ. Fine 2px cells thin out toward
    // the upper band so the transition reads as a soft haze, not a holey checkerboard.
    for (let i = 1; i < BANDS; i++) {
      if (colors[i] === colors[i - 1]) continue;
      const y = Math.floor((i * h) / BANDS);
      for (let row = 0; row < DITHER; row += 2) {
        const density = row / DITHER;
        for (let x = 0; x < w; x += 4) {
          const offset = (row / 2) % 2 === 0 ? 0 : 2;
          if (density < 0.4 || (x / 4) % 2 === 0)
            g.rect(x + offset, y - DITHER + row, 2, 2).fill(colors[i] as number);
        }
      }
    }
  }
}
