import { Container, Graphics, type Application } from 'pixi.js';
import { TPS, Worm, type Game, type Mine, type Projectile, type SoundId } from '@wr/sim';
import { PHRASES, weaponInfo, weaponFx } from '@wr/content';
import { Sfx } from './audio/sfx';
import type { Viewport, ViewportController } from './viewport';
import {
  AimView,
  LightLayer,
  EffectsSystem,
  PostFx,
  Transports,
  aircraftFor,
  BurnMarks,
  SpeechView,
  TargetView,
  Background,
  Camera,
  Fx,
  edgeMarker,
  labelScaleFor,
  labelUnit,
  type LabelScale,
  TEAM_COLORS,
  SKINS,
  assets,
  resolveTeamVariant,
  type CharacterAppearance,
  TerrainView,
  WaterView,
  WormView,
  createEntityView,
  createViewContext,
  mixColor,
  type ViewContext,
  type EntityView,
  type Theme,
  type CrtMode,
  type SensoryEffect,
} from '@wr/render';

/** Everything visible in a match, kept in sync with the simulation. */
export class GameScene {
  readonly camera: Camera;
  private background: Background;
  private world = new Container();
  /** The CRT picture excludes text and the aim overlay. */
  private picture = new Container();
  private terrainView: TerrainView;
  private burnMarks: BurnMarks;
  private water: WaterView;
  private entityLayer = new Container();
  private wormLayer = new Container();
  private aim = new AimView();
  /** Camera-transformed like `world`, but drawn above the lights. */
  private aimLayer = new Container();
  private targetView = new TargetView();
  private speech = new SpeechView();
  /** Text drawn at a fixed pixel size above the zoomed world (labels, speech, damage numbers). */
  private labelLayer = new Container();
  /** Arrows at the screen edge for the active worm and crates that are out of view. */
  private markers = new Graphics();
  private post: PostFx;
  private transports = new Transports();
  private dirt: number;
  /** Last time each worm spoke, so they don't chatter non-stop. */
  private lastSpoke = new Map<number, number>();
  private trailClock = 0;
  private poisonedFocus: number | null = null;
  private trailAt = new Map<number, number>();
  /** Mouse position in world coordinates, set by the input layer. */
  mouseWorld: { x: number; y: number } | null = null;
  private fx: Fx;
  private effects: EffectsSystem;
  private lights: LightLayer;
  private baseAmbient: number;
  private worms = new Map<number, WormView>();
  private entities = new Map<number, EntityView>();
  private readonly viewCtx: ViewContext;
  /** Pause camera following after the user scrolls manually. */
  userScrolled = false;
  onMessage: (text: string) => void = () => {};
  /** Slow motion / hit-stop request: game clock at `scale` for `seconds` of real time. */
  onTimeScale: (scale: number, seconds: number) => void = () => {};
  readonly sfx = new Sfx();
  /** Size of the text labels, from the viewport. */
  private labelScale!: LabelScale;
  private unsubscribe: () => void = () => {};

  constructor(
    private readonly app: Application,
    viewport: ViewportController,
    private readonly game: Game,
    theme: Theme,
    seed: number,
    private readonly teamSkins: readonly CharacterAppearance[] = [],
  ) {
    this.viewCtx = createViewContext(game.world, game.rules);
    this.viewCtx.vfxNamespace = theme.artStyle === 'painted' ? 'painted/vfx' : 'vfx';
    const terrain = game.world.terrain;
    this.camera = new Camera(terrain);

    this.background = new Background(theme, terrain.width, terrain.height, seed);
    this.terrainView = new TerrainView(terrain, theme);
    this.burnMarks = new BurnMarks(terrain);
    this.water = new WaterView(theme, terrain);
    this.fx = new Fx(theme.soil.base);
    this.effects = new EffectsSystem(
      {
        shake: (p) => this.camera.shake(p),
        punch: (a) => this.camera.punch(a),
        timeScale: (s, d) => this.onTimeScale(s, d),
        light: (x, y, color, radius, life, intensity) =>
          this.lights.flash(x, y, color, radius, life, intensity),
        shockwave: (x, y, s) => {
          const p = this.camera.toScreen(x, y);
          this.post.shockwave(p.x, p.y, s);
        },
      },
      theme.artStyle === 'painted' ? 'painted/vfx' : 'vfx',
    );
    this.dirt = theme.soil.base;
    this.world.addChild(
      this.water.back,
      this.terrainView.container,
      this.burnMarks.container,
      this.transports.shadows,
      this.entityLayer,
      this.wormLayer,
      this.targetView.container,
      this.effects.back,
      this.effects.front,
      this.water.front,
    );
    this.picture.addChild(this.background.container, this.world);
    this.labelLayer.addChild(this.fx.container, this.speech.container, this.markers);
    this.lights = new LightLayer(app, viewport.current);
    this.baseAmbient = theme.ambient ?? 0xffffff;
    this.lights.setAmbient(this.baseAmbient, true);
    // The aim overlay sits above the lighting and name labels so neither dims or hides it.
    this.picture.addChild(this.transports.container, this.lights.container);
    app.stage.addChild(this.picture, this.labelLayer, this.aimLayer);
    this.aimLayer.addChild(this.aim.container);
    this.post = new PostFx(app, app.stage, this.picture);
    this.post.setGrade(theme.grade ?? {});
    const w = game.activeWorm;
    if (w) this.camera.lookAt(w.x, w.y - 40);
    this.applyViewport(viewport.current);
    this.unsubscribe = viewport.onChange((vp) => this.applyViewport(vp));
  }

