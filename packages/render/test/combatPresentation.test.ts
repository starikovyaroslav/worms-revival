import { describe, expect, it } from 'vitest';
import { WormReactions, reactionDeformation } from '../src/wormReactions';
import { heldGeometry, smoothAim, rotatePoint, armElbow } from '../src/weaponGeometry';
import { WEAPON_MOUNTS, rigForSkin } from '../src/weaponMounts';
import { SKINS } from '../src/skins';
import type { Worm } from '@wr/sim';
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
describe('reaction clips', () => {
  it('plays redrawn blast frames on a local clock, rather than spinning the whole body', () => {
    const r = new WormReactions();
    r.update(sample, 0);
    const air = { ...sample, state: 'airborne' as const, blasted: true, vy: 5 };
    expect(r.update(air, 0)?.frame).toBe(0);
    expect(r.update(air, 0.12)?.frame).toBe(1);
    expect(r.update(air, 0.12)?.frame).toBe(2);
    expect(r.update(air, 0.12)?.frame).toBe(3);
    expect(r.update(air, 0.12)?.frame).toBe(0);
    expect(r.update(sample, 0.01)?.clip).toBe('land-hard');
    expect(r.update(sample, 0.4)).toBeNull();
  });
  it('separates light damage, heavy damage and hard landing; does not squash rope release', () => {
    const r = new WormReactions();
    r.update(sample, 0);
    expect(r.update({ ...sample, health: 95 }, 0)?.clip).toBe('hit-light');
    expect(r.update({ ...sample, health: 60 }, 0.3)?.clip).toBe('hit-heavy');
    r.update({ ...sample, state: 'roped' }, 0.5);
    expect(r.update(sample, 0)).toBeNull();
    r.update({ ...sample, state: 'airborne', vy: 2 }, 0);
    expect(r.update(sample, 0)).toBeNull();
    r.update({ ...sample, state: 'airborne', vy: 7 }, 0);
    expect(r.update(sample, 0)?.clip).toBe('land-hard');
    r.update({ ...sample, state: 'airborne', vy: 8 }, 0.5);
    expect(r.update({ ...sample, state: 'roped' }, 0)).toBeNull();
  });
  it('plays water entry once, even though the worm is already dead in the simulation', () => {
    const r = new WormReactions();
    r.update(sample, 0);
    const wet = { ...sample, drowned: true, health: 0, state: 'dead' as const };
    expect(r.update(wet, 0)?.clip).toBe('water');
    expect(r.update(wet, 0.3)?.frame).toBe(2);
    expect(r.update(wet, 0.3)).toBeNull();
    expect(r.update(wet, 1)).toBeNull();
  });
  it('does not let an unfinished flinch replace a death pose', () => {
    const r = new WormReactions();
    r.update(sample, 0);
    expect(r.update({ ...sample, health: 95 }, 0)?.clip).toBe('hit-light');
    expect(r.update({ ...sample, state: 'dead', health: 0 }, 0.01)).toBeNull();
  });
  it('starts water entry at the visible surface, before delayed simulated drowning, without restarting', () => {
    const r = new WormReactions();
    r.update({ ...sample, y: 99, state: 'airborne', vy: 7 }, 0, 100);
    expect(r.update({ ...sample, y: 101, state: 'airborne', vy: 7 }, 0, 100)?.frame).toBe(0);
    expect(
      r.update({ ...sample, y: 114, state: 'dead', health: 0, drowned: true }, 0.3, 100)?.frame,
    ).toBe(2);
    expect(
      r.update({ ...sample, y: 114, state: 'dead', health: 0, drowned: true }, 0.3, 100),
    ).toBeNull();
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
