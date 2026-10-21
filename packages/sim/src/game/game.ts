import { Hasher } from '../core/hash';
import { HALF_PI, cos, sin } from '../core/math';
import { TPS } from '../core/time';
import { Material, type Terrain } from '../terrain/terrain';
import { Barrel } from '../weapons/barrel';
import { Crate } from '../weapons/crate';
import { explode } from '../weapons/explosion';
import { Mine } from '../weapons/mine';
import type { Ruleset } from '../weapons/ruleset';
import { isRemoteControlled, type WeaponDef } from '../weapons/weapon';
import { Entity } from '../world/entity';
import { Gravestone } from '../world/gravestone';
import { World } from '../world/world';
import { Worm } from '../worm/worm';
import type { Command } from './commands';
import { weaponSetting, type Scheme } from './scheme';

/** Simulation ticks per second. */
export { TPS };
/** Aim speed, radians per tick (W:A: about 1.5 s from straight down to straight up). */
export const AIM_SPEED = HALF_PI / 38;
/** Ticks to charge the power bar fully. */
export const CHARGE_TICKS = 55;
/** Ticks everything must stay still before the turn is over. */
const SETTLE_TICKS = 12;
/** Give up waiting for things to stop moving after this long. */
const MAX_SETTLE_TICKS = 20 * TPS;
const DEATH_DELAY = 35;
const POISON_DAMAGE = 5;

export type Phase = 'crate' | 'ready' | 'turn' | 'retreat' | 'settling' | 'dying' | 'gameover';

export interface TeamSetup {
  name: string;
  worms: string[];
  /** Computer-controlled: never makes anyone wait for a hot-seat hand-over. */
  cpu?: boolean;
}

export interface GameSetup {
  seed: number;
  scheme: Scheme;
  /** The weapons of this match (data from content; sim never reaches for a global table). */
  rules: Ruleset;
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
    readonly cpu = false,
  ) {}
}

export class Game {
  readonly world: World;
  readonly scheme: Scheme;
  readonly rules: Ruleset;
  readonly teams: Team[];
  readonly cavern: boolean;
  /** Two or more human teams share the keyboard: the hand-over wait applies to them. */
  readonly hotSeat: boolean;
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
  /** Once-per-turn utilities already used this turn. */
  private utilitiesUsed: string[] = [];
  /** Entity currently steered by the player (sheep), 0 if none. */
  controlledId = 0;
  /** Whether losing the controlled entity starts the retreat (sheep) or not (rope). */
  private controlledEndsTurn = true;
  /** Arrow keys as last sent by the player. */
  private held = { left: false, right: false, up: false, down: false };

  /** Entity the camera should follow. Presentation only. */
  focusId = 0;
  private baseDamageScale = 1;
  private settleTicks = 0;
  private settleTotal = 0;
  private dyingQueue: number[] = [];
  private turnStartDamage = 0;