  /** Reacts to a new window size / scale / DPR (called before the frame that draws it). */
  private applyViewport(vp: Viewport): void {
    this.camera.setBase(vp.kd, vp.dpr);
    this.lights.resize(vp);
    this.post.resize(vp.cssW, vp.cssH);
    this.labelScale = labelScaleFor(vp.kd, vp.dpr);
    this.fx.setLabelScale(this.labelScale);
    this.speech.setLabelScale(this.labelScale);
    for (const [, v] of this.worms) v.setLabelScale(this.labelScale);
  }

  destroy(): void {
    this.unsubscribe();
    this.lights.destroy();
    this.post.destroy();
    this.effects.destroy();
    this.transports.destroy();
    this.sfx.destroy();
    this.burnMarks.destroy();
    this.app.stage.removeChildren();
    this.background.container.destroy({ children: true });
    this.world.destroy({ children: true });
    this.picture.destroy();
  }

  setCrt(mode: CrtMode): void {
    this.post.setCrt(mode);
  }

  /** Preview cosmetic screen presets without introducing a simulation status. */
  previewScreenEffect(effect: SensoryEffect): void {
    this.post.screenEffect(effect);
  }

  private sync(): void {
    const live = new Set<number>();
    for (const e of this.game.world.all()) {
      if (e.removed) continue;
      live.add(e.id);
      if (e instanceof Worm) {
        if (!this.worms.has(e.id)) {
          const selected = this.teamSkins[e.team] ?? {};
          const team = this.game.teams[e.team];
          const index = team?.wormIds.indexOf(e.id) ?? 0;
          const available = new Set(
            SKINS.filter((s) => assets.has(`skins/${s.id}/idle`)).map((s) => s.id),
          );
          const skin = resolveTeamVariant(selected, Math.max(0, index), available);
          const v = new WormView(e, skin);
          v.setLabelScale(this.labelScale);
          this.worms.set(e.id, v);
          this.wormLayer.addChild(v.container);
          this.labelLayer.addChild(v.label);
        }
      } else if (!this.entities.has(e.id)) {
        const v = createEntityView(e, this.viewCtx);
        if (v) {
          this.entities.set(e.id, v);
          this.entityLayer.addChild(v.container);
        }
      }
    }
    for (const [id, v] of this.entities) {
      if (!live.has(id)) {
        v.container.destroy({ children: true });
        this.entities.delete(id);
      }
    }
  }

