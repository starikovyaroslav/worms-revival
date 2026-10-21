import { describe, expect, it } from 'vitest';
import { World, Terrain, Projectile, Barrel, explode } from '../src';

const make = () => new World({ seed: 4, terrain: new Terrain(400, 240), waterLevel: 230 });
const spec = {
  look: 'cluster' as const,
  radius: 2,
  wind: 0,
  impact: 'bounce' as const,
  fuse: 2,
  blast: { crater: 0, radius: 10, damage: 0, noCrater: true },
};

describe('cosmetic event lineage', () => {
  it('inherits upgrade visuals through delayed entities without changing physics or hashes', () => {
    const a = make(),
      b = make();
    const p = a.withPresentationSource(
      'bazooka',
      () => a.spawn(new Projectile(100, 40, 0, 0, spec)),
      'mk2',
    );
    b.withPresentationSource('bazooka', () => b.spawn(new Projectile(100, 40, 0, 0, spec)));
    expect(a.variantOf(p)).toBe('mk2');
    for (let i = 0; i < 4; i++) {
      a.step();
      b.step();
      expect(a.hash()).toBe(b.hash());
    }
    expect(a.drainEvents().find((e) => e.type === 'explosion')).toMatchObject({
      source: 'bazooka',
      variant: 'mk2',
    });
    expect(a.variantOf(a.spawn(new Projectile(10, 10, 0, 0, spec)))).toBe('standard');
  });
  it('preserves the source of delayed explosions without adding it to the state hash', () => {
    const a = make(),
      b = make();
    a.withPresentationSource('cluster', () => a.spawn(new Projectile(100, 40, 0, 0, spec)));
    b.spawn(new Projectile(100, 40, 0, 0, spec));
    for (let i = 0; i < 3; i++) {
      a.step();
      b.step();
      expect(a.hash()).toBe(b.hash());
    }
    const event = a.drainEvents().find((e) => e.type === 'explosion');
    expect(event?.source).toBe('cluster');
  });

  it('restores nested contexts after exceptions and does not tag unrelated entities', () => {
    const w = make();
    expect(() =>
      w.withPresentationSource('broken', () => {
        throw new Error('test');
      }),
    ).toThrow();
    const p = w.spawn(new Projectile(100, 40, 0, 0, spec));
    expect(w.sourceOf(p)).toBe('projectile');
    w.withPresentationSource('shotgun', () =>
      w.withPresentationSource('barrel', () => {
        w.emit({ type: 'explosion', x: 1, y: 1, radius: 1 });
      }),
    );
    expect(w.drainEvents()[0]).toMatchObject({ source: 'barrel' });
  });

  it('does not attribute an exploding barrel to the grenade that set it off', () => {
    const w = make();
    const barrel = w.spawn(new Barrel(100, 100));
    w.withPresentationSource('grenade', () =>
      explode(w, 100, 100, { crater: 0, radius: 20, damage: 100 }),
    );
    w.step();
    expect(barrel.removed).toBe(true);
    expect(
      w
        .drainEvents()
        .filter((e) => e.type === 'explosion')
        .map((e) => e.source),
    ).toEqual(['grenade', 'barrel']);
  });
});
