import { Hasher } from '../core/hash';
import { HALF_PI, cos, sin } from '../core/math';
import type { Terrain } from '../terrain/terrain';
import { Barrel } from '../weapons/barrel';
import { explode } from '../weapons/explosion';
import { Mine } from '../weapons/mine';
import { getWeapon, isRemoteControlled, type WeaponDef } from '../weapons/weapon';
import { Gravestone } from '../world/gravestone';
import { World } from '../world/world';
import { Worm } from '../worm/worm';
import type { Command } from './commands';
import { weaponSetting, type Scheme } from './scheme';

export const TPS = 50;
/** Aim speed, radians per tick (W:A: about 1.5 s from straight down to straight up). */
const AIM_SPEED = HALF_PI / 38;
/** Ticks to charge the power bar fully. */
const CHARGE_TICKS = 55;
/** Ticks everything must stay still before the turn is over. */
const SETTLE_TICKS = 12;
/** Give up waiting for things to stop moving after this long. */
const MAX_SETTLE_TICKS = 20 * TPS;
const DEATH_DELAY = 35;
const POISON_DAMAGE = 5;

export type Phase = 'ready' | 'turn' | 'retreat' | 'settling' | 'dying' | 'gameover';

export interface TeamSetup {
  name: string;
  worms: string[];
}

export interface GameSetup {
  seed: number;
  scheme: Scheme;
  teams: TeamSetup[];
  terrain: Terrain;
  waterLevel: number;
  /** Spawn points for worms, used in order (team-interleaved). */
  spawns: { x: number; y: number }[];
  cavern?: boolean;
  /** Mines and oil drums scattered at the start. */
  objects?: { kind: 'mine' | 'barrel'; x: number; y: number }[];
}

export class Team {
  wormIds: number[] = [];
  nextWorm = 0;
  turnsTaken = 0;
  surrendered = false;
  /** Remaining ammo per weapon; -1 = infinite. */
  ammo: Record<string, number> = {};
  lastWeapon = '';

  constructor(
    readonly index: number,
    readonly name: string,
  ) {}
}

export class Game {
  readonly world: World;
  readonly scheme: Scheme;
  readonly teams: Team[];
  readonly cavern: boolean;
  phase: Phase = 'ready';
  /** Ticks left in the current phase (ready / turn / retreat / dying). */
  timer = 0;
  /** Ticks of round time left before Sudden Death. */
  roundTimer: number;
  turn = 0;
  activeTeam = -1;
  activeWormId = 0;
  suddenDeath = false;
  /** Index of the winning team, -1 for a draw, null while playing. */
  winner: number | null = null;

  // Weapon state of the active worm.
  weaponId = '';
  fuseSeconds = 3;
  bounceHigh = false;
  charging = false;
  power = 0;
  target: { x: number; y: number } | null = null;
  shotsLeft = 0;
  firedThisTurn = false;
  /** Entity currently steered by the player (sheep), 0 if none. */
  controlledId = 0;
  /** Whether losing the controlled entity starts the retreat (sheep) or not (rope). */
  private controlledEndsTurn = true;
  /** Arrow keys as last sent by the player. */
  private held = { left: false, right: false, up: false, down: false };

  /** Entity the camera should follow. Presentation only. */
  focusId = 0;
  private settleTicks = 0;
  private settleTotal = 0;
  private dyingQueue: number[] = [];
  private turnStartDamage = 0;

