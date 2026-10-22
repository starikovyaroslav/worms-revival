import { Sprite, type Container } from 'pixi.js';
import type { Entity, World, Ruleset } from '@wr/sim';
import { assets } from '../assets';

export const OUTLINE = 0x1a1a1a;

export interface EntityView {
  readonly container: Container;
  update(alpha: number, dtMs: number): void;
}

/** What the scene lends to every view: the world, and per-frame facts that change what a view shows. */
export interface ViewContext {
  vfxNamespace?: string;
  readonly world: World;
  readonly rules?: Ruleset;
  /** The active worm has the Crate Spy utility: crates show their contents. Set by the scene each frame. */
  crateSpy: boolean;
}

export type ViewFactory<E extends Entity = Entity> = (e: E, ctx: ViewContext) => EntityView;

/**
 * A pixel-art sprite at its manifest display size, independent of the PNG's pixel density, or
 * null when the asset is missing.
 */
export function artSprite(id: string, anchorY = 0.5): Sprite | null {
  const tex = assets.get(id);
  if (!tex) return null;
  const s = new Sprite(tex);
  s.anchor.set(0.5, anchorY);
  scaleArt(s);
  return s;
}

/** Re-apply after swapping density or frame dimensions; facing never overwrites the density. */
export function scaleArt(sprite: Sprite, facing = 1, scaleY = 1): void {
  const tex = sprite.texture,
    size = assets.sizeOf(tex);
  sprite.scale.set((facing * size.w) / tex.width, (scaleY * size.h) / tex.height);
}

/** Moves a container to the entity's interpolated position. */
export function place(c: Container, e: Entity, alpha: number): void {
  c.position.set(e.prevX + (e.x - e.prevX) * alpha, e.prevY + (e.y - e.prevY) * alpha);
}
