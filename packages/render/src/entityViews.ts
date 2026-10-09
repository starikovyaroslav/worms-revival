import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { assets } from './assets';
import {
  Arrow,
  Barrel,
  Crate,
  DigTool,
  Flame,
  Gas,
  Gravestone,
  Mine,
  Pigeon,
  Projectile,
  Rope,
  Sheep,
  Worm,
  type Entity,
  type World,
} from '@wr/sim';
import { TEAM_COLORS } from './wormView';

const OUTLINE = 0x1a1a1a;

/**
 * A pixel-art sprite from the asset store at its native size (1 art pixel = 1 world pixel), or
 * null when the asset is missing (the view then draws its built-in fallback).
 */
function artSprite(id: string, anchorY = 0.5): Sprite | null {
  const tex = assets.get(id);
  if (!tex) return null;
  const s = new Sprite(tex);
  s.anchor.set(0.5, anchorY);
  return s;
}

function mixColor(a: number, b: number, t: number): number {
  const ch = (c: number, sh: number) => (c >> sh) & 255;
  const m = (sh: number) => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

/** Projectile looks that have pixel art. */
const PROJECTILE_ART: Record<string, string> = {
  grenade: 'proj/grenade',
  cluster: 'proj/cluster',
  clusterlet: 'proj/bomblet',
  mortar: 'proj/bomblet',
  banana: 'proj/banana',
  bananalet: 'proj/banana',
  hhg: 'proj/hhg',
  dynamite: 'proj/dynamite',
  missile: 'proj/rocket',
  homing: 'proj/rocket',
};

/** Looks drawn as a cycle of pre-rotated frames: asset prefix and the rotation (radians) one cycle covers. */
const SPIN_ART: Record<string, { prefix: string; period: number }> = {
  grenade: { prefix: 'spin/grenade_', period: Math.PI },
  cluster: { prefix: 'spin/cluster_', period: Math.PI * 2 },
  banana: { prefix: 'spin/banana_', period: Math.PI * 2 },
  bananalet: { prefix: 'spin/banana_', period: Math.PI * 2 },
};

export interface EntityView {
  readonly container: Container;
  update(alpha: number, dtMs: number): void;
}

class ProjectileView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();
  private spin = 0;

  private art: Sprite | null = null;
  private frames: Texture[] = [];
  private period = Math.PI * 2;

  constructor(private readonly p: Projectile) {
    const cycle = SPIN_ART[p.look];
    if (cycle) {
      const n = assets.count(cycle.prefix);
      for (let i = 0; i < n; i++) this.frames.push(assets.get(`${cycle.prefix}${i}`) as Texture);
      this.period = cycle.period;
    }
    const artId = PROJECTILE_ART[p.look];
    const art = this.frames.length
      ? artSprite(`${cycle!.prefix}0`)
      : artId
        ? artSprite(artId)
        : null;
    if (art) {
      this.art = art;
      this.container.addChild(art);
    } else {
      this.container.addChild(this.g);
      this.draw();
    }
  }

  private draw(): void {
    const g = this.g;
    switch (this.p.look) {
      case 'homing':
        g.roundRect(-8, -2.5, 14, 5, 2).fill(0xc8c8d0).stroke({ color: OUTLINE, width: 1 });
        g.moveTo(6, -2.5)
          .lineTo(11, 0)
          .lineTo(6, 2.5)
          .closePath()
          .fill(0x2a8ad8)
          .stroke({ color: OUTLINE, width: 1 });
        g.moveTo(-8, -2.5).lineTo(-11, -6).lineTo(-6, -1).closePath().fill(0x2a8ad8);
        g.moveTo(-8, 2.5).lineTo(-11, 6).lineTo(-6, 1).closePath().fill(0x2a8ad8);
        break;
      case 'mortar':
        g.circle(0, 0, 3.2).fill(0x4a5238).stroke({ color: OUTLINE, width: 1 });
        g.circle(-1, -1, 1).fill({ color: 0xffffff, alpha: 0.5 });
        break;
      case 'missile':
        g.roundRect(-7, -2.5, 12, 5, 2).fill(0x7a8a6a).stroke({ color: OUTLINE, width: 1 });
        g.moveTo(5, -2.5)
          .lineTo(9, 0)
          .lineTo(5, 2.5)
          .closePath()
          .fill(0xd03030)
          .stroke({ color: OUTLINE, width: 1 });
        g.moveTo(-7, -2.5).lineTo(-10, -5).lineTo(-6, -1).closePath().fill(0x55604a);
        g.moveTo(-7, 2.5).lineTo(-10, 5).lineTo(-6, 1).closePath().fill(0x55604a);
        break;
      case 'grenade':
        g.circle(0, 0, 4).fill(0x3f7a2a).stroke({ color: OUTLINE, width: 1 });
        g.rect(-1.5, -6.5, 3, 2.5).fill(0x999999);
        g.circle(-1.3, -1.3, 1.2).fill({ color: 0xffffff, alpha: 0.5 });
        break;
      case 'cluster':
        g.circle(0, 0, 4).fill(0xc0392b).stroke({ color: OUTLINE, width: 1 });
        g.circle(-1.3, -1.3, 1.2).fill({ color: 0xffffff, alpha: 0.5 });
        break;
      case 'dynamite':
        g.roundRect(-2.5, -5, 5, 10, 1).fill(0xc0392b).stroke({ color: OUTLINE, width: 1 });
        g.rect(-2.5, -1.5, 5, 1.5).fill(0xf0d080);
        g.moveTo(0, -5).quadraticCurveTo(2, -8, 1, -10).stroke({ color: 0x333333, width: 1 });
        break;
      case 'banana':
      case 'bananalet': {
        const k = this.p.look === 'banana' ? 1 : 0.7;
        g.moveTo(-5 * k, -2 * k)
          .quadraticCurveTo(0, 5 * k, 5 * k, -2 * k)
          .quadraticCurveTo(0, 2 * k, -5 * k, -2 * k)
          .closePath()
          .fill(0xffe135)
          .stroke({ color: OUTLINE, width: 1 });
        g.circle(5 * k, -2 * k, 0.9).fill(0x5a3a10);
        break;
      }
      case 'hhg':
        g.circle(0, 0, 4.5).fill(0xf2c230).stroke({ color: OUTLINE, width: 1 });
        g.rect(-0.8, -9, 1.6, 5).fill(0xf2c230);
        g.rect(-2.5, -7.5, 5, 1.4).fill(0xf2c230);
        g.circle(-1.5, -1.5, 1.3).fill({ color: 0xffffff, alpha: 0.6 });
        break;
      case 'dragonball':
        g.circle(0, 0, 4.5).fill({ color: 0xff5a10, alpha: 0.7 });
        g.circle(0, 0, 3).fill(0xffb030);
        g.circle(0, 0, 1.4).fill(0xfff0a0);
        break;
      case 'petrol':
        g.roundRect(-2, -4, 4, 8, 1).fill(0x4a9a5a).stroke({ color: OUTLINE, width: 1 });
        g.rect(-1, -6, 2, 2.5).fill(0xe8e0c0);
        g.circle(0, -7, 1.3).fill(0xffa020);
        break;
      case 'skunk':
        g.ellipse(0, 0, 5, 3.4).fill(0x2a2a30).stroke({ color: OUTLINE, width: 1 });
        g.rect(-3, -2.6, 6, 1.6).fill(0xf4f4f4);
        g.circle(5, -1, 1.6).fill(0x2a2a30);
        break;
      case 'napalm':
      case 'carpet':
        g.roundRect(-5, -2, 10, 4, 2)
          .fill(this.p.look === 'napalm' ? 0xd08030 : 0x6a7a5a)
          .stroke({ color: OUTLINE, width: 1 });
        g.moveTo(-5, -2).lineTo(-8, -4).lineTo(-6, 0).closePath().fill(0x444444);
        break;
      case 'letter':
        g.rect(-4, -3, 8, 6).fill(0xf4f0e0).stroke({ color: OUTLINE, width: 1 });
        g.moveTo(-4, -3).lineTo(0, 0.5).lineTo(4, -3).stroke({ color: OUTLINE, width: 0.8 });
        break;
      case 'frenchsheep':
        g.circle(0, 0, 4.4).fill(0xf8f8f0).stroke({ color: OUTLINE, width: 1 });
        g.circle(4, -1, 2).fill(0x3a3a40);
        g.circle(0, 5, 2.2).fill({ color: 0xff7020, alpha: 0.9 });
        break;
      case 'clusterlet':
        g.circle(0, 0, 2.2).fill(0x5a2020).stroke({ color: OUTLINE, width: 0.8 });
        break;
      default:
        g.circle(0, 0, this.p.radius + 1)
          .fill(0xffffff)
          .stroke({ color: OUTLINE, width: 1 });
    }
  }

  update(alpha: number, dtMs: number): void {
    const p = this.p;
    this.container.position.set(
      p.prevX + (p.x - p.prevX) * alpha,
      p.prevY + (p.y - p.prevY) * alpha,
    );
    if (p.spec.impact === 'explode') {
      // Missiles point along their flight path.
      this.container.rotation = Math.atan2(p.vy, p.vx);
    } else if (!p.resting) {
      this.spin += (p.vx * dtMs) / 120;
      if (this.frames.length && this.art) {
        // Pre-rotated frames: step through them instead of rotating (keeps the pixels crisp).
        const t = (((this.spin / this.period) % 1) + 1) % 1;
        this.art.texture = this.frames[Math.floor(t * this.frames.length)] as Texture;
      } else this.container.rotation = this.spin;
    }
  }
}