  constructor(setup: GameSetup) {
    this.scheme = setup.scheme;
    this.cavern = setup.cavern ?? false;
    this.world = new World({
      seed: setup.seed,
      terrain: setup.terrain,
      waterLevel: setup.waterLevel,
    });
    this.roundTimer = Math.round(this.scheme.roundTime * TPS);
    this.teams = setup.teams.map((t, i) => {
      const team = new Team(i, t.name);
      for (const [id, s] of Object.entries(this.scheme.weapons)) team.ammo[id] = s.ammo;
      return team;
    });
    // Spawn worms interleaved between teams so nobody gets all the good spots.
    let spawnIdx = 0;
    const perTeam = this.scheme.wormsPerTeam;
    for (let k = 0; k < perTeam; k++) {
      setup.teams.forEach((t, ti) => {
        const name = t.worms[k] ?? `Worm ${k + 1}`;
        const p = setup.spawns[spawnIdx++];
        if (!p) return;
        const worm = this.world.spawn(new Worm(p.x, p.y, name, ti, this.scheme.wormHealth));
        worm.facing = p.x < setup.terrain.width / 2 ? 1 : -1;
        worm.shownHealth = worm.health;
        worm.launch(0, 0, false);
        (this.teams[ti] as Team).wormIds.push(worm.id);
      });
    }
    for (const o of setup.objects ?? []) {
      if (o.kind === 'mine') {
        this.world.spawn(
          new Mine(o.x, o.y - 3, {
            armTicks: 0,
            fuseTicks: this.scheme.mineFuse < 0 ? -1 : this.scheme.mineFuse * TPS,
            dudsAllowed: this.scheme.duds,
          }),
        );
      } else {
        this.world.spawn(new Barrel(o.x, o.y - 6));
      }
    }
    // Teams start in a random order.
    this.activeTeam = this.world.rng.int(0, this.teams.length - 1) - 1;
    this.startTurn();
  }

  get worms(): Worm[] {
    return this.world.ofKind<Worm>('worm');
  }

  get activeWorm(): Worm | null {
    const w = this.world.byId(this.activeWormId);
    return w instanceof Worm && w.alive ? w : null;
  }

  get weapon(): WeaponDef | undefined {
    return getWeapon(this.weaponId);
  }

  teamWorms(team: Team): Worm[] {
    return team.wormIds
      .map((id) => this.world.byId(id))
      .filter((w): w is Worm => w instanceof Worm);
  }

  teamAlive(team: Team): boolean {
    return !team.surrendered && this.teamWorms(team).some((w) => w.alive);
  }

  teamHealth(team: Team): number {
    return this.teamWorms(team).reduce((s, w) => s + (w.alive ? Math.max(0, w.shownHealth) : 0), 0);
  }

  /** Whether the active team may use a weapon right now. */
  canUse(id: string): boolean {
    const def = getWeapon(id);
    const team = this.teams[this.activeTeam];
    if (!def || !team) return false;
    const ammo = team.ammo[id] ?? 0;
    if (ammo === 0) return false;
    if (def.needsSky && this.cavern) return false;
    return team.turnsTaken >= weaponSetting(this.scheme, id).delay;
  }

  /** Applies the player's commands for this tick and advances the game by one tick. */
  step(commands: readonly Command[] = []): void {
    for (const c of commands) this.handle(c);
    this.tickControls();
    this.world.step();
    this.tickPhase();
  }

  private handle(c: Command): void {
    const worm = this.activeWorm;
    if (!worm) return;
    const controllable =
      this.phase === 'ready' || this.phase === 'turn' || this.phase === 'retreat';
    if (!controllable) return;
    // Any input during the hot-seat delay starts the turn.
    if (this.phase === 'ready' && c.t !== 'move') this.beginTurnTimer();
    const team = this.teams[this.activeTeam] as Team;

    switch (c.t) {
      case 'move': {
        const walk = !this.scheme.artillery && !this.controlledId;
        this.held = { left: c.left, right: c.right, up: c.up, down: c.down };
        worm.control = { left: walk && c.left, right: walk && c.right, up: c.up, down: c.down };
        if (this.phase === 'ready' && (c.left || c.right || c.up || c.down)) this.beginTurnTimer();
        break;
      }
      case 'jump':
        if (!this.scheme.artillery) worm.jump();
        break;
      case 'select':
        if (
          this.phase === 'turn' &&
          !this.charging &&
          !this.firedThisTurn &&
          this.canUse(c.weapon)
        ) {
          this.weaponId = c.weapon;
          team.lastWeapon = c.weapon;
          this.shotsLeft = getWeapon(c.weapon)?.shots ?? 1;
          this.target = null;
        }
        break;
      case 'fuse':
        this.fuseSeconds = Math.min(5, Math.max(1, Math.round(c.seconds)));
        break;
      case 'bounce':
        this.bounceHigh = c.high;
        break;
      case 'target':
        this.target = { x: c.x, y: c.y };
        break;
      case 'fire': {
        const e = this.controlledId ? this.world.byId(this.controlledId) : undefined;
        // On the rope with another weapon selected: use that weapon from the rope.
        const attackFromTool = isRemoteControlled(e) && e.weaponId && e.weaponId !== this.weaponId;
        if (c.down && isRemoteControlled(e) && !attackFromTool) e.remoteFire(this.world);
        else if (c.down) this.pressFire(worm);
        else if (this.charging) this.fire(worm, this.power);
        break;
      }
      case 'skip':
        if (this.phase !== 'retreat') this.endTurn();
        break;
      case 'surrender':
        team.surrendered = true;
        for (const w of this.teamWorms(team)) {
          w.health = 0;
          w.state = 'dead';
        }
        this.endTurn();
        break;
    }
  }

