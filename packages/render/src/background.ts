import { Container, FillGradient, Graphics } from 'pixi.js';
import { hex, mix } from './color';
import type { Theme } from './theme';
import type { Camera } from './camera';

interface Layer {
  g: Graphics;
  factor: number;
  baseY: number;
}

/** Sky gradient plus a few procedurally generated silhouette layers scrolling with parallax. */
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
      const color = (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);
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
      g.moveTo(-1000, 2000);
      for (let x = -1000; x <= width; x += 16) g.lineTo(x, ridge(x));
      g.lineTo(width, 2000).closePath().fill(color);
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

  private drawSky(w: number, h: number): void {
    this.skyW = w;
    this.skyH = h;
    const gradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: this.theme.skyTop },
        { offset: 1, color: this.theme.skyBottom },
      ],
    });
    this.sky.clear().rect(0, 0, w, h).fill(gradient);
  }
}
