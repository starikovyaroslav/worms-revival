import type { BlastSpec } from './explosion';
import { powerScale } from './weapon';

/**
 * Standard explosion for a weapon of the given base damage and scheme power level.
 * The crater and damage radius grow with damage, as in W:A (25 dmg ≈ 47 px, 100 dmg ≈ 199 px
 * across): crater radius ≈ 0.6 × damage, damage radius ≈ 1.1 × damage.
 */
export function scaledBlast(damage: number, level = 3, extra: Partial<BlastSpec> = {}): BlastSpec {
  const dmg = damage * powerScale(level);
  return { damage: dmg, crater: dmg * 0.6, radius: dmg * 1.1, ...extra };
}