  constructor(setup: GameSetup) {
    this.scheme = setup.scheme;
    this.rules = setup.rules;
    this.cavern = setup.cavern ?? false;
    this.hotSeat = setup.teams.filter((t) => !t.cpu).length >= 2;
    this.world = new World({
      seed: setup.seed,
      terrain: setup.terrain,
      waterLevel: setup.waterLevel,
      physics: { fallDamage: this.scheme.fallDamage, ...this.scheme.physics },
    });
    if (this.scheme.indestructible) {
      const d = setup.terrain.data;
      for (let i = 0; i < d.length; i++) if (d[i] === Material.Soil) d[i] = Material.Rock;
      setup.terrain.markAllDirty();
    }
    this.roundTimer = Math.round(this.scheme.roundTime * TPS);
    this.teams = setup.teams.map((t, i) => {
      const team = new Team(i, t.name, t.cpu ?? false);
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
    this.baseDamageScale = this.world.physics.damageScale;
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
    return this.rules.get(this.weaponId);
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
    const def = this.rules.get(id);
    const team = this.teams[this.activeTeam];
    if (!def || !team) return false;
    const ammo = team.ammo[id] ?? 0;
    if (ammo === 0) return false;
    if (def.oncePerTurn && this.utilitiesUsed.includes(id)) return false;
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
      this.phase === 'crate' ||
      this.phase === 'ready' ||
      this.phase === 'turn' ||
      this.phase === 'retreat';
    if (!controllable) return;
    if (this.phase === 'crate') {
      // While the crate falls the player may pick a weapon and aim, but nothing acts yet. Fire or
      // jump cancels the wait: the turn starts while the crate is still coming down (the shot itself
      // is dropped, it would otherwise go off before the player sees the turn begin).
      switch (c.t) {
        case 'fire':
          if (c.down) this.beginReady();
          return;
        case 'jump':
          this.beginReady();
          return;
        case 'skip':
        case 'surrender':
          return;
      }
    }
    // Any input during the hot-seat delay starts the turn.
    if (this.phase === 'ready' && c.t !== 'move') this.beginTurnTimer();
    const team = this.teams[this.activeTeam] as Team;

    switch (c.t) {
      case 'move': {
        this.held = { left: c.left, right: c.right, up: c.up, down: c.down };
        this.applyHeld(worm);
        if (this.phase === 'ready' && (c.left || c.right || c.up || c.down)) this.beginTurnTimer();
        break;
      }
      case 'jump':
        if (!this.scheme.artillery) worm.jump();
        break;
      case 'select':
        if (
          (this.phase === 'turn' || this.phase === 'crate') &&
          !this.charging &&
          !this.firedThisTurn &&
          this.canUse(c.weapon)
        ) {
          this.weaponId = c.weapon;
          team.lastWeapon = c.weapon;
          this.shotsLeft = this.rules.get(c.weapon)?.shots ?? 1;
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
      case 'ready':
        // Only hands the turn over (above): "Team X, press any key".
        break;
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

  /** Hands the held arrow keys to the worm: no walking in artillery, under a controlled entity, or while a crate falls. */
  private applyHeld(worm: Worm): void {
    const h = this.held;
    const walk = !this.scheme.artillery && !this.controlledId && this.phase !== 'crate';
    worm.control = { left: walk && h.left, right: walk && h.right, up: h.up, down: h.down };
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
    // A multi-shot weapon (shotgun, girder pack) costs its ammo once, on the first shot.
    const started = !!def && this.shotsLeft < (def.shots ?? 1);
    if (!def || (!started && !this.canUse(def.id))) return;
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
      baseDamageScale: this.baseDamageScale,
      focus: (id) => (this.focusId = id),
      switchWorm: (id) => this.switchWorm(id),
      control: (id) => {
        // A movement tool (rope, bungee, jet pack) replacing another one lets the old one go,
        // otherwise it would stay alive with stale keys. Sheep and the like are left to run.
        if (def.endsTurn === false && this.controlledId && this.controlledId !== id) {
          this.releaseTool(this.world.byId(this.controlledId));
        }
        this.controlledId = id;
        this.controlledEndsTurn = def.endsTurn !== false;
        this.focusId = id;
        worm.control = { left: false, right: false, up: false, down: false };
      },
    });
    if (def.oncePerTurn) this.utilitiesUsed.push(def.id);
    this.world.emit({ type: 'fired', wormId: worm.id, weapon: def.id });
    const ammo = team.ammo[def.id] ?? 0;
    if (ammo > 0 && this.shotsLeft === (def.shots ?? 1)) team.ammo[def.id] = ammo - 1;
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

  /** Select Worm: another worm of the active team takes over the rest of the turn. */
  private switchWorm(id: number): void {
    const next = this.world.byId(id);
    const cur = this.activeWorm;
    if (!(next instanceof Worm) || !next.alive || !cur || next.team !== cur.team) return;
    cur.control = { left: false, right: false, up: false, down: false };
    this.activeWormId = id;
    this.turnStartDamage = next.pendingDamage;
    this.focusId = id;
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
    if (this.phase === 'turn' || this.phase === 'ready' || this.phase === 'crate') {
      if (worm.control.up) worm.aim = Math.min(HALF_PI, worm.aim + AIM_SPEED);
      if (worm.control.down) worm.aim = Math.max(-HALF_PI, worm.aim - AIM_SPEED);
    }
    if (this.charging) {
      this.power += 1 / CHARGE_TICKS;
      if (this.power >= 1) this.fire(worm, 1);
    }
  }

  private tickPhase(): void {
    this.collectCrates();
    // Once the thing we were watching has landed or exploded, look back at the active worm.
    const focus = this.world.byId(this.focusId);
    if ((!focus || (!(focus instanceof Worm) && !focus.isBusy())) && this.activeWormId) {
      this.focusId = this.activeWormId;
    }
    const worm = this.activeWorm;
    switch (this.phase) {
      case 'crate':
        this.settleTotal++;
        this.settleTicks = this.world.isBusy() ? 0 : this.settleTicks + 1;
        if (this.settleTicks >= SETTLE_TICKS || this.settleTotal > MAX_SETTLE_TICKS)
          this.beginReady();
        break;
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

  /** Applies the contents of crates picked up this tick. */
  private collectCrates(): void {
    for (const c of this.world.ofKind<Crate>('crate')) {
      if (!c.collectorId) continue;
      const worm = this.world.byId(c.collectorId);
      c.removed = true;
      if (!(worm instanceof Worm)) continue;
      if (c.content === 'health') {
        worm.health += c.amount;
        worm.shownHealth += c.amount;
        worm.poisoned = false;
        this.world.emit({ type: 'crate', wormId: worm.id, text: `+${c.amount}` });
      } else {
        const team = this.teams[worm.team];
        if (team) {
          const ammo = team.ammo[c.weaponId] ?? 0;
          if (ammo >= 0) team.ammo[c.weaponId] = ammo + 1;
        }
        this.world.emit({ type: 'crate', wormId: worm.id, text: c.weaponId });
      }
      this.world.emit({ type: 'sound', id: 'collect', x: c.x, y: c.y });
    }
  }

  /** Maybe drops a crate at the start of a turn. */
  private dropCrate(): boolean {
    const s = this.scheme;
    if (s.crateChance <= 0 || !this.world.rng.chance(s.crateChance / 100)) return false;
    const rng = this.world.rng;
    const x = rng.range(40, this.world.terrain.width - 40);
    const weights = Object.entries(s.weapons).filter(([, w]) => w.crate > 0);
    const total = weights.reduce((n, [, w]) => n + w.crate, 0);
    let crate: Crate;
    if (total > 0 && !rng.chance(s.healthCrateShare)) {
      let pick = rng.float() * total;
      let id = (weights[0] as [string, unknown])[0];
      for (const [wid, w] of weights) {
        pick -= w.crate;
        if (pick < 0) {
          id = wid;
          break;
        }
      }
      crate = new Crate(x, -40, 'weapon', id, 1);
    } else {
      crate = new Crate(x, -40, 'health', '', s.healthCrate);
    }
    this.world.spawn(crate);
    this.focusId = crate.id;
    return true;
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
    // Tools used alongside an attack (a rope under a gun burst) are not controlled any more either.
    for (const t of this.world.all()) this.releaseTool(t);
    this.phase = 'settling';
    this.settleTicks = 0;
    this.settleTotal = 0;
  }

  /** Lets go of a movement tool (rope, bungee, jet pack): it has a `weaponId`, sheep do not. */
  private releaseTool(e: unknown): void {
    if (e instanceof Entity && !e.removed && isRemoteControlled(e) && e.weaponId) {
      e.timeout?.(this.world);
    }
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
      this.world.emit({ type: 'death', wormId: worm.id, x: worm.cx, y: worm.cy, team: worm.team });
      explode(this.world, worm.cx, worm.cy, { crater: 16, radius: 34, damage: 20 }, 'worm-death');
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
      for (const w of alive[0] ? this.teamWorms(alive[0]) : []) {
        if (w.alive) this.world.emit({ type: 'speech', wormId: w.id, line: 'win' });
      }
      this.world.emit(
        alive[0]
          ? { type: 'message', key: 'win', team: alive[0].index }
          : { type: 'message', key: 'draw' },
      );
      return;
    }
    if (!this.suddenDeath && this.roundTimer <= 0) this.startSuddenDeath();
    this.startTurn();
  }

  private startSuddenDeath(): void {
    this.suddenDeath = true;
    this.world.emit({ type: 'message', key: 'suddenDeath' });
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
    // Freeze wears off when its team's turn comes round again; utilities last one turn.
    for (const w of worms) w.invulnerable = false;
    for (const w of this.worms) {
      w.fastWalk = w.lowGravity = w.laser = w.invisible = w.crateSpy = false;
    }
    this.world.physics.damageScale = this.baseDamageScale;
    this.activeWormId = worm?.id ?? 0;
    this.turnStartDamage = worm?.pendingDamage ?? 0;
    if (this.scheme.wind > 0) {
      // W:A: 21 distinct strengths, and the wind is (almost) never the same on two consecutive turns.
      let next = this.world.wind;
      for (let i = 0; i < 8 && next === this.world.wind; i++) {
        next = (this.world.rng.int(-10, 10) / 10) * this.scheme.wind;
      }
      this.world.wind = next;
    }

    this.weaponId = this.defaultWeapon(team);
    this.shotsLeft = this.weapon?.shots ?? 1;
    this.charging = false;
    this.power = 0;
    this.target = null;
    this.firedThisTurn = false;
    this.utilitiesUsed = [];
    // Keys pressed before the turn are the previous player's; only keys sent from now on count.
    this.held = { left: false, right: false, up: false, down: false };
    this.focusId = this.activeWormId;
    if (this.activeWormId)
      this.world.emit({ type: 'speech', wormId: this.activeWormId, line: 'turn' });
    team.turnsTaken++;
    // As in W:A, a falling crate holds the turn back until it has landed.
    if (this.dropCrate()) {
      this.phase = 'crate';
      this.settleTicks = 0;
      this.settleTotal = 0;
      return;
    }
    this.beginReady();
  }

  /**
   * What is in hand when the turn starts, so the first Space always does something: the team's last
   * choice, else the bazooka, else the first usable attack in panel order.
   */
  private defaultWeapon(team: Team): string {
    if (team.lastWeapon && this.canUse(team.lastWeapon)) return team.lastWeapon;
    if (this.canUse('bazooka')) return 'bazooka';
    const first = this.rules.weapons.find(
      (w) => !w.action && !w.id.startsWith('test-') && this.canUse(w.id),
    );
    return first?.id ?? '';
  }

  /** The hot-seat wait is only for a human team handing over the keyboard to another human. */
  get waitsForHandOver(): boolean {
    const team = this.teams[this.activeTeam];
    return this.hotSeat && !!team && !team.cpu;
  }

  private beginReady(): void {
    this.phase = 'ready';
    // A crate that is still coming down (the player did not wait) keeps the camera until it lands.
    const watched = this.world.byId(this.focusId);
    if (!watched || watched instanceof Worm || !watched.isBusy()) this.focusId = this.activeWormId;
    const worm = this.activeWorm;
    if (worm) this.applyHeld(worm);
    this.timer = this.waitsForHandOver ? Math.round(this.scheme.hotSeatTime * TPS) : 0;
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
    h.bool(this.suddenDeath).u32((this.winner ?? -2) + 2);
    h.f64(this.fuseSeconds).bool(this.bounceHigh).value(this.target).u32(this.shotsLeft);
    h.bool(this.firedThisTurn).value(this.held).f64(this.baseDamageScale);
    h.value(this.utilitiesUsed);
    h.bool(this.hotSeat);
    h.u32(this.settleTicks).u32(this.settleTotal).f64(this.turnStartDamage);
    h.u32(this.dyingQueue.length);
    for (const id of this.dyingQueue) h.u32(id);
    for (const t of this.teams) {
      h.bool(t.cpu)
        .u32(t.nextWorm)
        .u32(t.turnsTaken)
        .bool(t.surrendered)
        .str(t.lastWeapon)
        .value(t.ammo);
      for (const id of t.wormIds) h.u32(id);
    }
  }
}
