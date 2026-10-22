import { describe, expect, it } from 'vitest';
import { paintScorch } from '../src/burnMarks';
import { fireStyle } from '../src/fireStyles';

describe('cosmetic terrain and fire', () => {
  it('keeps painted scorch density separate from world coordinates and continuous alpha', () => {
    const art = { w: 1, h: 1, data: new Uint8ClampedArray([90, 80, 70, 73]) };
    const pixels = new Uint8Array(4 * 4 * 4);
    paintScorch(pixels, 2, 10, 20, art, (x) => x < 11, 1, 2);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) expect(pixels[(y * 4 + x) * 4 + 3]).toBe(x < 2 ? 73 : 0);
  });
  it('clips soot to live terrain, including terrain erased after the blast', () => {
    const art = { w: 1, h: 1, data: new Uint8ClampedArray([160, 70, 20, 255]) };
    const pixels = new Uint8Array(16);
    paintScorch(pixels, 2, 10, 20, art, (x, y) => x === 10 && y === 21, 0.5);
    expect([...pixels]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 80, 35, 10, 255, 0, 0, 0, 0]);
    paintScorch(pixels, 2, 10, 20, art, () => false, 1);
    expect([...pixels]).toEqual(new Array(16).fill(0));
  });
  it('distinguishes broad slow napalm from a fast narrow flamethrower', () => {
    expect(fireStyle('napalm').width).toBeGreaterThan(fireStyle('flamethrower').width);
    expect(fireStyle('napalm').fps).toBeLessThan(fireStyle('flamethrower').fps);
    expect(fireStyle('unknown')).toEqual(fireStyle('flame'));
  });
});
