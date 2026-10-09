import type { BlastSpec } from './explosion';
import { powerScale } from './weapon';

/**
 * Damage → crater diameter, from the W:A power table for the Bazooka and Grenade
 * (worms2d.info): 25 hp ≈ 47 px … 50 hp (standard, power 3) ≈ 97 px … 100 hp ≈ 199 px across.
 */
const CRATER_TABLE: [damage: number, diameter: number][] = [
  [25, 47],
  [35, 73],
  [40, 85],
  [45, 85],
  [50, 97],
  [55, 111],
  [60, 123],
  [65, 123],
  [75, 147],
  [100, 199],
];

/** Crater diameter in pixels for a given maximum damage (piecewise linear through the table). */
export function craterDiameter(damage: number): number {
  const first = CRATER_TABLE[0] as [number, number];
  if (damage <= first[0]) return (first[1] * damage) / first[0];
  for (let i = 1; i < CRATER_TABLE.length; i++) {
    const [d1, c1] = CRATER_TABLE[i] as [number, number];
    if (damage <= d1) {
      const [d0, c0] = CRATER_TABLE[i - 1] as [number, number];
      return c0 + ((c1 - c0) * (damage - d0)) / (d1 - d0);
    }
  }
  const last = CRATER_TABLE[CRATER_TABLE.length - 1] as [number, number];
  return (last[1] * damage) / last[0];
}

/**
 * Standard explosion for a weapon of the given base damage and scheme power level (1..5 stars map to
 * 40/45/50/55/60 hp for a 50 hp weapon). The damage radius reaches a little past the crater.
 */
export function scaledBlast(damage: number, level = 3, extra: Partial<BlastSpec> = {}): BlastSpec {
  const dmg = damage * powerScale(level);
  const crater = craterDiameter(dmg) / 2;
  return { damage: dmg, crater, radius: crater * 1.15, ...extra };
}
