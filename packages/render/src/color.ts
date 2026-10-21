export type RGB = [number, number, number];

export function hex(c: number): RGB {
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function shade(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

/** Blends two packed 0xRRGGBB colours (t = 0 gives `a`, 1 gives `b`). */
export function mixColor(a: number, b: number, t: number): number {
  const ch = (c: number, sh: number) => (c >> sh) & 255;
  const m = (sh: number) => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

/** A colour along a gradient of evenly spaced stops, t in 0..1. */
export function lerpColor(stops: number[], t: number): number {
  if (stops.length === 1) return stops[0] as number;
  const f = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(f);
  const a = stops[i] as number;
  const b = stops[i + 1] as number;
  const u = f - i;
  const ch = (sh: number) => Math.round(((a >> sh) & 255) * (1 - u) + ((b >> sh) & 255) * u);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Multiplies each channel of a packed colour by `k`. */
export function darken(c: number, k: number): number {
  return (
    (Math.round(((c >> 16) & 255) * k) << 16) |
    (Math.round(((c >> 8) & 255) * k) << 8) |
    Math.round((c & 255) * k)
  );
}
