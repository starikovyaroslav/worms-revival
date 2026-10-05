import { describe, expect, it } from 'vitest';
import { Entity } from '../src/world/entity';
import { World } from '../src/world/world';
import { Terrain } from '../src/terrain/terrain';

class Faller extends Entity {
  readonly kind = 'faller';
  update(world: World): void {
    this.vy += world.physics.gravity;
    this.y += this.vy;
    if (this.y > world.waterLevel) this.removed = true;
  }
}

function makeWorld(seed = 1): World {
  return new World({ seed, terrain: new Terrain(64, 64), waterLevel: 60 });
}

describe('World', () => {
  it('assigns increasing ids and removes entities', () => {
    const w = makeWorld();
    const a = w.spawn(new Faller(10, 0));
    const b = w.spawn(new Faller(20, 0));
    expect(b.id).toBeGreaterThan(a.id);
    for (let i = 0; i < 100; i++) w.step();
    expect(w.all().length).toBe(0);
  });

  it('produces identical hashes for identical runs', () => {
    const run = () => {
      const w = makeWorld(5);
      w.spawn(new Faller(10, 0));
      for (let i = 0; i < 10; i++) w.step();
      return w.hash();
    };
    expect(run()).toBe(run());
    const other = makeWorld(6);
    other.spawn(new Faller(10, 0));
    for (let i = 0; i < 10; i++) other.step();
    expect(other.hash()).not.toBe(run());
  });
});
