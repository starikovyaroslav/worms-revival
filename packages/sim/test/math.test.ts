import { describe, expect, it } from 'vitest';
import { atan2, cos, sin, wrapAngle, PI } from '../src/core/math';

describe('deterministic trig', () => {
  it('matches Math.sin/cos closely over a wide range', () => {
    for (let a = -20; a <= 20; a += 0.0137) {
      expect(Math.abs(sin(a) - Math.sin(a))).toBeLessThan(1e-11);
      expect(Math.abs(cos(a) - Math.cos(a))).toBeLessThan(1e-11);
    }
  });

  it('matches Math.atan2 in all quadrants', () => {
    for (let y = -5; y <= 5; y += 0.31) {
      for (let x = -5; x <= 5; x += 0.29) {
        expect(Math.abs(atan2(y, x) - Math.atan2(y, x))).toBeLessThan(1e-10);
      }
    }
    expect(atan2(1, 0)).toBeCloseTo(PI / 2, 12);
    expect(atan2(0, 0)).toBe(0);
  });

  it('wraps angles to (-PI, PI]', () => {
    expect(wrapAngle(3 * PI)).toBeCloseTo(PI, 12);
    expect(wrapAngle(-PI)).toBe(PI);
    expect(wrapAngle(0.5)).toBe(0.5);
  });
});
