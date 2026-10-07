import { Container, type Application } from 'pixi.js';
import { Worm, type Game } from '@wr/sim';
import { weaponInfo } from '@wr/content';
import {
  AimView,
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
  /** Mouse position in world coordinates, set by the input layer. */
  mouseWorld: { x: number; y: number } | null = null;
  private fx: Fx;
  private worms = new Map<number, WormView>();
  private entities = new Map<number, EntityView>();
  /** Pause camera following after the user scrolls manually. */
  userScrolled = false;
  onMessage: (text: string) => void = () => {};

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
    this.world.addChild(
      this.water.back,
      this.terrainView.container,
      this.entityLayer,
      this.wormLayer,
      this.aim.container,
      this.targetView.container,
      this.fx.container,
      this.water.front,
    );
    app.stage.addChild(this.background.container, this.world);
    const w = game.activeWorm;
    if (w) this.camera.lookAt(w.x, w.y - 40);
  }

  destroy(): void {
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
        case 'explosion':
          this.fx.explosion(ev.x, ev.y, ev.radius);
          this.camera.shake(Math.min(10, ev.radius / 6));
          break;
        case 'splash':
          this.fx.splash(ev.x, ev.y, ev.size);
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
        case 'message':
          this.onMessage(ev.text);
          break;
        default:
          break;
      }
    }
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
    this.targetView.update(game, this.mouseWorld, dtMs);
    this.fx.update(dtMs);
  }
}