  private beginTurnTimer(): void {
    if (this.phase !== 'ready') return;
    this.phase = 'turn';
    this.timer = Math.round(this.scheme.turnTime * TPS);
  }

  /** Aim direction of the worm (screen coordinates). */
  private aimDir(worm: Worm, def: WeaponDef): { x: number; y: number } {
    if (def.aim === 'none') return { x: worm.facing, y: 0 };
    return { x: cos(worm.aim) * worm.facing, y: -sin(worm.aim) };
  }

  private pressFire(worm: Worm): void {
    if (this.phase !== 'turn' || this.shotsLeft <= 0) return;
    const def = this.weapon;
    if (!def || !this.canUse(def.id)) return;
    if (def.action === 'skip') {
      this.endTurn();
      return;
    }
    if (def.action === 'surrender') {
      this.handle({ t: 'surrender' });
      return;
    }
    const onRope = worm.state === 'roped';
    if (def.airborneOnly ? worm.grounded : !worm.grounded && !onRope && !def.airborne) return;
    if (def.aim === 'target') {
      const d = this.aimDir(worm, def);
      if (
        !this.target ||
        (def.validTarget && !def.validTarget(this.world, worm, this.target, d.x, d.y))
      ) {
        this.world.emit({ type: 'sound', id: 'nope', x: worm.x, y: worm.y });
        return;
      }
    }
    if (def.charge) {
      this.charging = true;
      this.power = 0;
    } else {
      this.fire(worm, 1);
    }
  }

  private fire(worm: Worm, power: number): void {
    const def = this.weapon;
    this.charging = false;
    if (!def) return;
    const team = this.teams[this.activeTeam] as Team;
    const dir = this.aimDir(worm, def);
    const controlledBefore = this.controlledId;
    def.fire({
      world: this.world,
      worm,
      dirX: dir.x,
      dirY: dir.y,
      power: Math.max(0.05, Math.min(1, power)),
      fuse: this.fuseSeconds * TPS,
      bounceHigh: this.bounceHigh,
      target: this.target,
      setting: weaponSetting(this.scheme, def.id),
      upgrades: this.scheme.upgrades,
      focus: (id) => (this.focusId = id),
      control: (id) => {
        this.controlledId = id;
        this.controlledEndsTurn = def.endsTurn !== false;
        this.focusId = id;
        worm.control = { left: false, right: false, up: false, down: false };
      },
    });
    const ammo = team.ammo[def.id] ?? 0;
    if (ammo > 0) team.ammo[def.id] = ammo - 1;
    // Movement tools (rope, parachute) don't use up the turn's attack.
    if (def.endsTurn === false) return;
    this.firedThisTurn = true;
    this.shotsLeft--;
    // A sheep keeps the turn going until it blows up; everything else starts the retreat.
    const tookControl = this.controlledId !== controlledBefore;
    if (this.shotsLeft <= 0 && !tookControl) {
      this.phase = 'retreat';
      this.timer = Math.round((def.retreat ?? this.scheme.retreatTime) * TPS);
    }
  }

