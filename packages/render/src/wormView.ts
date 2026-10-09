import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { assets } from './assets';
import { cos, sin, type Worm } from '@wr/sim';

/** Team colours in the classic order: red, blue, green, yellow, magenta, cyan. */
export const TEAM_COLORS = [0xff4a4a, 0x4a8cff, 0x4ade4a, 0xffd23a, 0xe85cff, 0x3ae0e0];

const BODY = 0xf7a9b8;
const BODY_SHADE = 0xd97a90;
const BELLY = 0xffd6de;
const OUTLINE = 0x3a1020;
/** HUD palette (see style.css). */
const INK = 0x222034;
const PANEL = 0x323c39;
const PANEL_HI = 0x595652;
const PANEL_LO = 0x1b1b2a;

/** Procedurally drawn cartoon worm with name and health labels. */
export class WormView {
  readonly container = new Container();
  private body = new Graphics();
  /** Name and health, drawn in screen space (added to the label layer by the scene). */
  readonly label = new Container();
  /** Bouncing team-coloured arrow over the worm whose turn it is. */
  private arrow = new Graphics();
  private color = 0xffffff;
  private maxHp = 100;
  private shown = 100;
  /** Backgrounds of the name and health tags. */
  private plates = new Graphics();
  private nameText: Text;
  private hpText: Text;
  private time = Math.random() * 10;
  private blink = 0;
  private spin = 0;
  /** Pre-rendered pixel-art frames (retro look); null when the art is not available. */
  private pixel: { body: Sprite; band: Sprite } | null = null;
  private hurtTimer = 0;
  private lastHealth: number;
  private landTimer = 0;
  /** Use animation (`act/<weapon>_N`) that is playing, and how long it has been going. */
  private act: { weapon: string; t: number } | null = null;
  private wasAirborne = false;

