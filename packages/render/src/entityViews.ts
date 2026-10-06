import { Container, Graphics } from 'pixi.js';
import { Gravestone, Projectile, type Entity } from '@wr/sim';
import { TEAM_COLORS } from './wormView';

const OUTLINE = 0x1a1a1a;

export interface EntityView {
  readonly container: Container;
  update(alpha: number, dtMs: number): void;
}

class ProjectileView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();
  private spin = 0;

  constructor(private readonly p: Projectile) {
    this.container.addChild(this.g);
    this.draw();
  }

  private draw(): void {
    const g = this.g;
    switch (this.p.look) {
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
      this.container.rotation = this.spin;
    }
  }
}

class GravestoneView implements EntityView {
  readonly container = new Container();

  constructor(private readonly s: Gravestone) {
    const color = TEAM_COLORS[s.team % TEAM_COLORS.length] as number;
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

/** Creates a view for a non-worm entity, or null if it has no visual. */
export function createEntityView(e: Entity): EntityView | null {
  if (e instanceof Projectile) return new ProjectileView(e);
  if (e instanceof Gravestone) return new GravestoneView(e);
  return null;
}
