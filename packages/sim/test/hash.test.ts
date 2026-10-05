import { describe, expect, it } from 'vitest';
import { Hasher } from '../src/core/hash';

describe('Hasher', () => {
  it('matches the FNV-1a reference value', () => {
    expect(new Hasher().str('').digest()).toBe(0x811c9dc5);
    expect(new Hasher().bytes(new TextEncoder().encode('a')).digest()).toBe(0xe40c292c);
  });

  it('distinguishes float bit patterns', () => {
    expect(new Hasher().f64(0).digest()).not.toBe(new Hasher().f64(-0).digest());
  });
});