class GravestoneView implements EntityView {
  readonly container = new Container();

  constructor(private readonly s: Gravestone) {
    const color = TEAM_COLORS[s.team % TEAM_COLORS.length] as number;
    const art = artSprite('objects/tombstone', 0.8);
    if (art) {
      // A hint of the team's colour on the whole stone.
      art.tint = mixColor(0xffffff, color, 0.4);
      this.container.addChild(art);
      return;
    }
    const g = new Graphics();
    g.moveTo(-5, 5).lineTo(-5, -3).arc(0, -3, 5, Math.PI, 0).lineTo(5, 5).closePath();
    g.fill(0xa0a0a8).stroke({ color: OUTLINE, width: 1 });
    g.rect(-0.8, -6, 1.6, 7).fill(color);
    g.rect(-3, -4, 6, 1.6).fill(color);
    this.container.addChild(g);
  }

  update(alpha: number): void {
    const s = this.s;
    this.container.position.set(
      s.prevX + (s.x - s.prevX) * alpha,
      s.prevY + (s.y - s.prevY) * alpha,
    );
  }
}

/** Interpolated position helper. */
function place(c: Container, e: Entity, alpha: number): void {
  c.position.set(e.prevX + (e.x - e.prevX) * alpha, e.prevY + (e.y - e.prevY) * alpha);
}