  constructor(readonly worm: Worm) {
    const color = TEAM_COLORS[worm.team % TEAM_COLORS.length] as number;
    const font = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 8,
      fontWeight: '400' as const,
    };
    this.color = color;
    // One bevelled tag in the HUD's panel style: the name on top, a health bar with the number below.
    const stroke = { color: INK, width: 2, join: 'miter' as const };
    this.nameText = new Text({ text: worm.name, style: { ...font, fill: 0xffffff, stroke } });
    this.hpText = new Text({
      text: String(worm.health),
      style: { ...font, fill: 0xffffff, stroke },
    });
    this.nameText.anchor.set(0.5, 0.5);
    this.hpText.anchor.set(0.5, 0.5);
    this.maxHp = Math.max(1, worm.health);
    this.shown = worm.health;
    this.lastHealth = worm.health;
    this.label.addChild(this.plates, this.nameText, this.hpText);
    this.drawPlates();
    this.drawArrow(color);
    this.label.addChild(this.arrow);
    if (assets.has('worm/idle_0')) {
      const body = new Sprite();
      const band = new Sprite();
      for (const s of [body, band]) s.anchor.set(0.5, 22 / 24);
      band.tint = color;
      this.pixel = { body, band };
      this.container.addChild(body, band);
    } else {
      this.container.addChild(this.body);
    }
  }

  /** Draws the tag behind the texts; the label origin is the bottom centre of the tag. */
  private drawPlates(): void {
    const g = this.plates.clear();
    const w = Math.max(40, Math.round(this.nameText.width) + 12);
    const h = 30;
    const x = -w / 2;
    const y = -h;
    // Ink outline, panel fill, light edge top-left and dark edge bottom-right (like the HUD panels).
    g.rect(x - 2, y - 2, w + 4, h + 4).fill(INK);
    g.rect(x, y, w, h).fill(PANEL);
    g.rect(x, y, w, 2).fill(PANEL_HI);
    g.rect(x, y, 2, h).fill(PANEL_HI);
    g.rect(x, y + h - 2, w, 2).fill(PANEL_LO);
    g.rect(x + w - 2, y, 2, h).fill(PANEL_LO);
    // Health bar: dark trough, team-coloured fill (whole pixels), ink outline.
    const bx = x + 5;
    const bw = w - 10;
    const by = y + 15;
    const bh = 10;
    g.rect(bx - 1, by - 1, bw + 2, bh + 2).fill(INK);
    g.rect(bx, by, bw, bh).fill(PANEL_LO);
    const fill = Math.round((bw * Math.min(1, this.shown / this.maxHp)) / 2) * 2;
    if (fill > 0) {
      g.rect(bx, by, fill, bh).fill(this.color);
      g.rect(bx, by, fill, 2).fill({ color: 0xffffff, alpha: 0.35 });
    }
    this.nameText.position.set(0, y + 8);
    this.hpText.position.set(0, by + bh / 2);
  }

  /** A chunky pixel arrow pointing down: dark outline, team-coloured fill, light top edge. */
  private drawArrow(color: number): void {
    const u = 2;
    const g = this.arrow;
    // Rows of the arrow, widest at the top of the head; [halfWidth] per row, top to bottom.
    const rows = [1, 1, 1, 1, 4, 3, 2, 1];
    const draw = (grow: number, fill: number) => {
      rows.forEach((hw, i) => {
        const w = (hw + grow) * 2 * u - (hw === 1 ? 0 : 0);
        g.rect(-(hw + grow) * u, (i - grow) * u - rows.length * u, w, u * (1 + grow * 2)).fill(
          fill,
        );
      });
    };
    draw(1, 0x000000);
    draw(0, color);
    // Light edge on the left of the shaft and head.
    g.rect(-u, -rows.length * u, u, 4 * u).fill(0xffffff, 0.45);
  }

  /** Starts the use animation of a weapon (throw, punch, torch...), if the art has one. */
  playAct(weapon: string): void {
    if (assets.has(`act/${weapon}_0`)) this.act = { weapon, t: 0 };
  }

  /** Current frame of the running use animation; clears it when finished. */
  private actFrame(dt: number): Texture | undefined {
    const a = this.act;
    if (!a) return undefined;
    a.t += dt;
    const n = assets.count(`act/${a.weapon}_`);
    // Multi-frame sets play at 14 fps; a single pose is held briefly.
    const dur = n > 1 ? n / 14 : 0.35;
    if (a.t >= dur) {
      this.act = null;
      return undefined;
    }
    return assets.get(`act/${a.weapon}_${Math.min(n - 1, Math.floor(a.t * 14))}`);
  }

  /** Worm-with-weapon frame for an aim angle: 4 frames upwards (0..90°), 5 downwards (0..-90°). */
  private holdFrame(weapon: string, aim: number): Texture | undefined {
    const a = Math.max(-1, Math.min(1, aim / (Math.PI / 2)));
    const idx = a >= 0 ? Math.round(a * 3) : 4 + Math.round(-a * 4);
    return assets.get(`hold/${weapon}_${idx}`);
  }

  /** Picks the frame for the worm's current state. */
  private frameName(w: Worm): string {
    if (this.hurtTimer > 0 && w.state !== 'airborne') {
      return `hurt_${Math.floor(this.time * 10) % (assets.count('worm/hurt_') || 2)}`;
    }
    switch (w.state) {
      case 'walking':
        // The simulation cycles through 15 steps; map them onto however many frames exist.
        return `walk_${Math.floor(((w.walkFrame % 15) / 15) * (assets.count('worm/walk_') || 15))}`;
      case 'roped':
        return 'jump';
      case 'airborne':
        if (w.blasted) {
          const n = assets.count('worm/tumble_');
          // A sheet without tumble frames just shows the falling pose.
          return n ? `tumble_${((Math.floor(this.spin * 1.27) % n) + n) % n}` : 'fall';
        }
        return w.vy < 0 ? 'jump' : 'fall';
      default:
        if (this.landTimer > 0) return 'land';
        if (this.blink > 0) return 'idle_blink';
        return `idle_${Math.floor(this.time * 3) % (assets.count('worm/idle_') || 4)}`;
    }
  }

  /** The health shown on the label; the game updates it at the end of each turn. */
  setShownHealth(hp: number): void {
    const text = String(Math.max(0, hp));
    if (this.hpText.text === text) return;
    this.hpText.text = text;
    this.shown = Math.max(0, hp);
    this.drawPlates();
  }

  update(
    alpha: number,
    dtMs: number,
    active: boolean,
    project: (x: number, y: number) => { x: number; y: number },
    /** Weapon id when this worm is aiming it (shows the worm-with-weapon frames), else ''. */
    hold = '',
    /** Show the turn arrow above this worm. */
    arrow = false,
  ): void {
    const w = this.worm;
    const dt = dtMs / 1000;
    this.time += dt;
    const x = w.prevX + (w.x - w.prevX) * alpha;
    const y = w.prevY + (w.y - w.prevY) * alpha;
    // Pixel art stays on the pixel grid.
    if (this.pixel) this.container.position.set(Math.round(x), Math.round(y));
    else this.container.position.set(x, y);
    this.container.visible = w.alive || !w.drowned;
    if (!w.alive) {
      this.container.visible = false;
      this.label.visible = false;
      return;
    }

    if (this.blink > 0) this.blink -= dt;
    else if (Math.random() < dt * 0.4) this.blink = 0.12;

    // Blasted worms tumble; everything else stays upright.
    if (w.state === 'airborne' && w.blasted) this.spin += (w.vx >= 0 ? 1 : -1) * dt * 14;
    else this.spin = 0;

    if (this.pixel) {
      // Short reactions: flinch when hurt, squash when landing.
      if (w.health < this.lastHealth) this.hurtTimer = 0.45;
      this.lastHealth = w.health;
      this.hurtTimer = Math.max(0, this.hurtTimer - dt);
      const air = w.state === 'airborne';
      if (this.wasAirborne && !air) this.landTimer = 0.12;
      this.wasAirborne = air;
      this.landTimer = Math.max(0, this.landTimer - dt);
      const name = this.frameName(w);
      // Missing frames fall back to the first idle frame; a set without a bandana layer is fine.
      let body = assets.get(`worm/${name}`) ?? assets.get('worm/idle_0');
      let band = assets.get(`worm/${name}_band`);
      // Aiming a weapon: the worm-with-weapon frame for the current angle.
      const held = hold && w.grounded ? this.holdFrame(hold, w.aim) : undefined;
      const acting = w.grounded ? this.actFrame(dt) : undefined;
      if (acting) {
        body = acting;
        band = undefined;
      } else if (held) {
        body = held;
        band = undefined;
      } else if (w.chute) {
        const n = assets.count('chute/');
        const chute = n ? assets.get(`chute/${Math.floor(this.time * 8) % n}`) : undefined;
        if (chute) {
          body = chute;
          band = undefined;
        }
      }
      if (body) {
        this.pixel.body.texture = body;
        // Frames come on 24 or 32 pixel canvases with the feet at a fixed spot.
        const ay = body.height >= 32 ? 29 / 32 : 22 / 24;
        this.pixel.body.anchor.set(0.5, ay);
        this.pixel.band.anchor.set(0.5, ay);
        this.pixel.band.visible = !!band;
        if (band) this.pixel.band.texture = band;
      }
      for (const s of [this.pixel.body, this.pixel.band]) s.scale.x = w.facing;
    } else {
      this.draw(w, active);
    }
    // Labels sit above the worm at a fixed pixel size, whatever the zoom.
    const p = project(x, y - 22);
    const bob = active ? Math.abs(Math.sin(this.time * 4)) * 3 : 0;
    this.label.position.set(Math.round(p.x), Math.round(p.y - 6 - bob));
    this.label.visible = true;
    this.arrow.visible = arrow;
    // Bounces on whole pixels, like the original.
    this.arrow.position.set(0, -40 - Math.round(Math.abs(Math.sin(this.time * 5)) * 6));
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
