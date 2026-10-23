import { describe, expect, it } from 'vitest';
import { WormReactions, reactionDeformation } from '../src/wormReactions';
import { heldGeometry, smoothAim, rotatePoint, armElbow } from '../src/weaponGeometry';
import { WEAPON_MOUNTS, rigForSkin } from '../src/weaponMounts';
import { SKINS } from '../src/skins';
import type { Worm, WormMotion, WormMotionEvent } from '@wr/sim';
import { Material, Terrain } from '@wr/sim';
import { bridgeRuns } from '../src/bridgeArt';

const sample = {
  health: 100,
  state: 'idle' as Worm['state'],
  vx: 0,
  vy: 0,
  blasted: false,
  drowned: false,
};
function event(motion: WormMotion, tick = 0, sequence = tick): WormMotionEvent {
  return { type: 'worm-motion', wormId: 1, x: 0, y: 0, tick, sequence, motion };
}
const floorContact = { kind: 'contact', vx: 0, vy: 7, nx: 0, ny: -1, airborne: false } as const;
describe('reaction clips', () => {
  it('plays redrawn blast frames from the impulse tick, rather than the first render', () => {
    const r = new WormReactions();
    r.handle(event({ kind: 'impulse', vx: 3, vy: 5 }));
    const air = { ...sample, state: 'airborne' as const, blasted: true, vy: 5 };
    expect(r.update(air, 0)?.frame).toBe(0);
    expect(r.update(air, 0.12)?.frame).toBe(1);
    expect(r.update(air, 0.24)?.frame).toBe(2);
    expect(r.update(air, 0.36)?.frame).toBe(3);
    expect(r.update(air, 0.48)?.frame).toBe(0);
    r.handle(event(floorContact, 25));
    expect(r.update(sample, 0.5)?.clip).toBe('land-hard');
    expect(r.update(sample, 0.9)).toBeNull();
  });
  it('does not infer impacts from health loss, airborne snapshots or rope release', () => {
    const r = new WormReactions();
    r.update(sample, 0);
    expect(r.update({ ...sample, health: 95 }, 0)).toBeNull();
    expect(r.update({ ...sample, health: 60 }, 0.3)).toBeNull();
    r.update({ ...sample, state: 'roped' }, 0.5);
    expect(r.update(sample, 0.6)).toBeNull();
    r.update({ ...sample, state: 'airborne' }, 0);
    expect(r.update(sample, 0)).toBeNull();
    r.handle(event(floorContact, 40));
    expect(r.update(sample, 0.8)?.clip).toBe('land-hard');
    expect(r.update({ ...sample, state: 'roped' }, 0.9)).toBeNull();
  });
  it('plays water entry once, even though the worm is already dead in the simulation', () => {
    const r = new WormReactions();
    r.handle(event({ kind: 'water-entry', vx: 0, vy: 8 }));
    const wet = { ...sample, drowned: true, health: 0, state: 'dead' as const };
    expect(r.update(wet, 0)?.clip).toBe('water');
    expect(r.update(wet, 0.3)?.frame).toBe(2);
    expect(r.update(wet, 0.6)).toBeNull();
    r.handle(event({ kind: 'water-entry', vx: 0, vy: 9 }, 40));
    expect(r.update(wet, 1)).toBeNull();
  });
  it('does not let an unfinished flinch replace a death pose', () => {
    const r = new WormReactions();
    r.handle(event({ ...floorContact, nx: -1, ny: 0, vx: 4 }));
    expect(r.update({ ...sample, health: 95 }, 0)?.clip).toBe('hit-light');
    expect(r.update({ ...sample, state: 'dead', health: 0 }, 0.01)).toBeNull();
  });
  it('starts water at the fixed-step surface event before delayed drowning, without restarting', () => {
    const r = new WormReactions();
    r.handle(event({ kind: 'water-entry', vx: 0, vy: 7 }));
    expect(r.update({ ...sample, state: 'airborne' }, 0)?.frame).toBe(0);
    r.handle(event({ kind: 'water-entry', vx: 0, vy: 9 }, 15));
    expect(r.update({ ...sample, state: 'dead', health: 0 }, 0.3)?.frame).toBe(2);
    expect(r.update({ ...sample, state: 'dead', health: 0 }, 0.6)).toBeNull();
  });
  it('restarts repeated impulses and contacts while staying airborne, and ignores duplicates', () => {
    const r = new WormReactions();
    const air = { ...sample, state: 'airborne' as const, blasted: true };
    r.handle(event({ kind: 'impulse', vx: 4, vy: -7 }));
    expect(r.update(air, 0.24)?.frame).toBe(2);
    const impulse = event({ kind: 'impulse', vx: -4, vy: -8 }, 12);
    r.handle(impulse);
    expect(r.update(air, 0.24)?.frame).toBe(0);
    r.handle(impulse);
    expect(r.update(air, 0.36)?.frame).toBe(1);
    r.handle(event({ ...floorContact, airborne: true, nx: -1, ny: 0, vx: 7 }, 20));
    expect(r.update(air, 0.4)?.clip).toBe('hit-heavy');
    r.handle(event({ ...floorContact, airborne: true, nx: 0, ny: 1, vy: -4 }, 25));
    expect(r.update(air, 0.5)?.clip).toBe('hit-light');
    expect(r.update(air, 0.71)?.clip).toBe('blast');
  });
  it('skips expired contacts after a delayed render instead of playing them late', () => {
    const r = new WormReactions();
    r.handle(event(floorContact));
    expect(r.update(sample, 1)).toBeNull();
  });
  it('has the same phase at the same simulation time at 30/60/144 FPS and 0.25/1/2x speed', () => {
    const air = { ...sample, state: 'airborne' as const, blasted: true };
    for (const hz of [30, 60, 144])
      for (const speed of [0.25, 1, 2]) {
        const r = new WormReactions();
        r.handle(event({ kind: 'impulse', vx: 3, vy: -5 }));
        for (let t = 0; t < 0.36; t += speed / hz) r.update(air, t);
        expect(r.update(air, 0.36)).toEqual({ clip: 'blast', frame: 3, progress: 0.36 / 0.44 });
        const paused = r.update(air, 0.36);
        for (let i = 0; i < 30; i++) expect(r.update(air, 0.36)).toEqual(paused);
      }
  });
  it('keeps fallback identity deformation bounded and non-spinning', () => {
    for (const clip of ['blast', 'land-hard', 'hit-light', 'hit-heavy', 'water'] as const)
      for (let i = 0; i <= 100; i++) {
        const d = reactionDeformation({ clip, frame: 0, progress: i / 100 });
        expect(d.x).toBeGreaterThan(0.5);
        expect(d.y).toBeGreaterThan(0.5);
        expect(Math.abs(d.lean)).toBeLessThan(0.25);
      }
  });
});

