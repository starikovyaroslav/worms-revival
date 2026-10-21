/** Shared export/runtime contract. Anchors are fractions of the fixed animation canvas. */
export const BASE_VFX_CLIPS = {
  cargo: { frames: 4, w: 64, h: 32, anchor: [0.5, 0.5] },
  mailplane: { frames: 4, w: 64, h: 32, anchor: [0.5, 0.5] },
  missile: { frames: 2, w: 22, h: 12, anchor: [0.5, 0.5] },
  homing: { frames: 2, w: 22, h: 12, anchor: [0.5, 0.5] },
  letter: { frames: 4, w: 16, h: 14, anchor: [0.5, 0.5] },
  engine: { frames: 4, w: 24, h: 12, anchor: [1, 0.5] },
  fire: { frames: 4, w: 16, h: 20, anchor: [0.5, 1] },
  smoke: { frames: 4, w: 40, h: 40, anchor: [0.5, 0.5] },
  steam: { frames: 4, w: 40, h: 40, anchor: [0.5, 0.5] },
  blast: { frames: 4, w: 64, h: 64, anchor: [0.5, 0.5] },
  fragment: { frames: 4, w: 64, h: 64, anchor: [0.5, 0.5] },
  incendiary: { frames: 4, w: 64, h: 48, anchor: [0.5, 1] },
  energy: { frames: 4, w: 64, h: 64, anchor: [0.5, 0.5] },
  nuke: { frames: 4, w: 96, h: 96, anchor: [0.5, 1] },
  gas: { frames: 4, w: 32, h: 32, anchor: [0.5, 0.5] },
  ghost: { frames: 4, w: 24, h: 32, anchor: [0.5, 0.5] },
  scorch: { frames: 4, w: 64, h: 24, anchor: [0.5, 0.5] },
} as const;

/** Military replacements remain a separate optional pack; the old clips are fallback art. */
export const MILITARY_CLIPS = {
  attack: { frames: 4, w: 128, h: 56, anchor: [0.5, 0.5] },
  gunship: { frames: 4, w: 128, h: 64, anchor: [0.5, 0.5] },
  stealth: { frames: 4, w: 128, h: 80, anchor: [0.5, 0.5] },
  rocket: { frames: 2, w: 26, h: 10, anchor: [0.5, 0.5] },
  rocket_mk2: { frames: 2, w: 30, h: 14, anchor: [0.5, 0.5] },
} as const;
export const VFX_CLIPS = { ...BASE_VFX_CLIPS, ...MILITARY_CLIPS } as const;

export type VfxClip = keyof typeof VFX_CLIPS;