  /** Feeds simulation events into effects and the camera. */
  handleEvents(): void {
    for (const ev of this.game.world.drainEvents()) {
      switch (ev.type) {
        case 'airRaid':
          this.transports.play(ev);
          this.sfx.cinematic(`flyby-${aircraftFor(ev.source)}`, ev.dir * -0.5);
          break;
        case 'sound':
          if (ev.id === 'launch' && ev.variant === 'mk2') this.sfx.cinematic('launch-heavy');
          else this.sound(ev.id, ev.x, ev.y);
          // Muzzle flash for launchers and shotguns; automatic guns fire a lot, so a small one.
          if (ev.id === 'launch' || ev.id === 'shotgun') {
            this.effects.play('muzzle', ev.x, ev.y, 30, {
              dirt: this.dirt,
              wind: this.game.world.wind,
            });
          } else if (ev.id === 'shot') {
            this.effects.play('impact', ev.x, ev.y, 12, { dirt: this.dirt, wind: 0 });
          }
          break;
        case 'tracer':
          this.effects.tracer(ev.x0, ev.y0, ev.x1, ev.y1);
          break;
        case 'explosion': {
          const profile = weaponFx(ev.source, ev.variant);
          if (ev.source === 'nuke') this.post.screenEffect('flash');
          if (profile.scorch) this.burnMarks.add(ev.x, ev.y, ev.radius);
          this.sound('explosion', ev.x, ev.y, Math.min(1.5, ev.radius / 50));
          if (
            profile.recipe === 'explosion-heavy' &&
            Math.hypot(ev.x - this.camera.x, ev.y - this.camera.y) <
              this.camera.viewW / this.camera.zoom / 3
          )
            this.sfx.cinematic('impact-heavy');
          this.effects.play(profile.recipe, ev.x, ev.y, ev.radius * profile.scale, {
            dirt: this.dirt,
            wind: this.game.world.wind,
            accent: profile.accent,
          });
          this.camera.shake(Math.min(10, ev.radius / 6));
          break;
        }
        case 'steam':
          this.effects.clips.play('steam', ev.x, ev.y, {
            life: 1.1,
            width: 26,
            vy: -15,
            fade: true,
          });
          break;
        case 'death':
          this.effects.clips.play('ghost', ev.x, ev.y - 10, {
            life: 1.8,
            width: 24,
            vy: -32,
            fade: true,
          });
          break;
        case 'splash':
          this.sound('splash', ev.x, ev.y, ev.size);
          this.effects.play('splash', ev.x, ev.y, 18 + ev.size * 30, { dirt: this.dirt, wind: 0 });
          break;
        case 'damage': {
          // Hit-stop: a brief freeze on a solid hit makes impacts feel heavy.
          if (ev.amount >= 20) {
            this.onTimeScale(0.06, 0.05 + Math.min(0.12, ev.amount / 500));
            this.camera.shake(Math.min(8, ev.amount / 7), 0.3);
          }
          const worm = this.game.world.byId(ev.wormId);
          if (worm instanceof Worm) {
            const color = TEAM_COLORS[worm.team % TEAM_COLORS.length] as number;
            this.fx.damage(worm.x, worm.y - 40, ev.amount, color);
          }
          break;
        }
        case 'crate': {
          const worm = this.game.world.byId(ev.wormId);
          if (worm instanceof Worm) {
            const text = ev.text.startsWith('+') ? ev.text : weaponInfo(ev.text).name;
            this.fx.damage(worm.x, worm.y - 40, text, 0xffffff);
          }
          break;
        }
        case 'shake':
          this.camera.shake(ev.amount);
          break;
        case 'fired':
          this.worms.get(ev.wormId)?.playAct(ev.weapon);
          if (ev.weapon === 'nuke') {
            const w = this.game.world.byId(ev.wormId);
            if (w instanceof Worm) {
              this.transports.play({
                type: 'airRaid',
                x: w.x,
                y: -200,
                dir: w.facing,
                speed: 0,
                spacing: 0,
                payloadIds: [],
                source: 'nuke',
              });
              this.sfx.cinematic('flyby-stealth', w.facing * -0.5);
            }
          }
          break;
        case 'speech': {
          const worm = this.game.world.byId(ev.wormId);
          const now = performance.now();
          const important = ev.line === 'death' || ev.line === 'win' || ev.line === 'drown';
          if (
            !(worm instanceof Worm) ||
            (!important && now - (this.lastSpoke.get(worm.id) ?? -Infinity) < 2500)
          )
            break;
          this.lastSpoke.set(worm.id, now);
          const lines = PHRASES[ev.line];
          const text = lines[Math.floor(Math.random() * lines.length)] ?? '';
          this.speech.say(worm, text);
          this.sfx.babble(text.length, worm.id, worm.x - this.camera.x);
          break;
        }
        case 'message':
          // The game over screen announces the winner itself.
          if (ev.key === 'suddenDeath') this.onMessage('Внезапная смерть!');
          break;
        default:
          break;
      }
    }
  }