  private tickControls(): void {
    if (this.controlledId) {
      const e = this.world.byId(this.controlledId);
      if (!e || e.removed) {
        // The sheep is gone: now run for it. (The rope is just put away.)
        this.controlledId = 0;
        if (this.phase === 'turn' && this.controlledEndsTurn) {
          this.phase = 'retreat';
          this.timer = Math.round((this.weapon?.retreat ?? this.scheme.retreatTime) * TPS);
        }
      } else if (isRemoteControlled(e)) {
        e.steer?.(this.held.left, this.held.right, this.held.up, this.held.down);
      }
    }
    const worm = this.activeWorm;
    if (!worm) return;
    if (this.phase === 'turn' || this.phase === 'ready') {
      if (worm.control.up) worm.aim = Math.min(HALF_PI, worm.aim + AIM_SPEED);
      if (worm.control.down) worm.aim = Math.max(-HALF_PI, worm.aim - AIM_SPEED);
    }
    if (this.charging) {
      this.power += 1 / CHARGE_TICKS;
      if (this.power >= 1) this.fire(worm, 1);
    }
  }

  private tickPhase(): void {
    const worm = this.activeWorm;
    switch (this.phase) {
      case 'ready':
        this.tickRound();
        if (--this.timer <= 0) this.beginTurnTimer();
        if (!worm || this.wormHurt(worm)) this.endTurn();
        break;
      case 'turn':
      case 'retreat':
        this.tickRound();
        if (--this.timer <= 0 || !worm || this.wormHurt(worm)) this.endTurn();
        break;
      case 'settling': {
        this.settleTotal++;
        this.settleTicks = this.world.isBusy() ? 0 : this.settleTicks + 1;
        if (this.settleTicks >= SETTLE_TICKS || this.settleTotal > MAX_SETTLE_TICKS)
          this.afterSettle();
        break;
      }
      case 'dying':
        if (--this.timer <= 0) this.killNext();
        break;
      case 'gameover':
        break;
    }
  }

  private tickRound(): void {
    if (this.roundTimer > 0) this.roundTimer--;
  }

  private wormHurt(worm: Worm): boolean {
    return worm.pendingDamage > this.turnStartDamage;
  }

  /** Ends the active part of the turn and waits for the world to come to rest. */
  endTurn(): void {
    const worm = this.activeWorm;
    if (worm) worm.control = { left: false, right: false, up: false, down: false };
    this.charging = false;
    // Whatever the player still controls goes off (sheep) or lets go (rope).
    const e = this.controlledId ? this.world.byId(this.controlledId) : undefined;
    if (isRemoteControlled(e)) e.timeout?.(this.world);
    this.controlledId = 0;
    this.phase = 'settling';
    this.settleTicks = 0;
    this.settleTotal = 0;
  }

  private afterSettle(): void {
    // Worms reduced to 0 health blow up one by one.
    this.dyingQueue = this.worms.filter((w) => w.alive && w.health <= 0).map((w) => w.id);
    if (this.dyingQueue.length) {
      this.phase = 'dying';
      this.timer = DEATH_DELAY;
      return;
    }
    this.finishTurn();
  }

  private killNext(): void {
    const id = this.dyingQueue.shift();
    const worm = id === undefined ? undefined : this.world.byId(id);
    if (worm instanceof Worm && worm.alive) {
      worm.state = 'dead';
      this.focusId = worm.id;
      this.world.emit({ type: 'speech', wormId: worm.id, line: 'death' });
      explode(this.world, worm.cx, worm.cy, { crater: 16, radius: 34, damage: 20 });
      this.world.spawn(new Gravestone(worm.x, worm.y - 8, worm.team));
    }
    if (this.dyingQueue.length) {
      this.timer = DEATH_DELAY;
    } else {
      // Death explosions can hurt or move others: wait again.
      this.endTurn();
    }
  }

