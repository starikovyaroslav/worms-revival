import { JetPack } from '../jetpack';
import { BUNGEE_SPEC, Rope } from '../rope';
import { Worm } from '../../worm/worm';
import { getWeapon, registerWeapon } from '../weapon';
import './tools';

const dist = (dx: number, dy: number) => Math.sqrt(dx * dx + dy * dy);

const girder = getWeapon('girder');
if (girder) {
  registerWeapon({
    ...girder,
    id: 'girderpack',
    name: 'Girder Starter Pack',
    row: 7,
    col: 4,
    shots: 5,
  });
}

registerWeapon({
  id: 'bungee',
  name: 'Bungee',
  row: 8,
  col: 1,
  aim: 'angle',
  charge: false,
  airborne: true,
  endsTurn: false,
  fire: (ctx) => {
    const cord = ctx.world.spawn(new Rope(ctx.worm.id, ctx.worm, ctx.dirX, ctx.dirY, BUNGEE_SPEC));
    ctx.world.emit({ type: 'sound', id: 'rope-shoot', x: ctx.worm.x, y: ctx.worm.y });
    ctx.control(cord.id);
  },
});

registerWeapon({
  id: 'jetpack',
  name: 'Jet Pack',
  row: 0,
  col: 0,
  aim: 'none',
  charge: false,
  airborne: true,
  endsTurn: false,
  fire: (ctx) => {
    const jet = ctx.world.spawn(new JetPack(ctx.worm.id));
    ctx.control(jet.id);
  },
});

registerWeapon({
  id: 'scales',
  name: 'Scales of Justice',
  row: 8,
  col: 4,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    const worms = ctx.world.ofKind<Worm>('worm').filter((w) => w.alive);
    const teams = [...new Set(worms.map((w) => w.team))];
    if (!teams.length) return;
    // Every team ends up with the same total, shared equally between its worms.
    const total = worms.reduce((n, w) => n + w.health, 0);
    const each = total / teams.length;
    for (const t of teams) {
      const members = worms.filter((w) => w.team === t);
      const hp = Math.max(1, Math.round(each / members.length));
      for (const w of members) w.health = w.shownHealth = hp;
    }
    ctx.world.emit({ type: 'sound', id: 'collect', x: ctx.worm.x, y: ctx.worm.y });
  },
});

registerWeapon({
  id: 'freeze',
  name: 'Freeze',
  row: 12,
  col: 3,
  aim: 'none',
  charge: false,
  fire: (ctx) => {
    // The whole team is encased in ice until its next turn.
    for (const w of ctx.world.ofKind<Worm>('worm')) {
      if (w.alive && w.team === ctx.worm.team) w.invulnerable = true;
    }
    ctx.world.emit({ type: 'sound', id: 'teleport', x: ctx.worm.x, y: ctx.worm.y });
  },
});

registerWeapon({
  id: 'selectworm',
  name: 'Select Worm',
  row: 12,
  col: 2,
  aim: 'target',
  charge: false,
  endsTurn: false,
  validTarget: (world, worm, t) =>
    world
      .ofKind<Worm>('worm')
      .some(
        (w) => w.alive && w !== worm && w.team === worm.team && dist(w.cx - t.x, w.cy - t.y) < 24,
      ),
  fire: (ctx) => {
    const { target, worm, world } = ctx;
    if (!target) return;
    const pick = world
      .ofKind<Worm>('worm')
      .filter((w) => w.alive && w !== worm && w.team === worm.team)
      .sort(
        (a, b) => dist(a.cx - target.x, a.cy - target.y) - dist(b.cx - target.x, b.cy - target.y),
      )[0];
    if (pick) ctx.switchWorm(pick.id);
  },
});
