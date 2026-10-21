import { type Container, Rectangle, Sprite, Texture, type Application } from 'pixi.js';
import { AdjustmentFilter, ShockwaveFilter } from 'pixi-filters';
import { CrtFilter, type CrtMode } from './crt';
import { SensoryFilter, type SensoryEffect } from './sensory';

/** Per-theme look: colour grading and how readily things glow. */
export interface GradeSpec {
  saturation: number;
  contrast: number;
  gamma: number;
  brightness: number;
  /** Channel multipliers for a colour cast. */
  tint: [number, number, number];
  /** 0..1 darkening of the screen edges. */
  vignette: number;
}

export const DEFAULT_GRADE: GradeSpec = {
  saturation: 1.1,
  contrast: 1.05,
  gamma: 1,
  brightness: 1,
  tint: [1, 1, 1],
  vignette: 0,
};

function vignetteTexture(): Texture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.28,
    size / 2,
    size / 2,
    size * 0.72,
  );
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = Texture.from(c);
  t.source.scaleMode = 'linear';
  return t;
}

/**
 * Whole-screen post effects: a per-theme colour grade, shockwave distortion on blasts,
 * and a vignette that turns red as the turn timer runs out.
 */
export class PostFx {
  private readonly adjust: AdjustmentFilter;
  private readonly vignette: Sprite;
  private crt: CrtFilter | null = null;
  private crtEnabled = false;
  private sensory: SensoryFilter | null = null;
  private sensoryEffect: SensoryEffect | null = null;
  private sensoryAge = 0;
  private sensoryCooldown = 0;
  private grade: GradeSpec = DEFAULT_GRADE;
  private shock: ShockwaveFilter | null = null;
  private shockTime = 0;
  private shockLife = 0;
  private danger = 0;
  private dangerTarget = 0;
  private time = 0;

  constructor(
    private readonly app: Application,
    private readonly stage: Container,
    private readonly picture: Container,
  ) {
    this.adjust = new AdjustmentFilter();
    this.adjust.resolution = 'inherit';
    this.vignette = new Sprite(vignetteTexture());
    this.vignette.eventMode = 'none';
    stage.filters = [this.adjust];
    stage.filterArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
    picture.filterArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
    app.stage.addChild(this.vignette);
    this.setGrade(DEFAULT_GRADE);
    this.resize(app.screen.width, app.screen.height);
  }

  /** Screen size changed (css px): the filter area and the vignette must cover the new screen. */
  resize(w: number, h: number): void {
    const area = this.stage.filterArea as Rectangle;
    area.width = w;
    area.height = h;
    const pictureArea = this.picture.filterArea as Rectangle;
    pictureArea.width = w;
    pictureArea.height = h;
    this.vignette.width = w;
    this.vignette.height = h;
  }

  /** Only the picture is softened; names, crosshair and DOM HUD stay outside this pass. */
  setCrt(mode: CrtMode): void {
    this.crtEnabled = mode !== 'off';
    if (mode !== 'off') {
      this.crt ??= new CrtFilter();
      this.crt.setMode(mode);
    }
    this.pictureFilters();
  }

  private pictureFilters(): void {
    const filters = [];
    if (this.crtEnabled && this.crt) filters.push(this.crt);
    if (this.shockLife > 0 && this.shock) filters.push(this.shock);
    if (this.sensoryEffect && this.sensory) filters.push(this.sensory);
    this.picture.filters = filters.length ? filters : null;
  }

  /** Throttled transient cue, disabled for the OS reduced-motion preference. */
  screenEffect(effect: SensoryEffect): void {
    if (this.sensoryCooldown > 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    this.sensory ??= new SensoryFilter();
    this.sensoryAge = 0;
    this.sensoryEffect = effect;
    this.sensoryCooldown = 3;
    this.sensory.setPulse(effect, 0);
    this.pictureFilters();
  }

  setGrade(g: Partial<GradeSpec>): void {
    this.grade = { ...DEFAULT_GRADE, ...g };
    const t = this.grade;
    this.adjust.saturation = t.saturation;
    this.adjust.contrast = t.contrast;
    this.adjust.gamma = t.gamma;
    this.adjust.brightness = t.brightness;
    this.adjust.red = t.tint[0];
    this.adjust.green = t.tint[1];
    this.adjust.blue = t.tint[2];
  }

  /**
   * Distorts the screen with an expanding ring centred on a screen position. Only one wave is
   * active at a time (the newest wins); a full-screen pass is only paid for while it lasts.
   */
  shockwave(screenX: number, screenY: number, strength: number): void {
    this.shock ??= new ShockwaveFilter({
      speed: 520,
      wavelength: 150,
      amplitude: 18,
      brightness: 1.04,
    });
    const f = this.shock;
    f.resolution = 'inherit';
    f.center = { x: screenX, y: screenY };
    f.amplitude = 6 + 12 * Math.min(1.5, strength);
    f.time = 0;
    this.shockTime = 0;
    this.shockLife = 0.55 + 0.25 * Math.min(1.5, strength);
    this.pictureFilters();
  }

  /** 0..1: how urgent the moment is (timer running out). */
  setDanger(level: number): void {
    this.dangerTarget = level;
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.sensoryCooldown = Math.max(0, this.sensoryCooldown - dt);
    if (this.sensoryEffect && this.sensory) {
      this.sensoryAge += dt;
      this.sensory.setPulse(this.sensoryEffect, this.sensoryAge);
      if (this.sensoryAge >= 1.4) {
        this.sensoryEffect = null;
        this.pictureFilters();
      }
    }
    this.time += dt;
    this.danger += (this.dangerTarget - this.danger) * Math.min(1, dt * 6);

    if (this.shock && this.shockLife > 0) {
      this.shockTime += dt;
      this.shock.time = this.shockTime;
      // Fade the distortion out over the second half of its life.
      const left = 1 - this.shockTime / this.shockLife;
      this.shock.amplitude *= left < 0.5 ? 0.9 : 1;
      if (this.shockTime >= this.shockLife) {
        this.shockLife = 0;
        this.pictureFilters();
      }
    }

    // Vignette: black normally, pulsing red when time is short.
    const pulse = this.danger * (0.5 + 0.5 * Math.sin(this.time * 9));
    this.vignette.tint =
      pulse > 0.02 ? (Math.round(255 * Math.min(1, 0.4 + pulse)) << 16) | 0x000a00 : 0x000000;
    this.vignette.alpha = Math.min(1, this.grade.vignette + pulse * 0.5);
  }

  destroy(): void {
    this.stage.filters = null;
    this.stage.filterArea = undefined;
    this.picture.filters = null;
    this.picture.filterArea = undefined;
    this.crt?.destroy();
    this.sensory?.destroy();
    this.adjust.destroy();
    this.shock?.destroy();
    this.vignette.destroy({ texture: true, textureSource: true });
  }
}
