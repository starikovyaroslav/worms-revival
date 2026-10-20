/**
 * Size of screen-space labels (name tags, damage numbers, speech bubbles). They live in an unscaled
 * layer in css px, so they are sized in whole DEVICE pixels per label pixel: `ud = round(kd / 2)`
 * (label art is drawn for a 2x view, so at 1280x720 the labels look as they always did). Press Start 2P
 * is then always a multiple of 8 device px, which keeps it crisp.
 */
export interface LabelScale {
  /** Integer device pixels per label pixel (>= 1). */
  ud: number;
  dpr: number;
}

export const DEFAULT_LABEL_SCALE: LabelScale = { ud: 1, dpr: 1 };

export function labelScaleFor(kd: number, dpr: number): LabelScale {
  return { ud: Math.max(1, Math.round(kd / 2)), dpr: dpr > 0 ? dpr : 1 };
}

/** CSS pixels per label pixel. */
export const labelUnit = (s: LabelScale): number => s.ud / s.dpr;

/** Font size in css px for a base size designed at 1 label px per art px (8 or 16 for Press Start 2P). */
export const labelFont = (base: number, s: LabelScale): number => labelUnit(s) * base;

/** Rounds a css coordinate to a whole device pixel. */
export const snapDevice = (v: number, s: LabelScale): number => Math.round(v * s.dpr) / s.dpr;
