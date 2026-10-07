import { Container, Graphics } from 'pixi.js';
import { GIRDER_HALF_LENGTH, GIRDER_HALF_THICKNESS, girderAxis, type Game } from '@wr/sim';

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
}
