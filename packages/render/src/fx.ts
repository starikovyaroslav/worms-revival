import { Container, Graphics, Text } from 'pixi.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  gravity: number;
  drag: number;
  grow: number;
}

interface Flash {
  x: number;
  y: number;
  r: number;
  t: number;
}

interface Popup {
  text: Text;
  t: number;
}

/** Cosmetic effects: explosion flashes, debris, smoke, splashes and damage numbers. */
export class Fx {
  readonly container = new Container();
  private g = new Graphics();
  private popups = new Container();
  private particles: Particle[] = [];
  private flashes: Flash[] = [];
  private popupList: Popup[] = [];

  constructor(private readonly dirtColor: number) {
    this.container.addChild(this.g, this.popups);
  }

  explosion(x: number, y: number, radius: number): void {
    this.flashes.push({ x, y, r: radius, t: 0 });
    const n = Math.round(10 + radius * 0.8);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.3 + Math.random()) * (1.5 + radius / 12);
      // Clods of dirt fly out and fall.
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 2,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.8,
        size: 1 + Math.random() * 2.5,
        color: this.dirtColor,
        gravity: 0.25,
        drag: 0.99,
        grow: 0,
      });
    }
    for (let i = 0; i < 6 + radius / 6; i++) {
      // Smoke puffs drift up and grow.
      this.particles.push({
        x: x + (Math.random() - 0.5) * radius,
        y: y + (Math.random() - 0.5) * radius,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -0.3 - Math.random() * 0.6,
        life: 0,
        maxLife: 1 + Math.random(),
        size: 4 + Math.random() * radius * 0.25,
        color: 0x666666,
        gravity: -0.005,
        drag: 0.97,
        grow: 6,
      });
    }
  }

  splash(x: number, y: number, size: number): void {
    for (let i = 0; i < 14 * size + 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: -2 - Math.random() * 4 * size,
        life: 0,
        maxLife: 0.8,
        size: 1.5 + Math.random() * 2,
        color: 0xdff4ff,
        gravity: 0.25,
        drag: 0.99,
        grow: 0,
      });
    }
  }

  damage(x: number, y: number, amount: number, color: number): void {
    const text = new Text({
      text: String(amount),
      style: {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: 16,
        fontWeight: 'bold',
        fill: color,
        stroke: { color: 0x000000, width: 3, join: 'round' },
      },
    });
    text.resolution = 2;
    text.anchor.set(0.5);
    text.position.set(x, y);
    this.popups.addChild(text);
    this.popupList.push({ text, t: 0 });
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    // Particle physics is tuned per 50 Hz tick; scale by elapsed ticks.
    const k = dtMs / 20;
    const g = this.g.clear();
    for (const f of this.flashes) {
      f.t += dt;
      const p = f.t / 0.25;
      if (p >= 1) continue;
      g.circle(f.x, f.y, f.r * (0.6 + p * 0.8)).fill({ color: 0xffe9a0, alpha: (1 - p) * 0.9 });
      g.circle(f.x, f.y, f.r * (0.3 + p * 0.5)).fill({ color: 0xffffff, alpha: 1 - p });
    }
    this.flashes = this.flashes.filter((f) => f.t < 0.25);

    for (const p of this.particles) {
      p.life += dt;
      p.vy += p.gravity * k;
      p.vx *= Math.pow(p.drag, k);
      p.vy *= Math.pow(p.drag, k);
      p.x += p.vx * k;
      p.y += p.vy * k;
      const t = p.life / p.maxLife;
      if (t >= 1) continue;
      g.circle(p.x, p.y, p.size + p.grow * t).fill({
        color: p.color,
        alpha: p.grow ? 0.5 * (1 - t) : 1 - t * t,
      });
    }
    this.particles = this.particles.filter((p) => p.life < p.maxLife);

    for (const p of this.popupList) {
      p.t += dt;
      p.text.y -= dt * 25;
      p.text.alpha = p.t < 1.2 ? 1 : Math.max(0, 1 - (p.t - 1.2) / 0.5);
    }
    for (const p of this.popupList.filter((p) => p.t > 1.7)) p.text.destroy();
    this.popupList = this.popupList.filter((p) => p.t <= 1.7);
  }
}
