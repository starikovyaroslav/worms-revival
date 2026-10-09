import { Container, Graphics } from 'pixi.js';
import { hex, mix, shade } from './color';
import { snapColor } from './palette';
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
  private base: [number, number, number];
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
    this.base = base;
    this.deep = shade(base, 0.35);
    // Four flat palette shades, deep to bright. Cap the highlights toward a soft sky tint so the
    // near-shore water never turns neon.
    this.colors = [
      snapColor(toNum(shade(base, 0.7))),
      snapColor(toNum(shade(base, 0.9))),
      snapColor(toNum(mix(base, [190, 220, 255], 0.16))),
      snapColor(toNum(mix(base, [190, 220, 255], 0.3))),
    ];
  }

  /** Wave height at x for layer i, rounded to whole pixels (stepped, not smooth). */
  private waveY(level: number, i: number, x: number): number {
    const y = level - 14 + i * 9;
    const amp = 3 + i * 1.2;
    const speed = (i % 2 ? -1 : 1) * (0.6 + i * 0.25);
    return Math.round(
      y +
        Math.sin(x * 0.03 + this.time * speed * 2 + i) * amp +
        Math.sin(x * 0.011 - this.time * speed) * amp * 0.6,
    );
  }

  update(dtMs: number, level: number): void {
    this.time += dtMs / 1000;
    const x0 = -3000;
    const x1 = this.mapWidth + 3000;
    this.backWaves.clear();
    this.frontWaves.clear();
    for (let i = 0; i < 4; i++) {
      const g = i < 2 ? this.backWaves : this.frontWaves;
      g.moveTo(x0, level + 4000);
      for (let x = x0; x <= x1; x += 8) g.lineTo(x, this.waveY(level, i, x));
      g.lineTo(x1, level + 4000).closePath();
      g.fill({ color: this.colors[i] as number, alpha: i < 2 ? 1 : 0.7 });
    }

    // Deep water: several low-contrast bands for a gradual falloff instead of one hard step.
    const deep = snapColor(toNum(this.deep));
    this.depth.clear();
    for (const [dy, a] of [
      [70, 0.22],
      [150, 0.34],
      [340, 0.5],
    ] as [number, number][]) {
      this.depth.rect(x0, level + dy, x1 - x0, 4000).fill({ color: deep, alpha: a });
    }

    // Foam: a broken, dithered highlight along the wave crests only — never a solid painted line.
    const foam = this.frontWaves;
    const foamColor = snapColor(toNum(mix(this.base, [205, 230, 255], 0.82)));
    const phase = Math.floor(this.time * 8);
    for (let x = x0; x <= x1; x += 4) {
      const wy = this.waveY(level, 3, x);
      const crest = wy <= this.waveY(level, 3, x - 4);
      if (crest && ((x >> 2) + phase) % 3 !== 0) {
        foam.moveTo(x, wy);
        foam.lineTo(x + 4, wy);
      }
    }
    foam.stroke({ color: foamColor, width: 1, alpha: 0.85 });
  }
}
