import { describe, expect, it } from 'vitest';
import { Entity, Material, Terrain, World, Worm, type WormMotionEvent } from '../src';

function world(ground = true): World {
  const terrain = new Terrain(400, 300);
  if (ground)
    for (let y = 200; y < 300; y++) for (let x = 0; x < 400; x++) terrain.set(x, y, Material.Soil);
  return new World({ seed: 4, terrain, waterLevel: 280 });
}
function motion(w: World): WormMotionEvent[] {
  return w.drainEvents().filter((e): e is WormMotionEvent => e.type === 'worm-motion');
}

describe('fixed-step worm motion events', () => {
  it('records landing speed before land clears velocity, with a floor normal', () => {
    const w = world();
    const worm = w.spawn(new Worm(100, 180, 'A', 0, 100));
    worm.launch(0, 7, false);
    let contact: WormMotionEvent | undefined;
    for (let i = 0; i < 10 && !contact; i++) {
      w.step();
      contact = motion(w).find((e) => e.motion.kind === 'contact');
    }
    expect(contact?.tick).toBeLessThan(w.tick);
    expect(contact?.motion).toMatchObject({ kind: 'contact', airborne: false, nx: 0, ny: -1 });
    if (contact?.motion.kind !== 'contact') throw new Error('Missing landing');
    expect(contact.motion.vy).toBeGreaterThan(7);
    expect(worm.vy).toBe(0);
  });

  it('captures wall and ceiling contacts rather than classifying them as landings', () => {
    for (const ceiling of [false, true]) {
      const w = world(false);
      for (let y = ceiling ? 50 : 0; y < (ceiling ? 65 : 300); y++)
        for (let x = ceiling ? 0 : 200; x < (ceiling ? 400 : 215); x++)
          w.terrain.set(x, y, Material.Soil);
      const worm = w.spawn(new Worm(ceiling ? 100 : 180, ceiling ? 90 : 130, 'A', 0, 100));
      worm.launch(ceiling ? 0 : 10, ceiling ? -10 : 0, true, w);
      let contact: WormMotionEvent | undefined;
      for (let i = 0; i < 8 && !contact; i++) {
        w.step();
        contact = motion(w).find((e) => e.motion.kind === 'contact');
      }
      expect(contact?.motion.kind).toBe('contact');
      if (contact?.motion.kind !== 'contact') throw new Error('Missing contact');
      expect(contact.motion.airborne).toBe(true);
      if (ceiling) {
        expect(contact.motion.ny).toBeGreaterThan(0.55);
        expect(contact.motion.vy).toBeLessThan(-8);
      } else {
        expect(contact.motion.nx).toBeLessThan(-0.55);
        expect(contact.motion.vx).toBe(10);
      }
    }
  });

  it('retains repeated impulses and bounce measurements when no renderer drains between ticks', () => {
    const w = world();
    const worm = w.spawn(new Worm(100, 190, 'A', 0, 100));
    worm.push(2, 7, w);
    for (let i = 0; i < 30; i++) {
      if (i === 8) worm.push(-2, 6, w);
      w.step();
    }
    const events = motion(w);
    expect(events.filter((e) => e.motion.kind === 'impulse')).toHaveLength(2);
    expect(events.filter((e) => e.motion.kind === 'contact').length).toBeGreaterThan(1);
    expect(new Set(events.map((e) => e.sequence)).size).toBe(events.length);
    expect(events.map((e) => e.sequence)).toEqual(
      [...events.map((e) => e.sequence)].sort((a, b) => a - b),
    );
    const previous = events.at(-1)!.sequence;
    worm.push(2, -3, w);
    expect(motion(w)[0]!.sequence).toBeGreaterThan(previous);
  });

  it('reports first water contact before drowning and retains its incoming velocity', () => {
    const w = world(false);
    w.waterLevel = 150;
    const worm = w.spawn(new Worm(100, 148, 'A', 0, 100));
    worm.launch(1, 5, false);
    w.step();
    const entry = motion(w).find((e) => e.motion.kind === 'water-entry');
    expect(entry).toMatchObject({ y: 150, tick: 0, motion: { vx: 1, vy: 5.2 } });
    expect(entry?.x).toBeCloseTo(101, 10);
    expect(worm.drowned).toBe(false);
    for (let i = 0; i < 10 && !worm.drowned; i++) w.step();
    expect(worm.drowned).toBe(true);
  });

  it('does not create mechanical contact events from non-mechanical damage', () => {
    const w = world();
    const worm = w.spawn(new Worm(100, 199, 'A', 0, 100));
    worm.takeDamage(w, 25);
    expect(motion(w)).toEqual([]);
  });

  it('observes water entry caused by another entity after the worm update (rope/jetpack)', () => {
    const w = world(false);
    w.waterLevel = 150;
    const worm = w.spawn(new Worm(100, 148, 'A', 0, 100));
    worm.state = 'roped';
    w.spawn(
      new (class extends Entity {
        readonly kind = 'motion-test-driver';
        update(): void {
          worm.y = 155;
          worm.vy = 7;
          this.removed = true;
        }
      })(0, 0),
    );
    w.step();
    expect(worm.drowned).toBe(false);
    expect(motion(w)).toMatchObject([
      {
        type: 'worm-motion',
        wormId: worm.id,
        tick: 0,
        y: 150,
        motion: { kind: 'water-entry', vy: 7 },
      },
    ]);
  });

  it('retains velocity on a single-tick plunge past both the surface and drowning threshold', () => {
    const w = world(false);
    w.waterLevel = 150;
    const worm = w.spawn(new Worm(100, 148, 'A', 0, 100));
    worm.launch(1, 25, false);
    w.step();
    expect(worm.drowned).toBe(true);
    expect(motion(w)[0]?.motion).toMatchObject({ kind: 'water-entry', vx: 1, vy: 25.2 });
    expect(worm.vy).toBe(0);
  });

  it('keeps every physics hash unchanged when motion emission is disabled', () => {
    const a = world();
    const b = world();
    b.emitWormMotion = () => {};
    const worms = [a, b].map((w) => w.spawn(new Worm(100, 170, 'A', 0, 100)));
    for (let i = 0; i < 180; i++) {
      if (i === 0 || i === 25 || i === 90) {
        worms[0]!.push(2, i === 25 ? 8 : -5, a);
        worms[1]!.push(2, i === 25 ? 8 : -5, b);
      }
      a.step();
      b.step();
      expect(a.hash()).toBe(b.hash());
      a.drainEvents();
      b.drainEvents();
    }
  });
});