  /** Persistent light sources (fire, rockets, mines) and the scene's ambient mood. */
  private updateLights(dtMs: number): void {
    const game = this.game;
    // Sudden Death turns the light blood-red and dim.
    const target = game.suddenDeath ? mixColor(this.baseAmbient, 0x9a6a6e, 0.6) : this.baseAmbient;
    this.lights.setAmbient(target);
    for (const e of game.world.all()) {
      if (e.removed) continue;
      switch (e.kind) {
        case 'flame':
          this.lights.frame(e.x, e.y - 4, 0xff8a30, 38, 0.7, 0.25);
          break;
        case 'projectile': {
          const light = game.rules.looks[(e as Projectile).look]?.light;
          if (light)
            this.lights.frame(e.x, e.y, light.color, light.radius, light.intensity, light.flicker);
          break;
        }
        case 'mine': {
          const m = e as Mine;
          if (m.armed && Math.sin(performance.now() / (m.triggered ? 50 : 330)) > 0) {
            this.lights.frame(e.x, e.y - 2, 0xff3020, 22, 0.6);
          }
          break;
        }
        case 'crate':
          this.lights.frame(e.x, e.y - 20, 0xfff0c0, 30, 0.25);
          break;
        default:
          break;
      }
    }
    this.trails(dtMs);
    this.lights.update(dtMs, this.camera);
  }

  /** Smoke trails behind rockets and burning fuses on grenades and dynamite. */
  private trails(dtMs: number): void {
    if (dtMs <= 0) return;
    this.trailClock += Math.min(dtMs / 1000, 0.1);
    const live = new Set<number>();
    const ctx = { dirt: this.dirt, wind: this.game.world.wind };
    const looks = this.game.rules.looks;
    for (const e of this.game.world.ofKind('flame')) {
      live.add(e.id);
      if (!this.trailAt.has(e.id)) this.burnMarks.add(e.x, e.y + 3, 7);
      if (this.trailClock < (this.trailAt.get(e.id) ?? 0)) continue;
      this.trailAt.set(e.id, this.trailClock + 0.4);
      if (e.id % 3 === 0)
        this.effects.clips.play('smoke', e.x, e.y - 9, {
          life: 1.1,
          width: 12,
          vy: -12,
          vx: this.game.world.wind * 4,
          fade: true,
          alpha: 0.45,
        });
    }
    for (const e of this.game.world.ofKind<Projectile>('projectile')) {
      live.add(e.id);
      if (this.trailClock < (this.trailAt.get(e.id) ?? 0)) continue;
      this.trailAt.set(e.id, this.trailClock + 0.055);
      const bx = e.x - e.vx * 0.4;
      const by = e.y - e.vy * 0.4;
      const trail = looks[e.look]?.trail;
      if (trail === 'rocket') {
        const upgraded =
          (e.look === 'missile' || e.look === 'homing') && this.game.world.variantOf(e) === 'mk2';
        this.effects.play('trail-rocket', bx, by, 40, ctx);
        this.effects.clips.play('engine', bx, by, {
          life: 0.12,
          width: upgraded ? 26 : 18,
          rotation: Math.atan2(e.vy, e.vx),
          loop: true,
        });
        if (upgraded)
          this.effects.clips.play('smoke', bx, by, {
            life: 1,
            width: 22,
            vy: -7,
            fade: true,
            alpha: 0.55,
          });
      } else if (trail === 'fuse' && e.fuseLeft > 0) {
        this.effects.play('trail-fuse', e.x, e.y - 5, 20, ctx);
      } else if (trail === 'meteor' || trail === 'fire') {
        this.effects.clips.play('engine', bx, by, {
          life: 0.25,
          width: trail === 'meteor' ? 28 : 14,
          rotation: Math.atan2(e.vy, e.vx),
          fade: true,
        });
        this.effects.clips.play('smoke', bx, by, { life: 0.8, width: 18, vy: -8, fade: true });
      } else if (trail === 'energy') {
        this.effects.clips.play('energy', bx, by, { life: 0.2, width: 12, fade: true });
      } else if (trail === 'toxic') {
        this.effects.clips.play('gas', bx, by, { life: 0.7, width: 14, vy: -8, fade: true });
      } else if (trail === 'paper') {
        this.effects.clips.play('letter', bx, by, {
          life: 0.25,
          width: 6,
          vy: 8,
          fade: true,
          alpha: 0.35,
        });
      }
    }
    for (const id of this.trailAt.keys()) if (!live.has(id)) this.trailAt.delete(id);
  }

  /** Debug: plays an effect near the active worm (used by tools/shot.mjs: `e:__game.fx('explosion')`). */
  debugEffect(id: string, size = 60, dx = 90, dy = -40): void {
    const w = this.game.activeWorm;
    if (w)
      this.effects.play(id, w.x + dx, w.y + dy, size, {
        dirt: this.dirt,
        wind: this.game.world.wind,
      });
  }

  /** Camera follows the focus again (after the player looked around by hand). */
  recentre(): void {
    this.userScrolled = false;
  }

