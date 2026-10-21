import { Container, Graphics, type Sprite, type Texture } from 'pixi.js';
import type { Look, Projectile } from '@wr/sim';
import { assets } from '../assets';
import { OUTLINE, artSprite, place, type EntityView } from './common';
import { GENERATED_PROJECTILES } from '../arsenalArt';
import { clipTextures } from '../clipEffects';

/** How a look is drawn: pixel art (optionally a cycle of pre-rotated frames) or code. */
type LookArt =
  | { art: string; spin?: { prefix: string; period: number } }
  | { draw: (g: Graphics, p: Projectile) => void };

const sprite = (art: string): LookArt => ({ art });
/** Pre-rotated frames: asset prefix and the rotation (radians) one cycle covers. */
const spun = (art: string, prefix: string, period: number): LookArt => ({
  art,
  spin: { prefix, period },
});

const star = (g: Graphics, r: number, fill: number, ow = 1) =>
  g.circle(0, 0, r).fill(fill).stroke({ color: OUTLINE, width: ow });

/**
 * Every projectile look, as a full record: a look added in sim does not compile until it is handled
 * here. Looks with pixel art name it; the rest keep a code-drawn body (no sprite yet).
 */
export const PROJECTILE_LOOKS: Record<Look, LookArt> = {
  grenade: spun('proj/grenade', 'spin/grenade_', Math.PI),
  cluster: spun('proj/cluster', 'spin/cluster_', Math.PI * 2),
  clusterlet: sprite('proj/bomblet'),
  mortar: sprite('proj/bomblet'),
  banana: spun('proj/banana', 'spin/banana_', Math.PI * 2),
  bananalet: spun('proj/banana', 'spin/banana_', Math.PI * 2),
  hhg: sprite('proj/hhg'),
  dynamite: sprite('proj/dynamite'),
  missile: sprite('proj/rocket'),
  homing: sprite('proj/rocket'),
  meteor: {
    draw: (g) => {
      star(g, 3.6, 0x6a3a2a);
      g.circle(-1, -4, 2.4).fill({ color: 0xff8a20, alpha: 0.8 });
    },
  },
  vase: {
    draw: (g) => {
      g.ellipse(0, 0, 3.4, 4.6).fill(0xe8e8f0).stroke({ color: 0x2a60c0, width: 1.2 });
      g.rect(-1.4, -6, 2.8, 2).fill(0xe8e8f0);
    },
  },
  shard: { draw: (g) => g.moveTo(-2, 1).lineTo(0, -2).lineTo(2, 1).closePath().fill(0xe8e8f0) },
  bullet: { draw: (g) => star(g, 2.2, 0xffe060, 0.8) },
  mbbomb: {
    draw: (g) => {
      star(g, 5.5, 0x5a5a62, 1.2);
      g.rect(-3, -3, 6, 6).fill(0xd8b020);
      g.rect(-1, -9, 2, 4).fill(0x999999);
    },
  },
  dragonball: {
    draw: (g) => {
      g.circle(0, 0, 4.5).fill({ color: 0xff5a10, alpha: 0.7 });
      g.circle(0, 0, 3).fill(0xffb030);
      g.circle(0, 0, 1.4).fill(0xfff0a0);
    },
  },
  petrol: {
    draw: (g) => {
      g.roundRect(-2, -4, 4, 8, 1).fill(0x4a9a5a).stroke({ color: OUTLINE, width: 1 });
      g.rect(-1, -6, 2, 2.5).fill(0xe8e0c0);
      g.circle(0, -7, 1.3).fill(0xffa020);
    },
  },
  skunk: {
    draw: (g) => {
      g.ellipse(0, 0, 5, 3.4).fill(0x2a2a30).stroke({ color: OUTLINE, width: 1 });
      g.rect(-3, -2.6, 6, 1.6).fill(0xf4f4f4);
      g.circle(5, -1, 1.6).fill(0x2a2a30);
    },
  },
  napalm: {
    draw: (g) => {
      g.roundRect(-5, -2, 10, 4, 2).fill(0xd08030).stroke({ color: OUTLINE, width: 1 });
      g.moveTo(-5, -2).lineTo(-8, -4).lineTo(-6, 0).closePath().fill(0x444444);
    },
  },
  carpet: {
    draw: (g) => {
      g.roundRect(-5, -2, 10, 4, 2).fill(0x6a7a5a).stroke({ color: OUTLINE, width: 1 });
      g.moveTo(-5, -2).lineTo(-8, -4).lineTo(-6, 0).closePath().fill(0x444444);
    },
  },
  letter: {
    draw: (g) => {
      g.rect(-4, -3, 8, 6).fill(0xf4f0e0).stroke({ color: OUTLINE, width: 1 });
      g.moveTo(-4, -3).lineTo(0, 0.5).lineTo(4, -3).stroke({ color: OUTLINE, width: 0.8 });
    },
  },
  frenchsheep: {
    draw: (g) => {
      star(g, 4.4, 0xf8f8f0);
      g.circle(4, -1, 2).fill(0x3a3a40);
      g.circle(0, 5, 2.2).fill({ color: 0xff7020, alpha: 0.9 });
    },
  },
};

