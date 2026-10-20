import { describe, expect, it } from 'vitest';
import { computeViewport, forceScale, menuScale, parseKOverride } from '../src/viewport';

describe('computeViewport', () => {
  // [css w, css h, dpr, kd, logical w, logical h]
  const table: [number, number, number, number, number, number][] = [
    [1280, 720, 1, 2, 640, 360],
    [1280, 720, 2, 4, 640, 360],
    [1920, 1080, 1, 3, 640, 360],
    [1920, 1080, 1.25, 3, 800, 450],
    [1920, 1080, 1.5, 4, 720, 405],
    [2560, 1440, 1, 4, 640, 360],
    [3840, 2160, 1, 6, 640, 360],
    [1600, 900, 1, 2, 800, 450],
    [1366, 768, 1, 2, 683, 384],
    [1920, 1200, 1, 3, 640, 400],
    [1024, 768, 1, 1, 1024, 768],
    [800, 600, 1, 1, 800, 600],
  ];

  it.each(table)('%ix%i @%f -> kd %i, view %f x %f', (w, h, dpr, kd, lw, lh) => {
    const v = computeViewport(w, h, dpr);
    expect(v.kd).toBe(kd);
    expect(v.cssScale).toBeCloseTo(kd / dpr, 12);
    expect(v.logicalW).toBeCloseTo(lw, 6);
    expect(v.logicalH).toBeCloseTo(lh, 6);
  });

  it('never drops below the 640x360 base view and never scales below 1', () => {
    for (const [w, h, dpr] of [
      [320, 240, 1],
      [500, 300, 1],
      [640, 360, 1],
      [1000, 200, 3],
    ] as const) {
      const v = computeViewport(w, h, dpr);
      expect(v.kd).toBeGreaterThanOrEqual(1);
      expect(v.logicalW).toBeGreaterThanOrEqual(640);
      expect(v.logicalH).toBeGreaterThanOrEqual(360);
    }
  });

  it('the view always covers the window: logical size * cssScale >= css size', () => {
    for (const [w, h, dpr] of [
      [1366, 768, 1],
      [1920, 1080, 1.25],
      [1111, 777, 1.5],
      [2560, 1440, 2],
    ] as const) {
      const v = computeViewport(w, h, dpr);
      expect(v.logicalW * v.cssScale).toBeGreaterThanOrEqual(w - 1e-6);
      expect(v.logicalH * v.cssScale).toBeGreaterThanOrEqual(h - 1e-6);
    }
  });

  it('treats a missing or zero dpr as 1', () => {
    expect(computeViewport(1280, 720, 0).kd).toBe(2);
  });
});

describe('forceScale', () => {
  it('uses the given kd', () => {
    const v = forceScale(1920, 1080, 1, 2);
    expect(v.kd).toBe(2);
    expect(v.logicalW).toBeCloseTo(960, 6);
    // Asking for more than fits clamps the view to the base size.
    expect(forceScale(1280, 720, 1, 3).logicalW).toBe(640);
  });
});

describe('menuScale', () => {
  it('is 1 at 1280x720 and below, 2 at 1920x1080, stays integer', () => {
    expect(menuScale(1280, 720, 1)).toBe(1);
    expect(menuScale(1024, 768, 1)).toBe(1);
    expect(menuScale(800, 500, 1)).toBe(1);
    expect(menuScale(1920, 1080, 1)).toBe(2);
    expect(menuScale(2560, 1440, 1)).toBe(2);
    expect(menuScale(3840, 2160, 1)).toBe(4);
    expect(menuScale(1280, 720, 2)).toBe(2);
  });
});

describe('parseKOverride', () => {
  it('accepts positive integers only', () => {
    expect(parseKOverride('?k=3')).toBe(3);
    expect(parseKOverride('?seed=1&k=2')).toBe(2);
    expect(parseKOverride('?k=0')).toBeUndefined();
    expect(parseKOverride('?k=1.5')).toBeUndefined();
    expect(parseKOverride('?k=abc')).toBeUndefined();
    expect(parseKOverride('')).toBeUndefined();
  });
});
