// Deterministic math. Only IEEE-754 correctly rounded operations (+ - * / sqrt floor) are used,
// so results are bit-identical in every JS engine. Do not replace with Math.sin & co.

export const PI = 3.141592653589793;
export const TAU = 6.283185307179586;
export const HALF_PI = 1.5707963267948966;

/** Wraps an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
  const r = a - Math.floor((a + PI) / TAU) * TAU;
  return r === -PI ? PI : r;
}

// Taylor series on [-PI/2, PI/2]; error < 1e-12.
function sinPoly(x: number): number {
  const x2 = x * x;
  return (
    x *
    (1 -
      (x2 / 6) *
        (1 -
          (x2 / 20) *
            (1 -
              (x2 / 42) *
                (1 -
                  (x2 / 72) *
                    (1 - (x2 / 110) * (1 - (x2 / 156) * (1 - (x2 / 210) * (1 - x2 / 272))))))))
  );
}

export function sin(a: number): number {
  let x = wrapAngle(a);
  if (x > HALF_PI) x = PI - x;
  else if (x < -HALF_PI) x = -PI - x;
  return sinPoly(x);
}

export function cos(a: number): number {
  return sin(a + HALF_PI);
}

// atan on [0, 1] via one half-angle reduction and a Taylor series; error < 1e-10.
function atanUnit(t: number): number {
  const u = t / (1 + Math.sqrt(1 + t * t));
  const u2 = u * u;
  let term = u;
  let sum = u;
  for (let n = 3; n <= 25; n += 2) {
    term *= -u2;
    sum += term / n;
  }
  return 2 * sum;
}

export function atan(x: number): number {
  const ax = Math.abs(x);
  const r = ax <= 1 ? atanUnit(ax) : HALF_PI - atanUnit(1 / ax);
  return x < 0 ? -r : r;
}

export function atan2(y: number, x: number): number {
  if (x > 0) return atan(y / x);
  if (x < 0) return y >= 0 ? atan(y / x) + PI : atan(y / x) - PI;
  if (y > 0) return HALF_PI;
  if (y < 0) return -HALF_PI;
  return 0;
}

export function hypot(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
