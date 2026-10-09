import { Container, Graphics } from 'pixi.js';
import { hex, mix, type RGB } from './color';
import { snap } from './palette';
import type { Theme } from './theme';
import type { Camera } from './camera';

interface Layer {
  g: Graphics;
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
      // Far layers fade into the sky (aerial perspective).
      const base = hex(theme.hills[i] ?? theme.skyTop);
      const c = mix(sky, base, 0.45 + depth * 0.5);
      // Flat palette colours: the hill, a darker lower half, and a dark outline on the ridge.
      const set = theme.hillColors?.[i];
      const color = set ? set[0] : snapRgb(c);
      const shadeColor = set ? set[1] : snapRgb(c, 0.8);
      const outlineColor = set ? set[2] : snapRgb(c, 0.55);
      const g = new Graphics();
      const width = mapWidth * 2 + 2000;
      const ridge = (x: number) => {
        let h = 0;
        for (let o = 0; o < 4; o++) {
          const f = (0.002 + i * 0.0012) * (o + 1) * 1.7;
          h += (Math.sin(x * f + seed * (o + 3) + i * 11.3) * (120 - i * 25)) / (o + 1);
        }
        return h;
      };
      const STEP = 8;
      // Heights are rounded to whole pixels so the silhouette is a staircase, not a smooth curve.
      const ry = (x: number) => Math.round(ridge(x) / 2) * 2;
      g.moveTo(-1000, 2000);
      for (let x = -1000; x <= width; x += STEP) g.lineTo(x, ry(x));
      g.lineTo(width, 2000).closePath().fill(color);
      // Lower half in shade (two-tone cel look).
      g.moveTo(-1000, 2000);
      for (let x = -1000; x <= width; x += STEP) g.lineTo(x, ry(x) + 46);
      g.lineTo(width, 2000).closePath().fill(shadeColor);
      for (let x = -1000; x <= width; x += STEP) {
        if (x === -1000) g.moveTo(x, ry(x));
        else g.lineTo(x, ry(x));
      }
      g.stroke({ color: outlineColor, width: 3 });
      this.container.addChild(g);
      this.layers.push({ g, factor: 0.15 + i * 0.2, baseY: mapHeight * (0.35 + i * 0.12) });
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
    // Dither strips, drawn only where neighbouring bands differ.
    for (let i = 1; i < BANDS; i++) {
      if (colors[i] === colors[i - 1]) continue;
      const y = Math.floor((i * h) / BANDS);
      for (let row = 0; row < DITHER; row += 4) {
        // Alternate blocks of the lower colour in a checker pattern, thinning out upwards.
        const density = row / DITHER;
        for (let x = 0; x < w; x += 8) {
          const offset = (row / 4) % 2 === 0 ? 0 : 4;
          if (density < 0.5 || (x / 8) % 2 === 0)
            g.rect(x + offset, y - DITHER + row, 4, 4).fill(colors[i] as number);
        }
      }
    }
  }
}