  /** Edge arrows for the active worm and for crates when they are off screen. */
  private drawMarkers(project: (x: number, y: number) => { x: number; y: number }): void {
    const g = this.markers;
    g.clear();
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const u = labelUnit(this.labelScale);
    const arrow = (wx: number, wy: number, color: number) => {
      const p = project(wx, wy);
      const m = edgeMarker(p.x, p.y, w, h, 10 * u);
      if (!m) return;
      const c = Math.cos(m.angle);
      const s = Math.sin(m.angle);
      const pt = (fwd: number, side: number) => [
        m.x + c * fwd - s * side,
        m.y + s * fwd + c * side,
      ];
      const tip = pt(8 * u, 0);
      const l = pt(-6 * u, -6 * u);
      const r = pt(-6 * u, 6 * u);
      g.poly([...tip, ...l, ...r])
        .fill(color)
        .stroke({ width: u, color: 0x1b1b2a });
    };
    const worm = this.game.activeWorm;
    if (worm && this.game.phase !== 'gameover') {
      arrow(worm.x, worm.y - 8, TEAM_COLORS[worm.team % TEAM_COLORS.length] as number);
    }
    for (const c of this.game.world.ofKind('crate')) arrow(c.x, c.y, 0xfbf236);
  }

  /** Plays a sound positioned relative to what the camera shows. */
  sound(id: SoundId, x: number, y: number, size = 0.5): void {
    const c = this.camera;
    this.sfx.play(id, x, y, { x: c.x, y: c.y, halfW: c.viewW / 2 / c.zoom }, size);
  }

  render(alpha: number, dtMs: number): void {
    this.sync();
    const game = this.game;
    const focus = game.world.byId(game.focusId) ?? game.activeWorm;
    const poisoned = game.activeWorm?.poisoned ? game.activeWormId : null;
    if (poisoned !== null && poisoned !== this.poisonedFocus)
      this.post.screenEffect('hallucination');
    this.poisonedFocus = poisoned;
    if (focus && !this.userScrolled) this.camera.follow(focus.x, focus.y - 40);
    this.camera.resize(this.app.screen.width, this.app.screen.height);
    this.camera.update(dtMs);
    this.camera.apply(this.world);
    this.camera.apply(this.aimLayer);
    const project = (x: number, y: number) => this.camera.toScreen(x, y);
    this.background.update(this.camera, this.app.screen.width, this.app.screen.height);
    this.water.update(
      dtMs,
      game.world.waterLevel,
      this.camera.x,
      this.app.screen.width / 2 / this.camera.scale,
    );
    this.burnMarks.update(dtMs, game.world.terrain.dirty.length > 0);
    this.terrainView.update();

    for (const [, v] of this.worms) {
      const isActive = v.worm.id === game.activeWormId;
      // The active worm shows its weapon while it is that worm's turn to aim.
      const aiming = isActive && (game.phase === 'ready' || game.phase === 'turn');
      const hold = aiming ? game.weaponId : '';
      const showArrow = isActive && (game.phase === 'ready' || game.phase === 'turn');
      const endPose =
        game.phase === 'gameover' ? (game.winner === v.worm.team ? 'win' : 'defeat') : undefined;
      v.update(
        alpha,
        dtMs,
        isActive && game.phase !== 'settling',
        project,
        hold,
        showArrow,
        endPose,
      );
      v.setShownHealth(v.worm.shownHealth);
    }
    this.viewCtx.crateSpy = !!game.activeWorm?.crateSpy;
    for (const [, v] of this.entities) v.update(alpha, dtMs);

    const def = game.weapon;
    const aiming = (game.phase === 'turn' || game.phase === 'ready') && def?.aim === 'angle';
    this.aim.update(
      game.activeWorm,
      alpha,
      aiming,
      game.power,
      game.charging,
      game.world.terrain,
      this.camera.zoom,
    );
    const secLeft = game.timer / TPS;
    this.post.setDanger(game.phase === 'turn' && secLeft <= 5 ? 1 - secLeft / 5 : 0);
    this.post.update(dtMs);
    this.updateLights(dtMs);
    this.targetView.update(game, this.mouseWorld, dtMs);
    this.drawMarkers(project);
    this.speech.update(
      dtMs,
      project,
      game.phase === 'ready' || game.phase === 'turn' ? game.activeWormId : null,
    );
    this.fx.update(dtMs, project);
    this.effects.update(dtMs);
    this.transports.update(dtMs, this.camera, game.world);
  }
}
