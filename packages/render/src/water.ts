import { Container, FillGradient, Graphics } from 'pixi.js';
import { hex, mix, shade } from './color';
import type { Theme } from './theme';

const toNum = (c: [number, number, number]) =>
  (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);

/**
 * Animated water drawn in world space: a deep body behind the action plus wave strips.
 * The back layer goes behind entities, the front layer in front of them.
 */
export class WaterView {
  readonly back = new Container();
  readonly front = new Container();
  private backWaves = new Graphics();
  private frontWaves = new Graphics();
  private depth = new Graphics();
  private deep: [number, number, number];
  private time = 0;
  private colors: number[];

  constructor(
    theme: Theme,
    private readonly mapWidth: number,
  ) {
    this.back.addChild(this.backWaves);
    // Deep water darkens with depth (drawn in front of the waves, behind the foam).
    this.front.addChild(this.depth);
    this.front.addChild(this.frontWaves);
    const base = hex(theme.water);
    this.deep = shade(base, 0.35);
    this.colors = [
      toNum(shade(base, 0.8)),
      toNum(base),
      toNum(mix(base, [255, 255, 255], 0.15)),
      toNum(mix(base, [255, 255, 255], 0.3)),
    ];
  }

  update(dtMs: number, level: number): void {
    this.time += dtMs / 1000;
    const x0 = -3000;
    const x1 = this.mapWidth + 3000;
    this.backWaves.clear();
    this.frontWaves.clear();
    const layers = 4;
    for (let i = 0; i < layers; i++) {
      const g = i < 2 ? this.backWaves : this.frontWaves;
      const y = level - 14 + i * 9;
      const amp = 3 + i * 1.2;
      const speed = (i % 2 ? -1 : 1) * (0.6 + i * 0.25);
      g.moveTo(x0, y + 4000);
      for (let x = x0; x <= x1; x += 12) {
        const wy =
          y +
          Math.sin(x * 0.03 + this.time * speed * 2 + i) * amp +
          Math.sin(x * 0.011 - this.time * speed) * amp * 0.6;
        g.lineTo(x, wy);
      }
      g.lineTo(x1, y + 4000).closePath();
      g.fill({ color: this.colors[i] as number, alpha: i < 2 ? 1 : 0.75 });
    }

    // Depth: transparent at the surface, dark navy further down.
    const top = level + 4;
    const dc = this.deep.map((v) => Math.round(v));
    const grad = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: `rgba(${dc[0]},${dc[1]},${dc[2]},0)` },
        { offset: 1, color: `rgba(${dc[0]},${dc[1]},${dc[2]},0.8)` },
      ],
    });
    this.depth
      .clear()
      .rect(x0, top, x1 - x0, 360)
      .fill(grad)
      .rect(x0, top + 360, x1 - x0, 4000)
      .fill({ color: toNum(this.deep as [number, number, number]), alpha: 0.8 });

    // Foam: bright wavy lines riding the crest of the front waves.
    const foam = this.frontWaves;
    for (const [i, width, alpha] of [
      [3, 2.2, 0.85],
      [2, 1.2, 0.4],
    ] as const) {
      const y = level - 14 + i * 9;
      const amp = 3 + i * 1.2;
      const speed = (i % 2 ? -1 : 1) * (0.6 + i * 0.25);
      for (let x = x0; x <= x1; x += 12) {
        const wy =
          y +
          Math.sin(x * 0.03 + this.time * speed * 2 + i) * amp +
          Math.sin(x * 0.011 - this.time * speed) * amp * 0.6;
        if (x === x0) foam.moveTo(x, wy);
        else foam.lineTo(x, wy);
      }
      foam.stroke({ color: 0xffffff, width, alpha });
    }
  }
}