export class ProjectileView implements EntityView {
  readonly container = new Container();
  private spin = 0;
  private art: Sprite | null = null;
  private frames: Texture[] = [];
  private period = Math.PI * 2;
  private bananaFrames: Texture[] = [];
  private flightFrames: Texture[] = [];
  private flightTime = 0;

  constructor(private readonly p: Projectile) {
    if (p.look === 'missile' || p.look === 'homing' || p.look === 'letter') {
      this.flightFrames = clipTextures(p.look);
      if (this.flightFrames.length) {
        this.art = artSprite(`vfx/${p.look}_0`);
        if (this.art) {
          this.container.addChild(this.art);
          return;
        }
      }
    }
    const generated = GENERATED_PROJECTILES[p.look];
    this.art = generated ? artSprite(generated) : null;
    if (this.art) {
      if (p.look === 'banana' || p.look === 'bananalet') {
        const a = assets.get('creatures/banana_0'),
          b = assets.get('creatures/banana_1');
        if (a && b) this.bananaFrames = [a, b];
      }
      this.container.addChild(this.art);
      return;
    }
    const look = PROJECTILE_LOOKS[p.look];
    if ('draw' in look) {
      const g = new Graphics();
      look.draw(g, p);
      this.container.addChild(g);
      return;
    }
    if (look.spin) {
      const n = assets.count(look.spin.prefix);
      for (let i = 0; i < n; i++)
        this.frames.push(assets.get(`${look.spin.prefix}${i}`) as Texture);
      this.period = look.spin.period;
    }
    this.art = artSprite(this.frames.length && look.spin ? `${look.spin.prefix}0` : look.art);
    // The art is missing from the manifest: a plain ball, so the entity stays visible.
    if (this.art) this.container.addChild(this.art);
    else this.container.addChild(new Graphics().circle(0, 0, p.radius + 1).fill(0xffffff));
  }

  update(alpha: number, dtMs: number): void {
    const p = this.p;
    if (this.art && this.flightFrames.length) {
      this.flightTime += dtMs / 1000;
      this.art.texture =
        this.flightFrames[Math.floor(this.flightTime * 12) % this.flightFrames.length]!;
    }
    place(this.container, p, alpha);
    if (p.spec.impact === 'explode') {
      // Missiles point along their flight path.
      this.container.rotation = Math.atan2(p.vy, p.vx);
    } else if (!p.resting) {
      this.spin += (p.vx * dtMs) / 120;
      if (this.bananaFrames.length && this.art) {
        const step = Math.round(this.spin / (Math.PI / 4));
        this.art.texture = this.bananaFrames[((step % 2) + 2) % 2]!;
        this.container.rotation = Math.floor(step / 2) * (Math.PI / 2);
        return;
      }
      if (this.frames.length && this.art) {
        // Pre-rotated frames: step through them instead of rotating (keeps the pixels crisp).
        const t = (((this.spin / this.period) % 1) + 1) % 1;
        this.art.texture = this.frames[Math.floor(t * this.frames.length)] as Texture;
      } else this.container.rotation = this.spin;
    }
  }
}