class MineView implements EntityView {
  readonly container = new Container();
  private light = new Graphics();
  private t = 0;

  constructor(private readonly m: Mine) {
    const art = artSprite('objects/mine', 0.7);
    if (art) {
      this.container.addChild(art);
    } else {
      const g = new Graphics();
      g.ellipse(0, 1, 5, 3.2).fill(0x30343a).stroke({ color: OUTLINE, width: 1 });
      g.rect(-1, -3.5, 2, 2).fill(0x555555);
      this.container.addChild(g);
    }
    this.container.addChild(this.light);
  }

  update(alpha: number, dtMs: number): void {
    place(this.container, this.m, alpha);
    this.t += dtMs / 1000;
    const m = this.m;
    // Slow blink when armed, frantic when triggered, nothing for a fizzled dud.
    const rate = m.triggered ? 10 : 1.5;
    const on = m.armed && Math.sin(this.t * rate * Math.PI) > 0;
    this.light.clear();
    if (on) this.light.circle(0, -0.5, 1.4).fill(0xff2020);
    else if (m.spent) this.light.circle(0, -0.5, 1.2).fill(0x444444);
  }
}

class BarrelView implements EntityView {
  readonly container = new Container();

  constructor(private readonly b: Barrel) {
    const art = artSprite('objects/barrel');
    if (art) {
      this.container.addChild(art);
      return;
    }
    const g = new Graphics();
    g.roundRect(-5.5, -7, 11, 14, 2).fill(0xb83a2a).stroke({ color: OUTLINE, width: 1 });
    g.rect(-5.5, -3.5, 11, 1.4).fill(0x6a1a12);
    g.rect(-5.5, 2.5, 11, 1.4).fill(0x6a1a12);
    g.rect(-3.5, -6, 2, 12).fill({ color: 0xffffff, alpha: 0.18 });
    // Flame warning sign.
    g.moveTo(0, -2).lineTo(2, 1.5).lineTo(-2, 1.5).closePath().fill(0xffd23a);
    this.container.addChild(g);
  }

