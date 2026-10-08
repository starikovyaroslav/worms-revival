import { Container, type Application } from 'pixi.js';
import { Worm, type Game, type Mine, type Projectile } from '@wr/sim';
import { PHRASES, weaponInfo } from '@wr/content';
import { Sfx } from './audio/sfx';
import {
  AimView,
  LightLayer,
  EffectsSystem,
  PostFx,
  SpeechView,
  TargetView,
  Background,
  Camera,
  Fx,
  TEAM_COLORS,
  TerrainView,
  WaterView,
  WormView,
  createEntityView,
  type EntityView,
  type Theme,
} from '@wr/render';

function mixToward(a: number, b: number, t: number): number {
  const ch = (c: number, sh: number) => (c >> sh) & 255;
  const m = (sh: number) => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

/** Everything visible in a match, kept in sync with the simulation. */
export class GameScene {
  readonly camera: Camera;
  private background: Background;
  private world = new Container();
  private terrainView: TerrainView;
  private water: WaterView;
  private entityLayer = new Container();
  private wormLayer = new Container();
  private aim = new AimView();
  private targetView = new TargetView();
  private speech = new SpeechView();
  private post: PostFx;
  private dirt: number;
  /** Last time each worm spoke, so they don't chatter non-stop. */
  private lastSpoke = new Map<number, number>();
  /** Mouse position in world coordinates, set by the input layer. */
  mouseWorld: { x: number; y: number } | null = null;
  private fx: Fx;
  private effects: EffectsSystem;
  private lights: LightLayer;
  private baseAmbient: number;
  private worms = new Map<number, WormView>();
  private entities = new Map<number, EntityView>();
  /** Pause camera following after the user scrolls manually. */
  userScrolled = false;
  onMessage: (text: string) => void = () => {};
  readonly sfx = new Sfx();

  constructor(
    private readonly app: Application,
    private readonly game: Game,
    theme: Theme,
    seed: number,
  ) {
    const terrain = game.world.terrain;
    this.camera = new Camera(terrain);
    this.background = new Background(theme, terrain.width, terrain.height, seed);
    this.terrainView = new TerrainView(terrain, theme);
    this.water = new WaterView(theme, terrain.width);
    this.fx = new Fx(theme.soil.base);
    this.effects = new EffectsSystem({
      shake: (p) => this.camera.shake(p),
      glow: (g) => this.post.flash(g),
      light: (x, y, color, radius, life, intensity) =>
        this.lights.flash(x, y, color, radius, life, intensity),
      shockwave: (x, y, s) => {
        const p = this.camera.toScreen(x, y);
        this.post.shockwave(p.x, p.y, s);
      },
    });
    this.dirt = theme.soil.base;
    this.world.addChild(
      this.water.back,
      this.terrainView.container,
      this.entityLayer,
      this.wormLayer,
      this.aim.container,
      this.targetView.container,
      this.effects.back,
      this.effects.front,
      this.fx.container,
      this.water.front,
      this.speech.container,
    );
    app.stage.addChild(this.background.container, this.world);
    this.lights = new LightLayer(app);
    this.baseAmbient = theme.ambient ?? 0xffffff;
    this.lights.setAmbient(this.baseAmbient, true);
    app.stage.addChild(this.lights.container);
    this.post = new PostFx(app, app.stage);
    this.post.setGrade(theme.grade ?? {});
    const w = game.activeWorm;
    if (w) this.camera.lookAt(w.x, w.y - 40);
  }

  destroy(): void {
    this.lights.destroy();
    this.post.destroy();
    this.app.stage.removeChildren();
    this.background.container.destroy({ children: true });
    this.world.destroy({ children: true });
  }

  private sync(): void {
    const live = new Set<number>();
    for (const e of this.game.world.all()) {
      if (e.removed) continue;
      live.add(e.id);
      if (e instanceof Worm) {
        if (!this.worms.has(e.id)) {
          const v = new WormView(e);
          this.worms.set(e.id, v);
          this.wormLayer.addChild(v.container);
        }
      } else if (!this.entities.has(e.id)) {
        const v = createEntityView(e, this.game.world);
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
        case 'sound':
          this.sound(ev.id, ev.x, ev.y);
          break;
        case 'explosion':
          this.sound('explosion', ev.x, ev.y, Math.min(1.5, ev.radius / 50));
          this.effects.play('explosion', ev.x, ev.y, ev.radius, {
            dirt: this.dirt,
            wind: this.game.world.wind,
          });
          this.camera.shake(Math.min(10, ev.radius / 6));
          break;
        case 'splash':
          this.sound('splash', ev.x, ev.y, ev.size);
          this.effects.play('splash', ev.x, ev.y, 18 + ev.size * 30, { dirt: this.dirt, wind: 0 });
          break;
        case 'damage': {
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
    const target = game.suddenDeath ? mixToward(this.baseAmbient, 0x9a6a6e, 0.6) : this.baseAmbient;
    this.lights.setAmbient(target);
    for (const e of game.world.all()) {
      if (e.removed) continue;
      switch (e.kind) {
        case 'flame':
          this.lights.frame(e.x, e.y - 4, 0xff8a30, 38, 0.7, 0.25);
          break;
        case 'projectile': {
          const look = (e as Projectile).look;
          if (look === 'missile' || look === 'homing')
            this.lights.frame(e.x, e.y, 0xffb050, 55, 0.8, 0.15);
          else if (look === 'hhg') this.lights.frame(e.x, e.y, 0xffe9a0, 70, 0.9, 0.1);
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
    this.lights.update(dtMs, this.camera);
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

  /** Plays a sound positioned relative to what the camera shows. */
  sound(id: string, x: number, y: number, size = 0.5): void {
    const c = this.camera;
    this.sfx.play(id, x, y, { x: c.x, y: c.y, halfW: c.viewW / 2 / c.zoom }, size);
  }

  render(alpha: number, dtMs: number): void {
    this.sync();
    const game = this.game;
    const focus = game.world.byId(game.focusId) ?? game.activeWorm;
    if (focus && !this.userScrolled) this.camera.follow(focus.x, focus.y - 40);
    this.camera.resize(this.app.screen.width, this.app.screen.height);
    this.camera.update(dtMs);
    this.camera.apply(this.world);
    this.background.update(this.camera, this.app.screen.width, this.app.screen.height);
    this.water.update(dtMs, game.world.waterLevel);
    this.terrainView.update();

    for (const [, v] of this.worms) {
      v.update(alpha, dtMs, v.worm.id === game.activeWormId && game.phase !== 'settling');
      v.setShownHealth(v.worm.shownHealth);
    }
    for (const [, v] of this.entities) v.update(alpha, dtMs);

    const def = game.weapon;
    const aiming = (game.phase === 'turn' || game.phase === 'ready') && def?.aim === 'angle';
    this.aim.update(game.activeWorm, alpha, aiming, game.power, game.charging);
    const secLeft = game.timer / 50;
    this.post.setDanger(game.phase === 'turn' && secLeft <= 5 ? 1 - secLeft / 5 : 0);
    this.post.update(dtMs);
    this.updateLights(dtMs);
    this.targetView.update(game, this.mouseWorld, dtMs);
    this.speech.update(dtMs);
    this.fx.update(dtMs);
    this.effects.update(dtMs);
  }
}
