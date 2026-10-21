import { expect, it } from 'vitest';
import { sensoryEnvelope } from '../src/sensory';

it('fades a single bounded pulse in and out without repeated flashing', () => {
  expect(sensoryEnvelope(-0.1)).toBe(0);
  expect(sensoryEnvelope(0)).toBe(0);
  expect(sensoryEnvelope(0.12)).toBeGreaterThan(0.7);
  expect(sensoryEnvelope(0.6)).toBeLessThan(sensoryEnvelope(0.12));
  expect(sensoryEnvelope(1.2)).toBe(0);
  expect(sensoryEnvelope(2)).toBe(0);
});
