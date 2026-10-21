import { Container, Graphics } from 'pixi.js';
import { HomingMissile, girderAxis, type Game, type GirderParams } from '@wr/sim';
import { SELF_DANGER_R, selfDangerWorm } from './targetWarn';

/** Preview under the mouse for weapons aimed with a click (girder, teleport, strikes). */
export class TargetView {
  readonly container = new Container();
  private g = new Graphics();
  private t = 0;
  /** Marker of a missile that has exploded, kept until the time its lock would have run out. */
  private lingering: { x: number; y: number; ms: number } | null = null;

  constructor() {
    this.container.addChild(this.g);
  }

  update(game: Game, mouse: { x: number; y: number } | null, dtMs: number): void {
    this.t += dtMs / 1000;
    const g = this.g.clear();
    const def = game.weapon;
    const worm = game.activeWorm;
    // Homing missiles: the chosen marker stays on the map while the weapon is selected and for as long
    // as a missile is still drawn towards it.
    if (def?.needsTarget && game.target && (game.phase === 'turn' || game.phase === 'ready'))
      this.marker(g, game.target.x, game.target.y);
    let flying = false;
    for (const m of game.world.ofKind<HomingMissile>('projectile')) {
      if (m instanceof HomingMissile && m.targetX !== null && m.age <= m.homing.lockEndTick) {
        this.marker(g, m.targetX, m.targetY as number);
        flying = true;
        // 20 ms per tick: remember how long the marker still has to live if the missile bursts early.
        this.lingering = {
          x: m.targetX,
          y: m.targetY as number,
          ms: (m.homing.lockEndTick - m.age) * 20,
        };
      }
    }
    if (!flying && this.lingering) {
      this.lingering.ms -= dtMs;
      if (this.lingering.ms <= 0 || game.phase === 'ready') this.lingering = null;
      else this.marker(g, this.lingering.x, this.lingering.y);
    }
    if (def?.needsTarget && !game.target && mouse && game.phase === 'turn') {
      // A faint preview where the click would put the marker.
      this.marker(g, mouse.x, mouse.y, 0.4);
    }
    if (!def || def.aim !== 'target' || !worm || !mouse || game.phase !== 'turn') return;
    const dirX = Math.cos(worm.aim) * worm.facing;
    const dirY = -Math.sin(worm.aim);
    const ok = !def.validTarget || def.validTarget(game.world, worm, mouse, dirX, dirY);
    // A strike that would land on your own worms: red, with a warning sign and the danger zone.
    const danger = selfDangerWorm(game, mouse);
    const color = ok && !danger ? 0x40ff60 : 0xff4040;
    const { x, y } = mouse;

    if (def.id === 'girder' && def.spec.sim.archetype === 'custom') {
      const size = def.spec.sim.params as GirderParams;
      const a = girderAxis(dirX, dirY);
      const hw = size.halfLength;
      const hh = size.halfThickness;
      const px = -a.y;
      const py = a.x;
      g.poly([
        x - a.x * hw - px * hh,
        y - a.y * hw - py * hh,
        x + a.x * hw - px * hh,
        y + a.y * hw - py * hh,
        x + a.x * hw + px * hh,
        y + a.y * hw + py * hh,
        x - a.x * hw + px * hh,
        y - a.y * hw + py * hh,
      ]).fill({ color, alpha: 0.35 });
      g.stroke({ color, width: 1, alpha: 0.9 });
      return;
    }
    if (def.id === 'teleport') {
      g.ellipse(x, y, 6, 9).stroke({ color, width: 1.5, alpha: 0.6 + Math.sin(this.t * 8) * 0.3 });
      return;
    }
    // Strikes: target ring plus the direction the planes come from.
    if (danger) this.warning(g, x, y, danger.x, danger.y);
    const pulse = 8 + Math.sin(this.t * 6) * 2;
    g.circle(x, y, pulse).stroke({ color, width: 2 });
    g.moveTo(x - 14, y)
      .lineTo(x + 14, y)
      .moveTo(x, y - 14)
      .lineTo(x, y + 14)
      .stroke({ color, width: 1 });
    if (def.needsSky) {
      const d = worm.facing;
      g.moveTo(x - d * 40, y - 30)
        .lineTo(x - d * 18, y - 30)
        .stroke({ color, width: 2 });
      g.moveTo(x - d * 18, y - 30)
        .lineTo(x - d * 24, y - 35)
        .moveTo(x - d * 18, y - 30)
        .lineTo(x - d * 24, y - 25);
      g.stroke({ color, width: 2 });
    }
  }

  /** Own-goal warning: a ring of the danger radius round the worm and a pixel "!" triangle beside the cursor. */
  private warning(g: Graphics, x: number, y: number, wx: number, wy: number): void {
    const blink = Math.sin(this.t * 10) > -0.3 ? 1 : 0.35;
    g.circle(wx, wy - 6, SELF_DANGER_R).stroke({ color: 0xff4040, width: 1, alpha: 0.6 * blink });
    const ty = y + 2;
    const tx = x + 24;
    g.poly([tx, ty - 8, tx + 9, ty + 7, tx - 9, ty + 7]).fill(0x222034);
    g.poly([tx, ty - 5, tx + 6, ty + 5, tx - 6, ty + 5]).fill(0xfbf236);
    g.rect(tx - 1, ty - 2, 2, 4).fill(0x222034);
    g.rect(tx - 1, ty + 3, 2, 1).fill(0x222034);
  }

  /** Yellow target marker: a pulsing ring with a cross, like the original. */
  private marker(g: Graphics, x: number, y: number, alpha = 1): void {
    const r = 9 + Math.sin(this.t * 7) * 1.5;
    g.circle(x, y, r).stroke({ color: 0x000000, width: 4, alpha });
    g.circle(x, y, r).stroke({ color: 0xffe030, width: 2, alpha });
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      g.moveTo(x + dx * (r - 4), y + dy * (r - 4)).lineTo(x + dx * (r + 5), y + dy * (r + 5));
    }
    g.stroke({ color: 0x000000, width: 4, alpha });
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      g.moveTo(x + dx * (r - 4), y + dy * (r - 4)).lineTo(x + dx * (r + 5), y + dy * (r + 5));
    }
    g.stroke({ color: 0xffe030, width: 2, alpha });
    g.rect(x - 1, y - 1, 2, 2).fill({ color: 0xffe030, alpha });
  }
}