  update(alpha: number): void {
    place(this.container, this.b, alpha);
  }
}

class FlameView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();
  private t = Math.random() * 10;

  constructor(private readonly f: Flame) {
    this.container.addChild(this.g);
  }

  update(alpha: number, dtMs: number): void {
    place(this.container, this.f, alpha);
    this.t += dtMs / 1000;
    const flicker = 0.75 + Math.sin(this.t * 25) * 0.25;
    const fade = Math.min(1, this.f.life / 40);
    const r = 3.5 * flicker * (0.5 + fade * 0.5);
    this.g
      .clear()
      .circle(0, -r * 0.6, r * 1.3)
      .fill({ color: 0xff5a10, alpha: 0.55 * fade })
      .circle(0, -r * 0.5, r)
      .fill({ color: 0xffb030, alpha: 0.9 * fade })
      .circle(0, -r * 0.3, r * 0.5)
      .fill({ color: 0xfff0a0, alpha: fade });
  }
}

class GasView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();
  private t = Math.random() * 10;

  constructor(private readonly gas: Gas) {
    this.container.addChild(this.g);
  }

  update(alpha: number, dtMs: number): void {
    place(this.container, this.gas, alpha);
    this.t += dtMs / 1000;
    const fade = Math.min(1, this.gas.life / 90);
    const r = 7 + Math.sin(this.t * 2) * 1.5;
    this.g
      .clear()
      .circle(0, 0, r)
      .fill({ color: 0x8aa840, alpha: 0.22 * fade })
      .circle(0, 0, r * 0.6)
      .fill({ color: 0xb4d060, alpha: 0.22 * fade });
  }
}

class SheepView implements EntityView {
  readonly container = new Container();
  private body = new Graphics();
  private t = 0;

  private art: Sprite | null;

  constructor(private readonly s: Sheep) {
    this.art = artSprite('proj/sheep', 0.56);
    if (this.art) this.container.addChild(this.art);
    this.container.addChild(this.body);
  }

  update(alpha: number, dtMs: number): void {
    const s = this.s;
    place(this.container, s, alpha);
    this.t += dtMs / 1000;
    const g = this.body.clear();
    const flying = s.mode === 'fly';
    // Fluffy body: a cluster of white puffs.
    const bob = flying ? 0 : Math.abs(Math.sin(this.t * 14)) * 1.2;
    if (this.art) {
      // Artwork: it bounces as it trots, and the Super Sheep gets a cape.
      this.art.y = -bob;
      const superTex = assets.get('proj/supersheep');
      if (flying && superTex) this.art.texture = superTex;
      this.container.rotation = flying ? s.heading : 0;
      this.container.scale.set(flying ? 1 : s.dir, 1);
      return;
    }
    for (const [x, y, r] of [
      [-3, -1, 3.5],
      [0, -2.5, 3.8],
      [3, -1, 3.5],
      [0, 0.5, 3.5],
    ] as const) {
      g.circle(x, y - bob, r + 0.9).fill(OUTLINE);
    }
    for (const [x, y, r] of [
      [-3, -1, 3.5],
      [0, -2.5, 3.8],
      [3, -1, 3.5],
      [0, 0.5, 3.5],
    ] as const) {
      g.circle(x, y - bob, r).fill(0xf8f8f0);
    }
    // Head and legs.
    g.ellipse(5.5, -2.5 - bob, 2.6, 2).fill(0x2a2a2a);
    g.circle(6.3, -3 - bob, 0.7).fill(0xffffff);
    if (!flying) {
      const step = Math.sin(this.t * 14) * 1.2;
      g.rect(-3 + step, 2.5 - bob, 1.2, 3).fill(0x2a2a2a);
      g.rect(2 - step, 2.5 - bob, 1.2, 3).fill(0x2a2a2a);
    } else {
      // Super Sheep cape.
      g.moveTo(-2, -4)
        .lineTo(-9, -6 + Math.sin(this.t * 20) * 2)
        .lineTo(-8, 0)
        .closePath()
        .fill(0xd02020);
    }
    if (flying) {
      this.container.rotation = s.heading;
      this.container.scale.set(1, 1);
    } else {
      this.container.rotation = 0;
      this.container.scale.set(s.dir, 1);
    }
  }
}

