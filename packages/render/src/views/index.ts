import {
  Arrow,
  Barrel,
  Crate,
  DigTool,
  Donkey,
  Flame,
  Gas,
  Gravestone,
  JetPack,
  Mine,
  Pigeon,
  Projectile,
  Rope,
  Sheep,
  type AnimalLook,
  type Entity,
  type Look,
  type World,
  type Ruleset,
} from '@wr/sim';
import { ArrowView } from './arrow';
import { BarrelView } from './barrel';
import type { EntityView, ViewContext, ViewFactory } from './common';
import { CrateView } from './crate';
import { DigToolView } from './digTool';
import { DonkeyView } from './donkey';
import { FlameView, GasView } from './flame';
import { GravestoneView } from './gravestone';
import { JetPackView } from './jetpack';
import { MineView } from './mine';
import { PigeonView } from './pigeon';
import { PROJECTILE_LOOKS, ProjectileView } from './projectile';
import { RopeView } from './rope';
import { ANIMAL_DRAW, SheepView } from './sheep';

export type { EntityView, ViewContext, ViewFactory } from './common';

/** An entity class (abstract bases included) the registry can be keyed by. */
export type EntityClass<E extends Entity = Entity> = abstract new (...args: never[]) => E;

/**
 * Every look the renderer can draw (projectiles and animals). Built from the typed look tables,
 * so a look added in sim does not compile until it is handled there; the registry test checks
 * the specs against it.
 */
export const RENDERED_LOOKS = Object.fromEntries(
  [...Object.keys(PROJECTILE_LOOKS), ...Object.keys(ANIMAL_DRAW), 'sheep'].map((k) => [k, true]),
) as Record<Look | AnimalLook, true>;

/** Entity class -> view factory. A new visible entity is one line here and one file in `views/`. */
const VIEWS = new Map<EntityClass, ViewFactory<never>>();

/** Registers the view of an entity class; subclasses without their own entry use it too. */
function register<E extends Entity>(cls: EntityClass<E>, factory: ViewFactory<E>): void {
  VIEWS.set(cls, factory as ViewFactory<never>);
}

register(Pigeon, (e) => new PigeonView(e));
register(Arrow, (e) => new ArrowView(e));
register(Projectile, (e) => new ProjectileView(e));
register(Gravestone, (e) => new GravestoneView(e));
register(Mine, (e) => new MineView(e));
register(Barrel, (e, ctx) => new BarrelView(e, ctx));
register(Flame, (e) => new FlameView(e));
register(Gas, (e) => new GasView(e));
register(Sheep, (e) => new SheepView(e));
register(Donkey, (e) => new DonkeyView(e));
register(JetPack, (e, ctx) => new JetPackView(e, ctx));
register(Rope, (e, ctx) => new RopeView(e, ctx));
register(Crate, (e, ctx) => new CrateView(e, ctx));
register(DigTool, (e) => new DigToolView(e));

/** A fresh view context for a world (the scene keeps it and updates `crateSpy` each frame). */
export function createViewContext(world: World, rules?: Ruleset): ViewContext {
  return { world, rules, crateSpy: false };
}

/** Creates a view for a non-worm entity, or null if it has no visual. */
export function createEntityView(e: Entity, ctx: ViewContext): EntityView | null {
  // Walk up the class chain: a Projectile subclass (homing missile) shares its base's view.
  for (let proto = Object.getPrototypeOf(e); proto; proto = Object.getPrototypeOf(proto)) {
    const factory = VIEWS.get(proto.constructor as EntityClass);
    if (factory) return (factory as ViewFactory)(e, ctx);
  }
  return null;
}
