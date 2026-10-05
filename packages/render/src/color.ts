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
