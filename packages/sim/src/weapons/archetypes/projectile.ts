import type { Upgrades } from '../../game/scheme';
import { scaledBlast } from '../blast';
import type { ClusterSpec, ProjectileSpec } from '../projectile';
import type { SoundId, Look } from '../spec';
import type { FireContext } from '../weapon';

/*
 * Declarative description of a projectile (what `Projectile` takes), with the few values that depend
 * on the player's choices or the scheme resolved at the moment of firing: the fuse and bounce
 * settings, the power stars, and upgrades.
 */

export interface BlastParams {
  /** Damage at power level 3 (see `scaledBlast`). */
  damage: number;
  push?: number;
  noCrater?: boolean;
  /** Damage instead when the scheme enables this upgrade. */
  upgrade?: { name: keyof Upgrades; damage: number };
}

export interface ClusterParams {
  count: number;
  /** Count instead when the scheme enables this upgrade. */
  upgrade?: { name: keyof Upgrades; count: number };
  minSpeed: number;
  maxSpeed: number;
  spread: number;
  reverse?: boolean;
  projectile: ProjectileParams;
}

export interface ProjectileParams {
  look: Look;
  radius: number;
  wind: number;
  gravity?: number;
  impact: 'explode' | 'bounce';
  /** Ticks, or 'player' for the fuse the player dialled in. */
  fuse?: number | 'player';
  /** A number, or the pair the player's low/high bounce setting chooses from. */
  restitution?: number | { low: number; high: number };
  friction?: number;
  blast: BlastParams;
  cluster?: ClusterParams;
  flames?: { count: number; speed: number };
  gas?: { count: number };
  waitForRest?: boolean;
  preSound?: { id: SoundId; ticks: number };
}

type Choices = Pick<FireContext, 'setting' | 'upgrades' | 'fuse' | 'bounceHigh'>;

function buildBlast(b: BlastParams, ctx: Choices) {
  const damage = b.upgrade && ctx.upgrades[b.upgrade.name] ? b.upgrade.damage : b.damage;
  const extra: { push?: number; noCrater?: boolean } = {};
  if (b.push !== undefined) extra.push = b.push;
  if (b.noCrater !== undefined) extra.noCrater = b.noCrater;
  return scaledBlast(damage, ctx.setting.power, extra);
}

function buildCluster(c: ClusterParams, ctx: Choices): ClusterSpec {
  const out: ClusterSpec = {
    count: c.upgrade && ctx.upgrades[c.upgrade.name] ? c.upgrade.count : c.count,
    minSpeed: c.minSpeed,
    maxSpeed: c.maxSpeed,
    spread: c.spread,
    projectile: buildProjectile(c.projectile, ctx),
  };
  if (c.reverse !== undefined) out.reverse = c.reverse;
  return out;
}

/** The `ProjectileSpec` for one shot. Optional keys are only set when given (the spec is hashed). */
export function buildProjectile(p: ProjectileParams, ctx: Choices): ProjectileSpec {
  const out: ProjectileSpec = {
    look: p.look,
    radius: p.radius,
    wind: p.wind,
    impact: p.impact,
    blast: buildBlast(p.blast, ctx),
  };
  if (p.gravity !== undefined) out.gravity = p.gravity;
  if (p.fuse !== undefined) out.fuse = p.fuse === 'player' ? ctx.fuse : p.fuse;
  if (p.restitution !== undefined)
    out.restitution =
      typeof p.restitution === 'number'
        ? p.restitution
        : ctx.bounceHigh
          ? p.restitution.high
          : p.restitution.low;
  if (p.friction !== undefined) out.friction = p.friction;
  if (p.cluster) out.cluster = buildCluster(p.cluster, ctx);
  if (p.flames) out.flames = p.flames;
  if (p.gas) out.gas = p.gas;
  if (p.waitForRest !== undefined) out.waitForRest = p.waitForRest;
  if (p.preSound) out.preSound = p.preSound;
  return out;
}
