import { describe, expect, it } from 'vitest';
import { Donkey } from '@wr/sim';
import { makeGame, stepUntil } from './helpers';

describe('concrete donkey', () => {
  it('blasts once when it passes a worm, not on every pixel step', () => {
    const g = makeGame({ turnTime: 60 });
    stepUntil(g, () => g.worms.every((w) => w.grounded));
    const worm = g.worms[1]!; // a standing worm that is not the active one
    const hp = worm.health;
    // Starts well above the ground so the only thing in its way before the land is the worm.
    const d = g.world.spawn(
      new Donkey(worm.cx, worm.y - 100, { crater: 6, radius: 30, damage: 20, push: 0.5 }),
    );
    const blasts: number[] = [];
    for (let i = 0; i < 100 && !d.removed; i++) {
      g.step();
      for (const e of g.world.drainEvents()) if (e.type === 'explosion') blasts.push(e.y);
    }
    // Every blast is at least 30 px below the previous one (the worm is hit by one or two of them).
    for (let i = 1; i < blasts.length; i++) expect(blasts[i]! - blasts[i - 1]!).toBeGreaterThan(30);
    const nearWorm = blasts.filter((y) => Math.abs(y - worm.cy) < 14);
    expect(nearWorm.length).toBeGreaterThan(0);
    expect(nearWorm.length).toBeLessThanOrEqual(1);
    expect(hp - worm.health).toBeLessThanOrEqual(2 * 20);
    expect(d.removed).toBe(true);
  });
});
