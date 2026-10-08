import { Container, Rectangle, Sprite, Texture, type Application } from 'pixi.js';
import { AdjustmentFilter, AdvancedBloomFilter, ShockwaveFilter } from 'pixi-filters';

/** Per-theme look: colour grading and how readily things glow. */
export interface GradeSpec {
  saturation: number;
  contrast: number;
  gamma: number;
  brightness: number;
  /** Channel multipliers for a colour cast. */
  tint: [number, number, number];
  /** Only pixels brighter than this bloom (0..1). */
  bloomThreshold: number;
  bloomScale: number;
  /** 0..1 darkening of the screen edges. */
  vignette: number;
}

export const DEFAULT_GRADE: GradeSpec = {
  saturation: 1.1,
  contrast: 1.05,
  gamma: 1,
  brightness: 1,
  tint: [1, 1, 1],
  bloomThreshold: 0.9,
  bloomScale: 0.55,
  vignette: 0.45,
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
  return Texture.from(c);
}

/**
 * Whole-screen post effects: bloom so explosions and fire glow, a per-theme colour grade,
 * and a vignette that turns red as the turn timer runs out.
 */
export class PostFx {
  private readonly bloom: AdvancedBloomFilter;
  private readonly adjust: AdjustmentFilter;
  private readonly vignette: Sprite;
  private grade: GradeSpec = DEFAULT_GRADE;
  /** Extra glow after a blast, decays to 0. */
  private kick = 0;
  private shock: ShockwaveFilter | null = null;
  private shockTime = 0;
  private shockLife = 0;
  private danger = 0;
  private dangerTarget = 0;
  private time = 0;

  constructor(
    private readonly app: Application,
    private readonly stage: Container,
  ) {
    this.bloom = new AdvancedBloomFilter({
      threshold: 0.7,
      bloomScale: 0.5,
      brightness: 1,
      blur: 6,
      quality: 4,
    });
    this.adjust = new AdjustmentFilter();
    this.vignette = new Sprite(vignetteTexture());
    this.vignette.eventMode = 'none';
    stage.filters = [this.adjust, this.bloom];
    stage.filterArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
    app.stage.addChild(this.vignette);
    this.setGrade(DEFAULT_GRADE);
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
    this.bloom.threshold = t.bloomThreshold;
  }

  /** A blast just happened: briefly intensify the glow. */
  flash(strength: number): void {
    this.kick = Math.min(1.2, Math.max(this.kick, strength));
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
    f.center = { x: screenX, y: screenY };
    f.amplitude = 6 + 12 * Math.min(1.5, strength);
    f.time = 0;
    this.shockTime = 0;
    this.shockLife = 0.55 + 0.25 * Math.min(1.5, strength);
    if (!this.stage.filters || !(this.stage.filters as unknown[]).includes(f)) {
      this.stage.filters = [this.adjust, this.bloom, f];
    }
  }

  /** 0..1: how urgent the moment is (timer running out). */
  setDanger(level: number): void {
    this.dangerTarget = level;
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.time += dt;
    this.kick = Math.max(0, this.kick - dt * 2.4);
    this.danger += (this.dangerTarget - this.danger) * Math.min(1, dt * 6);

    if (this.shock && this.shockLife > 0) {
      this.shockTime += dt;
      this.shock.time = this.shockTime;
      // Fade the distortion out over the second half of its life.
      const left = 1 - this.shockTime / this.shockLife;
      this.shock.amplitude *= left < 0.5 ? 0.9 : 1;
      if (this.shockTime >= this.shockLife) {
        this.shockLife = 0;
        this.stage.filters = [this.adjust, this.bloom];
      }
    }

    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const area = this.stage.filterArea as Rectangle;
    if (area.width !== w || area.height !== h) {
      area.width = w;
      area.height = h;
    }
    this.bloom.bloomScale = this.grade.bloomScale * (1 + this.kick * 1.6);
    this.bloom.brightness = 1 + this.kick * 0.25;

    // Vignette: black normally, pulsing red when time is short.
    const pulse = this.danger * (0.5 + 0.5 * Math.sin(this.time * 9));
    this.vignette.width = w;
    this.vignette.height = h;
    this.vignette.tint =
      pulse > 0.02 ? (Math.round(255 * Math.min(1, 0.4 + pulse)) << 16) | 0x000a00 : 0x000000;
    this.vignette.alpha = Math.min(1, this.grade.vignette + pulse * 0.5);
  }

  destroy(): void {
    this.stage.filters = null;
    this.stage.filterArea = undefined;
    this.vignette.destroy();
  }
}
