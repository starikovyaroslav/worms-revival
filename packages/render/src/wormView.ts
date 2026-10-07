import { Container, Graphics, Text } from 'pixi.js';
import { cos, sin, type Worm } from '@wr/sim';

/** Team colours in the classic order: red, blue, green, yellow, magenta, cyan. */
export const TEAM_COLORS = [0xff4a4a, 0x4a8cff, 0x4ade4a, 0xffd23a, 0xe85cff, 0x3ae0e0];

const BODY = 0xf7a9b8;
const BODY_SHADE = 0xd97a90;
const BELLY = 0xffd6de;
const OUTLINE = 0x3a1020;

/** Procedurally drawn cartoon worm with name and health labels. */
export class WormView {
  readonly container = new Container();
  private body = new Graphics();
  private label = new Container();
  private nameText: Text;
  private hpText: Text;
  private time = Math.random() * 10;
  private blink = 0;
  private spin = 0;

  constructor(readonly worm: Worm) {
    const color = TEAM_COLORS[worm.team % TEAM_COLORS.length] as number;
    const style = {
      fontFamily: 'Trebuchet MS, Arial, sans-serif',
      fontSize: 13,
      fontWeight: 'bold' as const,
      fill: color,
      stroke: { color: 0x000000, width: 3, join: 'round' as const },
    };
    this.nameText = new Text({ text: worm.name, style });
    this.hpText = new Text({ text: String(worm.health), style });
    this.nameText.anchor.set(0.5, 1);
    this.hpText.anchor.set(0.5, 1);
    this.nameText.resolution = 2;
    this.hpText.resolution = 2;
    this.hpText.y = 0;
    this.nameText.y = -14;
    this.label.addChild(this.nameText, this.hpText);
    this.container.addChild(this.body, this.label);
  }

  /** The health shown on the label; the game updates it at the end of each turn. */
  setShownHealth(hp: number): void {
    this.hpText.text = String(Math.max(0, hp));
  }

  update(alpha: number, dtMs: number, active: boolean): void {
    const w = this.worm;
    const dt = dtMs / 1000;
    this.time += dt;
    const x = w.prevX + (w.x - w.prevX) * alpha;
    const y = w.prevY + (w.y - w.prevY) * alpha;
    this.container.position.set(x, y);
    this.container.visible = w.alive || !w.drowned;
    if (!w.alive) {
      this.container.visible = false;
      return;
    }

    if (this.blink > 0) this.blink -= dt;
    else if (Math.random() < dt * 0.4) this.blink = 0.12;

    // Blasted worms tumble; everything else stays upright.
    if (w.state === 'airborne' && w.blasted) this.spin += (w.vx >= 0 ? 1 : -1) * dt * 14;
    else this.spin = 0;

    this.draw(w, active);
    this.label.position.set(0, -26 - (active ? Math.abs(Math.sin(this.time * 4)) * 3 : 0));
    this.label.visible = true;
  }

  private draw(w: Worm, active: boolean): void {
    const g = this.body.clear();
    const f = w.facing;
    // Walk cycle: a hump travels along the body (inchworm).
    const phase = w.state === 'walking' ? (w.walkFrame / 15) * Math.PI * 2 : 0;
    const hump = w.state === 'walking' ? Math.max(0, Math.sin(phase)) * 4 : 0;
    const breathe = w.state === 'idle' ? Math.sin(this.time * 2.2) * 0.6 : 0;
    const stretch = w.state === 'airborne' && !w.blasted ? Math.min(3, Math.abs(w.vy) * 0.8) : 0;

    // Body spine as a quadratic curve from the tail (on the ground) to the neck.
    const tail = { x: -7 * f + (w.state === 'walking' ? Math.sin(phase) * 1.5 * f : 0), y: -3 };
    const mid = { x: -2.5 * f, y: -3 - hump };
    const neck = { x: 1 * f, y: -11 - stretch - breathe };
    const head = { x: 1.8 * f, y: -15 - stretch - breathe };
    const spine: { x: number; y: number; r: number }[] = [];
    const N = 10;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      spine.push({
        x: a * tail.x + b * mid.x + c * neck.x,
        y: a * tail.y + b * mid.y + c * neck.y,
        r: 2.6 + t * 2.9,
      });
    }

    const rot = this.spin;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const tf = (p: { x: number; y: number }) =>
      rot === 0 ? p : { x: p.x * cr - (p.y + 8) * sr, y: p.x * sr + (p.y + 8) * cr - 8 };

    // Outline pass, then fill pass: overlapping circles make a smooth cartoon tube.
    for (const s of spine) {
      const p = tf(s);
      g.circle(p.x, p.y, s.r + 1.3).fill(OUTLINE);
    }
    const hp = tf(head);
    g.circle(hp.x, hp.y, 6.3).fill(OUTLINE);
    for (const s of spine) {
      const p = tf(s);
      g.circle(p.x, p.y, s.r).fill(BODY);
    }
    g.circle(hp.x, hp.y, 5).fill(BODY);
    // Belly highlight on the front side and a darker back.
    for (let i = 2; i < spine.length; i += 2) {
      const s = spine[i] as { x: number; y: number; r: number };
      const p = tf({ x: s.x + s.r * 0.45 * f, y: s.y });
      g.circle(p.x, p.y, s.r * 0.45).fill(BELLY);
      const q = tf({ x: s.x - s.r * 0.55 * f, y: s.y + 0.5 });
      g.circle(q.x, q.y, s.r * 0.3).fill({ color: BODY_SHADE, alpha: 0.6 });
    }

    if (w.chute) {
      // Canopy with lines down to the worm.
      g.moveTo(-14, -34)
        .quadraticCurveTo(0, -52, 14, -34)
        .closePath()
        .fill(0xf0f0f0)
        .stroke({ color: OUTLINE, width: 1 });
      for (const s of [-12, -4, 4, 12])
        g.rect(s - 1.5, -38, 3, 4).fill(s % 8 === 0 ? 0xd03030 : 0xf0f0f0);
      g.moveTo(-14, -34)
        .lineTo(-2, -16)
        .moveTo(14, -34)
        .lineTo(3, -16)
        .stroke({ color: 0x555555, width: 0.6 });
    }

    // Eyes look along the aim when active, otherwise forwards.
    const look = active ? w.aim : 0;
    const lx = cos(look) * f;
    const ly = -sin(look);
    for (const k of [0, 1]) {
      const e = tf({ x: head.x + (1.2 + k * 3.4) * f, y: head.y - 2.2 });
      const open = this.blink > 0 ? 0.25 : 1;
      g.ellipse(e.x, e.y, 2.3, 3 * open)
        .fill(0xffffff)
        .stroke({ color: OUTLINE, width: 0.8 });
      if (open === 1) g.circle(e.x + lx * 1.1, e.y + ly * 1.4, 1.1).fill(0x111111);
    }
    // Smile.
    const m = tf({ x: head.x + 3 * f, y: head.y + 2.5 });
    g.moveTo(m.x - 1.8, m.y)
      .quadraticCurveTo(m.x, m.y + 1.6, m.x + 1.8, m.y)
      .stroke({ color: OUTLINE, width: 1 });
  }
}