describe('anatomical weapon assembly', () => {
  it('removes decorative bridge rails wherever explosions remove the supporting deck', () => {
    const t = new Terrain(80, 50);
    for (let x = 5; x < 75; x++) for (let y = 30; y < 36; y++) t.set(x, y, Material.Bridge);
    expect(bridgeRuns(t)).toHaveLength(1);
    t.carveCircle(40, 32, 10);
    const runs = bridgeRuns(t);
    expect(runs).toHaveLength(2);
    expect(runs.flat().some((p) => p.x === 40)).toBe(false);
  });
  it('moves both wrists with the gun while keeping the barrel on the actual simulation firing axis', () => {
    for (const skin of SKINS)
      for (const id of ['bazooka', 'handgun', 'minigun', 'grenade']) {
        const mount = WEAPON_MOUNTS.get(id)!;
        const rig = rigForSkin(skin.id);
        for (const aim of [-Math.PI / 2, -1.2, 0, 1.2, Math.PI / 2]) {
          const geometry = heldGeometry(mount, rig, aim, 2.5);
          if (mount.aim) {
            const across =
              geometry.barrel.x * Math.sin(aim) + (geometry.barrel.y + 6.5) * Math.cos(aim);
            expect(across).toBeCloseTo(0, 12);
          }
          if (mount.aim) expect(geometry.rotation).toBe(-aim);
          if (geometry.support) {
            const offset = rotatePoint(
              { x: geometry.support.x - geometry.grip.x, y: geometry.support.y - geometry.grip.y },
              -geometry.rotation,
            );
            expect(offset.x).toBeCloseTo(mount.width * (mount.mode === 'shoulder' ? 0.16 : 0.19));
            expect(offset.y).toBeCloseTo(0);
          }
          expect(
            Object.values(armElbow({ x: 2, y: -10 }, geometry.grip)).every(Number.isFinite),
          ).toBe(true);
        }
      }
  });
  it('smooths aim consistently at different frame rates without overshoot', () => {
    const run = (hz: number) => {
      let angle = -1;
      for (let i = 0; i < hz; i++) angle = smoothAim(angle, 1, 1 / hz);
      return angle;
    };
    expect(run(30)).toBeCloseTo(run(144), 12);
    expect(smoothAim(-1, 1, 1 / 60)).toBeGreaterThan(-1);
    expect(smoothAim(-1, 1, 1 / 60)).toBeLessThan(1);
  });
});
