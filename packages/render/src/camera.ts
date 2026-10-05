import type { Container } from 'pixi.js';

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
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    const after = this.toWorld(sx, sy);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.targetX += before.x - after.x;
    this.targetY += before.y - after.y;
  }

  shake(power: number, seconds = 0.4): void {
    this.shakePower = Math.max(this.shakePower, power);
    this.shakeTime = Math.max(this.shakeTime, seconds);
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
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
    world.scale.set(this.zoom);
    world.position.set(
      Math.round(this.viewW / 2 - (this.x + this.shakeX) * this.zoom),
      Math.round(this.viewH / 2 - (this.y + this.shakeY) * this.zoom),
    );
  }

  toWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.viewW / 2) / this.zoom + this.x,
      y: (sy - this.viewH / 2) / this.zoom + this.y,
    };
  }
}
