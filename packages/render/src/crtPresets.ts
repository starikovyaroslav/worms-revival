export type CrtMode = 'off' | 'soft' | 'medium' | 'strong';

/** The old strong preset is the new baseline, kept numerically identical. */
export const CRT_PRESETS = {
  soft: {
    uSpread: 1,
    uSoftening: 0.5,
    uBloomThreshold: 0.65,
    uBloom: 0.7,
    uMask: 0.12,
    uScanline: 0.06,
    uPitch: 3,
    uBleed: 0,
    uVignette: 0,
  },
  medium: {
    uSpread: 1.3,
    uSoftening: 0.58,
    uBloomThreshold: 0.52,
    uBloom: 1.1,
    uMask: 0.32,
    uScanline: 0.2,
    uPitch: 3,
    uBleed: 0.25,
    uVignette: 0.12,
  },
  strong: {
    uSpread: 1.8,
    uSoftening: 0.68,
    uBloomThreshold: 0.42,
    uBloom: 1.6,
    uMask: 0.52,
    uScanline: 0.32,
    uPitch: 6,
    uBleed: 0.4,
    uVignette: 0.24,
  },
} as const;
