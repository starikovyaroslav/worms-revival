import { describe, expect, it } from 'vitest';
import type { Container } from 'pixi.js';
import { Camera, deviceScale, distinctLevels } from '../src/camera';

function cam(kd: number, dpr: number, w = 1280, h = 720): Camera {
  const c = new Camera({ width: 2000, height: 1000 });
  c.setBase(kd, dpr);
  c.resize(w, h);
  return c;
}

describe('camera device scale', () => {
  it('default level 1 is kd device pixels per world pixel (css 2 at 1280x720)', () => {
    expect(cam(2, 1).zoom).toBe(2);
    expect(cam(4, 2).zoom).toBe(2);
    expect(cam(3, 1.25).zoom).toBeCloseTo(2.4, 12);
  });

  it('every level gives a whole number of device pixels', () => {
    for (const kd of [1, 2, 3, 4, 6]) {
      for (const dpr of [1, 1.25, 1.5, 2]) {
        const c = cam(kd, dpr);
        for (const level of [0.5, 1, 2, 3]) {
          c.level = level;
          const dev = c.zoom * dpr;
          expect(Number.isInteger(Math.round(dev * 1e9) / 1e9)).toBe(true);
          expect(dev).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('collapses duplicate steps (0.5 and 1 are both 1x at kd 1)', () => {
    expect(distinctLevels(1)).toEqual([1, 2, 3]);
    expect(distinctLevels(2)).toEqual([0.5, 1, 2, 3]);
    expect(deviceScale(1, 0.5)).toBe(1);
    expect(deviceScale(3, 0.5)).toBe(1);
    expect(deviceScale(3, 1)).toBe(3);
  });

  it('zoomAt walks the distinct levels and clamps at both ends', () => {
    const c = cam(1, 1);
    c.zoomAt(0.5, 0, 0);
    expect(c.level).toBe(1);
    c.zoomAt(1.2, 0, 0);
    c.zoomAt(1.2, 0, 0);
    c.zoomAt(1.2, 0, 0);
    expect(c.level).toBe(3);
    const d = cam(2, 1);
    d.zoomAt(0.5, 0, 0);
    expect(d.level).toBe(0.5);
    d.zoomAt(0.5, 0, 0);
    expect(d.level).toBe(0.5);
  });

  it('zoomAt keeps the world point under the cursor', () => {
    const c = cam(2, 1);
    c.lookAt(900, 400);
    const before = c.toWorld(300, 200);
    c.zoomAt(1.2, 300, 200);
    const after = c.toWorld(300, 200);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });

  it('toWorld(toScreen(p)) is the identity', () => {
    for (const [kd, dpr] of [
      [2, 1],
      [3, 1.25],
      [4, 2],
    ] as const) {
      const c = cam(kd, dpr);
      c.lookAt(777.5, 311.25);
      for (const level of [0.5, 1, 2]) {
        c.level = level;
        const s = c.toScreen(123.4, 567.8);
        const w = c.toWorld(s.x, s.y);
        expect(w.x).toBeCloseTo(123.4, 9);
        expect(w.y).toBeCloseTo(567.8, 9);
      }
    }
  });

  it('apply snaps the container origin to whole device pixels', () => {
    for (const dpr of [1, 1.25, 2]) {
      const c = cam(Math.ceil(2 * dpr), dpr);
      c.lookAt(1000.37, 500.61);
      let pos = { x: 0, y: 0 };
      let scale = 0;
      const fake = {
        scale: { set: (v: number) => (scale = v) },
        position: { set: (x: number, y: number) => (pos = { x, y }) },
      } as unknown as Container;
      c.apply(fake);
      expect(scale).toBeCloseTo(c.zoom, 12);
      for (const v of [pos.x, pos.y]) {
        const dev = v * dpr;
        expect(Math.abs(dev - Math.round(dev))).toBeLessThan(1e-9);
      }
    }
  });
});