class RopeView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();

  constructor(
    private readonly r: Rope,
    private readonly world: World,
  ) {
    this.container.addChild(this.g);
  }

  update(alpha: number): void {
    const g = this.g.clear();
    const worm = this.world.byId(this.r.wormId);
    if (!(worm instanceof Worm)) return;
    const wx = worm.prevX + (worm.x - worm.prevX) * alpha;
    const wy = worm.prevY + (worm.y - worm.prevY) * alpha - 7;
    if (this.r.state === 'shooting') {
      g.moveTo(wx, wy).lineTo(this.r.hookX, this.r.hookY).stroke({ color: 0x3a2a1a, width: 1.5 });
      g.circle(this.r.hookX, this.r.hookY, 2).fill(0x888888);
      return;
    }
    if (this.r.state !== 'attached') return;
    const pts = [...this.r.anchors].reverse();
    g.moveTo(wx, wy);
    for (const p of pts) g.lineTo(p.x, p.y);
    g.stroke({ color: 0x3a2a1a, width: 1.8 });
    const hook = this.r.anchors[0];
    if (hook) g.circle(hook.x, hook.y, 2.2).fill(0x888888).stroke({ color: OUTLINE, width: 0.8 });
  }
}

class DigToolView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();

  constructor(private readonly d: DigTool) {
    this.container.addChild(this.g);
  }

  update(alpha: number): void {
    place(this.container, this.d, alpha);
    const g = this.g.clear();
    // A burst of sparks at the business end.
    const torch = this.d.mode === 'torch';
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 6;
      g.circle(
        Math.cos(a) * r + (torch ? 0 : 0),
        Math.sin(a) * r + (torch ? -7 : 2),
        1 + Math.random(),
      ).fill(torch ? 0xffa030 : 0xd8c8a0);
    }
  }
}

class CrateView implements EntityView {
  readonly container = new Container();
  private chute = new Graphics();
  private canopy: Sprite | null = null;
  private t = Math.random() * 5;

  constructor(private readonly c: Crate) {
    const art = artSprite(c.content === 'health' ? 'objects/crate-health' : 'objects/crate-weapon');
    if (art) {
      this.canopy = artSprite('objects/parachute', 1);
      if (this.canopy) {
        this.canopy.y = -5;
        this.container.addChild(this.canopy);
      }
      this.container.addChild(this.chute, art);
      return;
    }
    const g = new Graphics();
    if (c.content === 'health') {
      g.roundRect(-7, -7, 14, 14, 2).fill(0xf4f4f4).stroke({ color: OUTLINE, width: 1 });
      g.rect(-1.8, -5, 3.6, 10).fill(0xd82020);
      g.rect(-5, -1.8, 10, 3.6).fill(0xd82020);
    } else {
      g.roundRect(-7, -7, 14, 14, 2).fill(0x9a6a32).stroke({ color: OUTLINE, width: 1 });
      g.moveTo(-6, -6)
        .lineTo(6, 6)
        .moveTo(6, -6)
        .lineTo(-6, 6)
        .stroke({ color: 0x6a4420, width: 1.5 });
      g.rect(-7, -1, 14, 2).fill(0x6a4420);
      g.circle(0, 0, 3.2).fill(0xffd23a).stroke({ color: OUTLINE, width: 0.8 });
    }
    this.container.addChild(this.chute, g);
  }