  private finishTurn(): void {
    for (const w of this.worms) {
      w.shownHealth = Math.max(0, w.health);
      w.pendingDamage = 0;
    }
    const alive = this.teams.filter((t) => this.teamAlive(t));
    if (alive.length <= 1) {
      this.phase = 'gameover';
      this.winner = alive[0]?.index ?? -1;
      this.world.emit({ type: 'message', text: alive[0] ? `${alive[0].name} wins!` : 'Draw!' });
      return;
    }
    if (!this.suddenDeath && this.roundTimer <= 0) this.startSuddenDeath();
    this.startTurn();
  }

  private startSuddenDeath(): void {
    this.suddenDeath = true;
    this.world.emit({ type: 'message', text: 'Sudden Death!' });
    switch (this.scheme.suddenDeath) {
      case 'health1':
        for (const w of this.worms) if (w.alive) w.health = w.shownHealth = Math.min(w.health, 1);
        break;
      case 'nuclear':
        for (const w of this.worms) if (w.alive) w.poisoned = true;
        break;
      case 'end':
        this.endByHealth();
        break;
      default:
        break;
    }
  }

  /** Round ends: the team with the most health wins. */
  private endByHealth(): void {
    let best = -1;
    let bestHp = -1;
    let tie = false;
    for (const t of this.teams) {
      if (!this.teamAlive(t)) continue;
      const hp = this.teamHealth(t);
      if (hp > bestHp) {
        best = t.index;
        bestHp = hp;
        tie = false;
      } else if (hp === bestHp) tie = true;
    }
    this.phase = 'gameover';
    this.winner = tie ? -1 : best;
  }

  private startTurn(): void {
    if (this.phase === 'gameover') return;
    this.turn++;
    if (this.suddenDeath && this.scheme.suddenDeath !== 'none' && this.scheme.waterRise > 0) {
      this.world.waterLevel -= this.scheme.waterRise;
    }
    // Poison eats 5 health per turn but never kills.
    for (const w of this.worms) {
      if (w.alive && w.poisoned && w.health > 1) {
        const dmg = Math.min(POISON_DAMAGE, w.health - 1);
        w.health -= dmg;
        w.shownHealth = w.health;
        this.world.emit({ type: 'damage', wormId: w.id, amount: dmg });
      }
    }
    // Next team with living worms.
    for (let i = 1; i <= this.teams.length; i++) {
      const idx = (this.activeTeam + i) % this.teams.length;
      if (this.teamAlive(this.teams[idx] as Team)) {
        this.activeTeam = idx;
        break;
      }
    }
    const team = this.teams[this.activeTeam] as Team;
    const worms = this.teamWorms(team);
    let worm: Worm | undefined;
    for (let i = 0; i < worms.length; i++) {
      const w = worms[(team.nextWorm + i) % worms.length] as Worm;
      if (w.alive) {
        worm = w;
        team.nextWorm = (team.nextWorm + i + 1) % worms.length;
        break;
      }
    }
    this.activeWormId = worm?.id ?? 0;
    this.turnStartDamage = worm?.pendingDamage ?? 0;
    if (this.scheme.wind > 0)
      this.world.wind = (this.world.rng.int(-10, 10) / 10) * this.scheme.wind;

    this.weaponId = team.lastWeapon && this.canUse(team.lastWeapon) ? team.lastWeapon : '';
    this.shotsLeft = this.weapon?.shots ?? 1;
    this.charging = false;
    this.power = 0;
    this.target = null;
    this.firedThisTurn = false;
    this.focusId = this.activeWormId;
    this.phase = 'ready';
    this.timer = Math.round(this.scheme.hotSeatTime * TPS);
    team.turnsTaken++;
    if (this.timer <= 0) this.beginTurnTimer();
  }

  hash(): number {
    const h = new Hasher().u32(this.world.hash());
    this.hashInto(h);
    return h.digest();
  }

  hashInto(h: Hasher): void {
    h.str(this.phase)
      .u32(this.timer)
      .u32(this.roundTimer)
      .u32(this.turn)
      .u32(this.activeTeam + 1);
    h.u32(this.activeWormId).str(this.weaponId).f64(this.power).bool(this.charging);
    h.u32(this.controlledId).bool(this.controlledEndsTurn);
  }
}
