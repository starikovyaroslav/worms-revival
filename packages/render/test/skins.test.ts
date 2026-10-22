import { describe, expect, it } from 'vitest';
import { actionPose, chooseSkinPose, type SkinPoseState } from '../src/skinActor';
import {
  SKINS,
  SKIN_MOTION,
  SKIN_POSES,
  skinById,
  CHARACTER_CLASSES,
  variantsForClass,
  resolveTeamVariant,
} from '../src/skins';
import { WEAPON_MOUNTS, rigForSkin } from '../src/weaponMounts';

const state: SkinPoseState = {
  health: 100,
  state: 'idle',
  vy: 0,
  walkFrame: 0,
  blasted: false,
  hurt: false,
  landing: false,
  blink: false,
  hold: '',
};
describe('character-dependent cosmetic acting', () => {
  it('treats classes as rosters, preserves explicit members and never crosses family boundaries', () => {
    const available = new Set(SKINS.filter((s) => s.id !== 'dominatrix').map((s) => s.id));
    expect(CHARACTER_CLASSES).toHaveLength(8);
    expect(variantsForClass('heavy').map((s) => s.id)).toEqual(['brutal', 'commando-femme']);
    const team = { characterClass: 'heavy' };
    expect([0, 1, 2].map((member) => resolveTeamVariant(team, member, available))).toEqual([
      'brutal',
      'commando-femme',
      'brutal',
    ]);
    expect(
      resolveTeamVariant({ ...team, characterVariants: ['commando-femme'] }, 0, available),
    ).toBe('commando-femme');
    expect(resolveTeamVariant({ ...team, characterVariants: ['elder'] }, 0, available)).toBe(
      'brutal',
    );
    expect(resolveTeamVariant({ characterClass: 'dominant' }, 0, available)).toBe(
      'commander-femme',
    );
    expect(resolveTeamVariant({ characterClass: 'dominant' }, 0, new Set())).toBeUndefined();
    expect(resolveTeamVariant({ skin: 'dominatrix' }, 0, available)).toBeUndefined();
    expect(resolveTeamVariant({ characterClass: 'garbage' }, 0, available)).toBeUndefined();
    expect(resolveTeamVariant({ skin: 'glam-femme' }, 4, available)).toBe('glam-femme');
    expect(resolveTeamVariant({}, 0, available)).toBeUndefined();
  });
  it('keeps equipment sizes independent of class anatomy and gives mortar a ground stance', () => {
    expect(WEAPON_MOUNTS.get('bazooka')!.width).toBeGreaterThan(
      WEAPON_MOUNTS.get('handgun')!.width * 3,
    );
    expect(WEAPON_MOUNTS.get('mortar')!.mode).toBe('grounded');
    expect(WEAPON_MOUNTS.get('mortar')!.pose).toBe('land');
    expect(actionPose('mortar')).toBe('land');
    expect(actionPose('mine')).toBe('land');
    expect(WEAPON_MOUNTS.get('airstrike')!.texture).toBe('skins/equipment/radio');
    expect(rigForSkin('soft').shoulder).not.toEqual(rigForSkin('classic').shoulder);
  });
  it('defines seventeen identities including the blocked concept, sixteen poses and eight profiles', () => {
    expect(SKINS).toHaveLength(17);
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(17);
    expect(new Set(SKINS.map((s) => s.profile)).size).toBe(8);
    expect(new Set(SKIN_POSES).size).toBe(16);
    expect(skinById('dominatrix')?.profile).toBe('dominant');
    expect(skinById('not-a-skin')).toBeUndefined();
    expect(SKIN_MOTION.heavy.bob).toBeLessThan(SKIN_MOTION.soft.bob);
    expect(SKIN_MOTION.veteran.lean).toBeGreaterThan(SKIN_MOTION.glam.lean);
  });
  it('covers all four painted walk phases using simulation progress, not real-time speed', () => {
    const poses = Array.from({ length: 15 }, (_, walkFrame) =>
      chooseSkinPose({ ...state, state: 'walking', walkFrame }),
    );
    expect(new Set(poses)).toEqual(new Set(['walk_0', 'walk_1', 'walk_2', 'walk_3']));
    expect(chooseSkinPose(state)).toBe('idle');
    expect(chooseSkinPose({ ...state, blink: true })).toBe('blink');
  });
  it('airborne, rope, reactions and match-end poses override held/action poses', () => {
    const held = { ...state, hold: 'bazooka', action: 'throw' as const };
    expect(chooseSkinPose({ ...held, state: 'roped' })).toBe('rope');
    expect(chooseSkinPose({ ...held, state: 'airborne', vy: -1 })).toBe('jump');
    expect(chooseSkinPose({ ...held, state: 'airborne', vy: 1 })).toBe('fall');
    expect(chooseSkinPose({ ...held, hurt: true })).toBe('hurt');
    expect(chooseSkinPose({ ...held, landing: true })).toBe('land');
    expect(chooseSkinPose({ ...held, end: 'win' })).toBe('win');
    expect(chooseSkinPose({ ...held, health: 0 })).toBe('defeat');
    expect(chooseSkinPose(held)).toBe('throw');
    expect(chooseSkinPose({ ...state, hold: 'bazooka' })).toBe('aim');
  });
  it('uses the same identity for tool, shot, throw, melee and surrender actions', () => {
    expect(['bazooka', 'blowtorch', 'grenade', 'firepunch', 'surrender'].map(actionPose)).toEqual([
      'aim',
      'aim',
      'throw',
      'melee',
      'defeat',
    ]);
  });
});
