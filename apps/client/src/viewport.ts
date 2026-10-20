/** Logical resolution the whole game is designed for; the integer scale `kd` is relative to it. */
export const LOGICAL_W = 640;
export const LOGICAL_H = 360;
/** The menu is laid out for this box and gets its own integer scale. */
export const MENU_W = 960;
export const MENU_H = 540;

/** Tolerance so that e.g. 1920 * 1.25 / 640 = 3.75 style products never lose a whole step to rounding. */
const EPS = 1e-9;

export interface Viewport {
  /** Integer device pixels per logical pixel (>= 1). */
  kd: number;
  /** CSS pixels per logical pixel: `kd / dpr`. Equals 1 css px per device px when dpr = 1. */
  cssScale: number;
  /** Visible logical size; always >= 640x360, may be fractional (e.g. 683.5). */
  logicalW: number;
  logicalH: number;
  /** Window size in CSS px and the device pixel ratio this was computed from. */
  cssW: number;
  cssH: number;
  dpr: number;
}

/** Largest integer scale at which `devW` x `devH` device pixels still hold a `baseW` x `baseH` view. */
function fitScale(devW: number, devH: number, baseW: number, baseH: number): number {
  return Math.max(1, Math.floor(Math.min(devW / baseW, devH / baseH) + EPS));
}

/**
 * The one place that decides how the game maps onto the window. The scale is an integer in DEVICE
 * pixels so pixel art stays crisp; odd window shapes simply show more of the world (no bars).
 */
export function computeViewport(cssW: number, cssH: number, dpr: number): Viewport {
  const ratio = dpr > 0 ? dpr : 1;
  const kd = fitScale(cssW * ratio, cssH * ratio, LOGICAL_W, LOGICAL_H);
  return forceScale(cssW, cssH, ratio, kd);
}

/** Same as `computeViewport` with a chosen `kd` (the `?k=` override used by tests). */
export function forceScale(cssW: number, cssH: number, dpr: number, kd: number): Viewport {
  const k = Math.max(1, Math.floor(kd));
  return {
    kd: k,
    cssScale: k / dpr,
    // Never below the base view, even if the override asks for more than fits.
    logicalW: Math.max(LOGICAL_W, (cssW * dpr) / k),
    logicalH: Math.max(LOGICAL_H, (cssH * dpr) / k),
    cssW,
    cssH,
    dpr,
  };
}

/** Integer device-pixel scale of the menu (laid out for 960x540): 1 at 1280x720, 2 at 1920x1080. */
export function menuScale(cssW: number, cssH: number, dpr: number): number {
  const ratio = dpr > 0 ? dpr : 1;
  return fitScale(cssW * ratio, cssH * ratio, MENU_W, MENU_H);
}

/** Parses `?k=3` from a query string; undefined unless it is a positive integer. */
export function parseKOverride(search: string): number | undefined {
  const raw = new URLSearchParams(search).get('k');
  if (raw === null || !/^\d+$/.test(raw)) return undefined;
  const k = Number(raw);
  return k >= 1 ? k : undefined;
}
