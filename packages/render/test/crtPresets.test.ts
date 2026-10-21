import { describe, expect, it } from 'vitest';
import { CRT_PRESETS } from '../src/crtPresets';

describe('CRT presets', () => {
  it('makes the previous strong effect the baseline', () => {
    expect(CRT_PRESETS.soft).toEqual({
      uSpread: 1,
      uSoftening: 0.5,
      uBloomThreshold: 0.65,
      uBloom: 0.7,
      uMask: 0.12,
      uScanline: 0.06,
      uPitch: 3,
      uBleed: 0,
      uVignette: 0,
    });
  });

  it('increases every visual component and broadens the highlight range', () => {
    for (const key of [
      'uSpread',
      'uSoftening',
      'uBloom',
      'uMask',
      'uScanline',
      'uBleed',
      'uVignette',
    ] as const) {
      expect(CRT_PRESETS.medium[key]).toBeGreaterThan(CRT_PRESETS.soft[key]);
      expect(CRT_PRESETS.strong[key]).toBeGreaterThan(CRT_PRESETS.medium[key]);
    }
    expect(CRT_PRESETS.medium.uBloomThreshold).toBeLessThan(CRT_PRESETS.soft.uBloomThreshold);
    expect(CRT_PRESETS.strong.uBloomThreshold).toBeLessThan(CRT_PRESETS.medium.uBloomThreshold);
    expect(CRT_PRESETS.strong.uPitch).toBeGreaterThan(CRT_PRESETS.soft.uPitch);
  });
});