  update(alpha: number, dtMs: number): void {
    place(this.container, this.c, alpha);
    this.t += dtMs / 1000;
    const g = this.chute.clear();
    if (this.canopy) {
      this.canopy.visible = this.c.chute;
      this.canopy.rotation = Math.sin(this.t * 2.5) * 0.06;
      return;
    }
    if (!this.c.chute) return;
    // Swaying canopy.
    const sway = Math.sin(this.t * 2.5) * 3;
    g.moveTo(-16 + sway, -26)
      .quadraticCurveTo(sway, -44, 16 + sway, -26)
      .closePath();
    g.fill(0xffffff).stroke({ color: OUTLINE, width: 1 });
    for (const s of [-10, 0, 10]) g.rect(s - 2 + sway, -31, 4, 4).fill(0x3a7ad8);
    g.moveTo(-16 + sway, -26)
      .lineTo(-6, -7)
      .moveTo(16 + sway, -26)
      .lineTo(6, -7)
      .stroke({ color: 0x666666, width: 0.6 });
  }
}

class PigeonView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();
  private t = 0;

  private art: Sprite | null;

  constructor(private readonly p: Pigeon) {
    this.art = artSprite('proj/pigeon');
    this.container.addChild(this.art ?? this.g);
  }

  update(alpha: number, dtMs: number): void {
    place(this.container, this.p, alpha);
    this.t += dtMs / 1000;
    const p = this.p;
    const left = Math.cos(p.heading) < 0;
    this.container.scale.set(left ? -1 : 1, 1);
    if (this.art) return;
    // Flapping wing, banking with the flight direction.
    const flap = Math.sin(this.t * 28) * 5;
    const g = this.g.clear();
    g.ellipse(0, 0, 6, 3.6).fill(0xe8e8ee).stroke({ color: OUTLINE, width: 1 });
    g.circle(6, -1.5, 2.4).fill(0xe8e8ee).stroke({ color: OUTLINE, width: 1 });
    g.moveTo(8, -1.5).lineTo(11, -0.8).lineTo(8, -0.4).closePath().fill(0xf2a030);
    g.circle(6.8, -2.2, 0.6).fill(0x111111);
    g.moveTo(-6, 0).lineTo(-10, 1.5).lineTo(-6, 2).closePath().fill(0xb8b8c4);
    g.moveTo(-1, -1)
      .quadraticCurveTo(-3, -6 - flap, 2, -7 - flap)
      .lineTo(2, -1)
      .closePath()
      .fill(0xcfcfd8);
    g.stroke({ color: OUTLINE, width: 0.8 });
    // The mail it carries.
    g.rect(-3, 3, 4, 3).fill(0xffffff).stroke({ color: OUTLINE, width: 0.6 });
  }
}

class ArrowView implements EntityView {
  readonly container = new Container();

  constructor(private readonly a: Arrow) {
    const art = artSprite('proj/arrow');
    if (art) {
      this.container.addChild(art);
      return;
    }
    const g = new Graphics();
    g.moveTo(-9, 0).lineTo(5, 0).stroke({ color: 0x8a6a3a, width: 1.6 });
    g.moveTo(5, -2)
      .lineTo(9, 0)
      .lineTo(5, 2)
      .closePath()
      .fill(0xcfd2d8)
      .stroke({ color: OUTLINE, width: 0.6 });
    g.moveTo(-9, 0)
      .lineTo(-12, -3)
      .moveTo(-9, 0)
      .lineTo(-12, 3)
      .moveTo(-7, 0)
      .lineTo(-10, -3)
      .moveTo(-7, 0)
      .lineTo(-10, 3);
    g.stroke({ color: 0xd04040, width: 1.2 });
    this.container.addChild(g);
  }

  update(alpha: number): void {
    place(this.container, this.a, alpha);
    this.container.rotation = Math.atan2(this.a.vy, this.a.vx);
  }
}

/** Creates a view for a non-worm entity, or null if it has no visual. */
export function createEntityView(e: Entity, world: World): EntityView | null {
  if (e instanceof Pigeon) return new PigeonView(e);
  if (e instanceof Arrow) return new ArrowView(e);
  if (e instanceof Projectile) return new ProjectileView(e);
  if (e instanceof Gravestone) return new GravestoneView(e);
  if (e instanceof Mine) return new MineView(e);
  if (e instanceof Barrel) return new BarrelView(e);
  if (e instanceof Flame) return new FlameView(e);
  if (e instanceof Gas) return new GasView(e);
  if (e instanceof Sheep) return new SheepView(e);
  if (e instanceof Rope) return new RopeView(e, world);
  if (e instanceof Crate) return new CrateView(e);
  if (e instanceof DigTool) return new DigToolView(e);
  return null;
}
