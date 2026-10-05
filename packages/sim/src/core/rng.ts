// xoshiro128** — fast 32-bit PRNG with a tiny serializable state.

export type RngState = [number, number, number, number];

function splitmix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
}

export function seedRng(seed: number): RngState {
  const next = splitmix32(seed);
  return [next(), next(), next(), next()];
}

const rotl = (x: number, k: number) => ((x << k) | (x >>> (32 - k))) >>> 0;

export class Rng {
  s: RngState;

  constructor(seedOrState: number | RngState) {
    this.s = typeof seedOrState === 'number' ? seedRng(seedOrState) : [...seedOrState];
  }

  /** Uniform uint32. */
  nextU32(): number {
    const s = this.s;
    const result = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 11);
    s[0] >>>= 0;
    s[1] >>>= 0;
    s[2] >>>= 0;
    return result;
  }

  /** Uniform float in [0, 1). */
  float(): number {
    return this.nextU32() / 4294967296;
  }

  /** Uniform integer in [lo, hi] inclusive. */
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.float() * (hi - lo + 1));
  }

  range(lo: number, hi: number): number {
    return lo + this.float() * (hi - lo);
  }

  chance(p: number): boolean {
    return this.float() < p;
  }

  pick<T>(items: readonly T[]): T {
    const item = items[this.int(0, items.length - 1)];
    if (item === undefined) throw new Error('pick from empty array');
    return item;
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = items[i] as T;
      items[i] = items[j] as T;
      items[j] = tmp;
    }
    return items;
  }
}
