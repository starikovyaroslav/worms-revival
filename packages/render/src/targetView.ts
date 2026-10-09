import { Container, Graphics } from 'pixi.js';
import {
  GIRDER_HALF_LENGTH,
  GIRDER_HALF_THICKNESS,
  HomingMissile,
  girderAxis,
  type Game,
} from '@wr/sim';

/** Preview under the mouse for weapons aimed with a click (girder, teleport, strikes). */
export class TargetView {
  readonly container = new Container();
  private g = new Graphics();
  private t = 0;

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
    for (const m of game.world.ofKind<HomingMissile>('projectile')) {
      if (m instanceof HomingMissile && m.targetX !== null && m.age <= m.homing.lockEndTick)
        this.marker(g, m.targetX, m.targetY as number);
    }
    if (def?.needsTarget && !game.target && mouse && game.phase === 'turn') {
      // A faint preview where the click would put the marker.
      this.marker(g, mouse.x, mouse.y, 0.4);
    }
    if (!def || def.aim !== 'target' || !worm || !mouse || game.phase !== 'turn') return;
    const dirX = Math.cos(worm.aim) * worm.facing;
    const dirY = -Math.sin(worm.aim);
    const ok = !def.validTarget || def.validTarget(game.world, worm, mouse, dirX, dirY);
    const color = ok ? 0x40ff60 : 0xff4040;
    const { x, y } = mouse;

    if (def.id === 'girder') {
      const a = girderAxis(dirX, dirY);
      const hw = GIRDER_HALF_LENGTH;
      const hh = GIRDER_HALF_THICKNESS;
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

  /** Red target marker: a pulsing ring with a cross, like the original. */
  private marker(g: Graphics, x: number, y: number, alpha = 1): void {
    const r = 9 + Math.sin(this.t * 7) * 1.5;
    g.circle(x, y, r).stroke({ color: 0x000000, width: 4, alpha });
    g.circle(x, y, r).stroke({ color: 0xff3030, width: 2, alpha });
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
    g.stroke({ color: 0xff3030, width: 2, alpha });
    g.rect(x - 1, y - 1, 2, 2).fill({ color: 0xff3030, alpha });
  }
}
