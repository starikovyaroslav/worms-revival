import type { Container } from 'pixi.js';

/** Allowed zoom levels (whole numbers keep pixel art crisp; 0.5 is a map overview). */
export const ZOOM_STEPS = [0.5, 1, 2, 3, 4, 5];

export interface CameraBounds {
  width: number;
  height: number;
}

/**
 * 2D camera with smooth target following and free (user) scrolling. Manual scrolling suspends
 * following until a new target is assigned, as in W:A.
 */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  minZoom = 0.35;
  maxZoom = 2.5;
  viewW = 1;
  viewH = 1;
  /** Extra space allowed beyond the map edges, in world pixels. */
  margin = 400;

  private targetX = 0;
  private targetY = 0;
  private following = false;
  private punchAmount = 0;
  private shakeTime = 0;
  private shakePower = 0;
  private shakeX = 0;
  private shakeY = 0;

  constructor(private readonly bounds: CameraBounds) {
    this.x = bounds.width / 2;
    this.y = bounds.height / 2;
  }

  resize(w: number, h: number): void {
    this.viewW = w;
    this.viewH = h;
  }

  /** Smoothly follow a world point. */
  follow(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    this.following = true;
  }

  /** Jump immediately. */
  lookAt(x: number, y: number): void {
    this.x = this.targetX = x;
    this.y = this.targetY = y;
  }

  /** Manual scroll in screen pixels; stops following. */
  pan(dxScreen: number, dyScreen: number): void {
    this.following = false;
    this.x += dxScreen / this.zoom;
    this.y += dyScreen / this.zoom;
  }

  get isFollowing(): boolean {
    return this.following;
  }

  /** Zoom around a screen point so the world point under the cursor stays put. */
  zoomAt(factor: number, sx: number, sy: number): void {
    const before = this.toWorld(sx, sy);
    // Pixel art stays crisp only at whole-number zoom: step through fixed levels.
    const i = ZOOM_STEPS.reduce(
      (best, z, k) =>
        Math.abs(z - this.zoom) < Math.abs((ZOOM_STEPS[best] as number) - this.zoom) ? k : best,
      0,
    );
    const next = Math.min(ZOOM_STEPS.length - 1, Math.max(0, i + (factor > 1 ? 1 : -1)));
    this.zoom = ZOOM_STEPS[next] as number;
    const after = this.toWorld(sx, sy);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.targetX += before.x - after.x;
    this.targetY += before.y - after.y;
  }

  /** Quick zoom-in that eases back (explosions, big hits). */
  punch(amount: number): void {
    this.punchAmount = Math.min(0.12, Math.max(this.punchAmount, amount));
  }

  /** Zoom including the punch. */
  get scale(): number {
    return this.zoom * (1 + this.punchAmount);
  }

  shake(power: number, seconds = 0.4): void {
    this.shakePower = Math.max(this.shakePower, power);
    this.shakeTime = Math.max(this.shakeTime, seconds);
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.punchAmount *= Math.exp(-dt * 7);
    if (this.punchAmount < 0.0005) this.punchAmount = 0;
    if (this.following) {
      // Frame-rate independent exponential smoothing.
      const k = 1 - Math.exp(-dt * 6);
      this.x += (this.targetX - this.x) * k;
      this.y += (this.targetY - this.y) * k;
    }
    this.clamp();
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const p = this.shakePower * Math.max(0, this.shakeTime) * 2.5;
      this.shakeX = (Math.random() * 2 - 1) * p;
      this.shakeY = (Math.random() * 2 - 1) * p;
      if (this.shakeTime <= 0) this.shakePower = 0;
    } else {
      this.shakeX = this.shakeY = 0;
    }
  }

  private clamp(): void {
    const halfW = this.viewW / 2 / this.zoom;
    const halfH = this.viewH / 2 / this.zoom;
    const minX = -this.margin + halfW;
    const maxX = this.bounds.width + this.margin - halfW;
    const minY = -this.margin * 2 + halfH;
    const maxY = this.bounds.height + 120 - halfH;
    this.x = minX > maxX ? this.bounds.width / 2 : Math.min(maxX, Math.max(minX, this.x));
    this.y = minY > maxY ? this.bounds.height / 2 : Math.min(maxY, Math.max(minY, this.y));
  }

  /** Applies the camera transform to a world container. */
  apply(world: Container): void {
    const z = this.scale;
    world.scale.set(z);
    world.position.set(
      Math.round(this.viewW / 2 - (this.x + this.shakeX) * z),
      Math.round(this.viewH / 2 - (this.y + this.shakeY) * z),
    );
  }

  toScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: (wx - this.x) * this.scale + this.viewW / 2,
      y: (wy - this.y) * this.scale + this.viewH / 2,
    };
  }

  toWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.viewW / 2) / this.scale + this.x,
      y: (sy - this.viewH / 2) / this.scale + this.y,
    };
  }
}
