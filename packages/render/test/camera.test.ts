import { describe, expect, it } from 'vitest';
import type { Container } from 'pixi.js';
import { Camera, deviceScale, distinctLevels, edgeMarker } from '../src/camera';

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

describe('camera bounds', () => {
  /** The view rectangle must stay within the map plus the margins, whatever the user does. */
  function inside(c: Camera): boolean {
    const tl = c.toWorld(0, 0);
    const br = c.toWorld(c.viewW, c.viewH);
    const m = c.margins;
    const eps = 1e-6;
    return (
      tl.x >= -m.x - eps &&
      br.x <= 2000 + m.x + eps &&
      tl.y >= -m.top - eps &&
      br.y <= 1000 + m.bottom + eps
    );
  }

  it('panning far in every direction stops at the margin', () => {
    for (const [kd, level] of [
      [2, 1],
      [2, 3],
      [3, 2],
      [1, 1],
    ] as const) {
      const c = cam(kd, 1);
      c.level = level;
      c.lookAt(1000, 500);
      for (const [dx, dy] of [
        [-1e6, 0],
        [1e6, 0],
        [0, -1e6],
        [0, 1e6],
        [-1e6, -1e6],
        [1e6, 1e6],
      ] as const) {
        c.pan(dx, dy);
        expect(inside(c), `kd ${kd} level ${level} pan ${dx},${dy}`).toBe(true);
      }
    }
  });

  it('the view is never empty: the map always fills part of the screen', () => {
    const c = cam(4, 1);
    c.level = 3;
    c.pan(-1e7, -1e7);
    const tl = c.toWorld(0, 0);
    // Top-left corner of the view sits at most one margin beyond the map corner.
    expect(tl.x).toBeCloseTo(-c.margins.x, 6);
    expect(tl.y).toBeCloseTo(-c.margins.top, 6);
  });

  it('zooming out near an edge pulls the view back inside', () => {
    const c = cam(2, 1);
    c.level = 3;
    c.pan(1e6, 0);
    c.zoomAt(0.5, 640, 360);
    c.zoomAt(0.5, 640, 360);
    expect(inside(c)).toBe(true);
  });

  it('a view larger than the map is centred', () => {
    const c = cam(2, 1, 6000, 4000);
    c.level = 0.5;
    c.pan(500, 500);
    expect(c.x).toBe(1000);
    expect(c.y).toBe(500);
  });

  it('follow() keeps following after bounds-limited updates and stays inside', () => {
    const c = cam(2, 1);
    c.follow(-5000, 9000);
    for (let i = 0; i < 100; i++) c.update(16);
    expect(inside(c)).toBe(true);
    expect(c.isFollowing).toBe(true);
  });
});

describe('edgeMarker', () => {
  it('is null for anything on screen', () => {
    expect(edgeMarker(10, 10, 1280, 720, 8)).toBeNull();
    expect(edgeMarker(1280, 720, 1280, 720, 8)).toBeNull();
  });

  it('puts the arrow on the inset edge in the direction of the target', () => {
    const right = edgeMarker(5000, 360, 1280, 720, 8)!;
    expect(right.x).toBeCloseTo(1272, 9);
    expect(right.y).toBeCloseTo(360, 9);
    expect(right.angle).toBeCloseTo(0, 9);
    const up = edgeMarker(640, -900, 1280, 720, 8)!;
    expect(up.y).toBeCloseTo(8, 9);
    expect(up.angle).toBeCloseTo(-Math.PI / 2, 9);
    const corner = edgeMarker(-4000, 4000, 1280, 720, 8)!;
    expect(corner.x).toBeGreaterThanOrEqual(8 - 1e-9);
    expect(corner.y).toBeLessThanOrEqual(712 + 1e-9);
  });
});
