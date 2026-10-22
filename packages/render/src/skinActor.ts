import { Container, Graphics, Sprite } from 'pixi.js';
import type { Worm } from '@wr/sim';
import { assets } from './assets';
import { scaleArt } from './views/common';
import { SKIN_MOTION, skinById, type SkinId, type SkinPose } from './skins';
import { WEAPON_MOUNTS, rigForSkin } from './weaponMounts';

export function actionPose(weapon: string): SkinPose {
  if (weapon === 'surrender') return 'defeat';
  const mount = WEAPON_MOUNTS.get(weapon);
  return mount?.mode === 'throwable' ? 'throw' : (mount?.pose ?? 'idle');
}
export interface SkinPoseState {
  health: number;
  state: Worm['state'];
  vy: number;
  walkFrame: number;
  blasted: boolean;
  hurt: boolean;
  landing: boolean;
  blink: boolean;
  hold: string;
  holdPose?: SkinPose;
  action?: SkinPose;
  end?: 'win' | 'defeat';
}
/** Airborne/rope poses outrank held weapons, never replacing this identity with an old body. */
export function chooseSkinPose(s: SkinPoseState): SkinPose {
  if (s.health <= 0 || s.state === 'dead') return 'defeat';
  if (s.end) return s.end;
  if (s.state === 'roped') return 'rope';
  if (s.state === 'airborne') return s.vy < 0 && !s.blasted ? 'jump' : 'fall';
  if (s.hurt) return 'hurt';
  if (s.landing) return 'land';
  if (s.action) return s.action;
  if (s.state === 'walking') return `walk_${Math.floor(((s.walkFrame % 15) / 15) * 4)}` as SkinPose;
  if (s.hold) return s.holdPose ?? 'aim';
  return s.blink ? 'blink' : 'idle';
}

/** Painted identity-specific poses with secondary motion; this class never changes a sim object. */
export class SkinActor {
  readonly container = new Container();
  private rig = new Container();
  readonly body = new Sprite();
  private weapon = new Sprite();
  private ground = new Container();
  private mortarBase = new Sprite();
  private mortarBarrel = new Sprite();
  private canopy = new Sprite();
  private team = new Graphics();
  private clock = 0;
  private hurt = 0;
  private landing = 0;
  private health: number | null = null;
  private airborne = false;
  private action: { weapon: string; time: number } | null = null;
  private death = 0;
  pose: SkinPose = 'idle';
  readonly profile;
  constructor(
    readonly id: SkinId,
    color: number,
  ) {
    this.profile = SKIN_MOTION[skinById(id)!.profile];
    this.body.anchor.set(0.5, 29 / 32);
    this.weapon.anchor.set(0.25, 0.5);
    this.canopy.anchor.set(0.5, 1);
    this.team
      .roundRect(-1.5, -0.75, 3, 1.5, 0.4)
      .fill(color)
      .stroke({ color: 0x222034, width: 0.4 });
    this.team.position.set(0, -9);
    this.rig.addChild(this.body, this.weapon, this.team);
    this.ground.addChild(this.mortarBase, this.mortarBarrel);
    this.container.addChild(this.rig, this.ground, this.canopy);
  }
  static create(id: unknown, color: number): SkinActor | null {
    const skin = skinById(id);
    return skin && assets.has(`skins/${skin.id}/idle`) ? new SkinActor(skin.id, color) : null;
  }
  playAct(weapon: string): void {
    this.action = { weapon, time: 0 };
  }
  update(w: Worm, dtMs: number, hold: string, end?: 'win' | 'defeat'): void {
    const dt = Math.max(0, dtMs) / 1000;
    this.clock += dt;
    if (this.health !== null && w.health < this.health) this.hurt = 0.45;
    this.health = w.health;
    if (this.airborne && w.state !== 'airborne') this.landing = 0.18;
    this.airborne = w.state === 'airborne';
    this.hurt = Math.max(0, this.hurt - dt);
    this.landing = Math.max(0, this.landing - dt);
    if (this.action) {
      this.action.time += dt;
      if (this.action.time >= 0.42) this.action = null;
    }
    this.death = w.alive ? 0 : this.death + dt;
    this.container.visible = !w.drowned && (w.alive || this.death < 0.7);
    this.pose = chooseSkinPose({
      health: w.health,
      state: w.state,
      vy: w.vy,
      walkFrame: w.walkFrame,
      blasted: w.blasted,
      hurt: this.hurt > 0,
      landing: this.landing > 0,
      blink: this.clock % 3.7 > 3.58,
      hold,
      holdPose: WEAPON_MOUNTS.get(hold)?.pose ?? 'idle',
      ...(this.action ? { action: actionPose(this.action.weapon) } : {}),
      ...(end ? { end } : {}),
    });
    if (w.invulnerable) this.pose = 'idle';
    this.body.texture =
      assets.get(`skins/${this.id}/${this.pose}`) ?? assets.get(`skins/${this.id}/idle`)!;
    scaleArt(this.body);
    this.animate(w, hold, end);
  }
  private animate(w: Worm, hold: string, end?: 'win' | 'defeat'): void {
    const p = this.profile,
      walking = w.state === 'walking';
    const phase = walking ? (w.walkFrame / 15) * Math.PI * 2 : this.clock * p.breathe;
    const moving = w.alive && !w.invulnerable && !end,
      wave = moving ? Math.sin(phase) : 0;
    this.body.scale.y *= 1 + wave * (walking ? 0.012 : 0.006);
    this.rig.position.y = walking && moving ? -Math.abs(wave) * p.bob : 0;
    this.rig.rotation = walking && moving ? wave * p.lean : 0;
    if (w.blasted && w.state === 'airborne') this.rig.rotation = this.clock * 12;
    this.rig.scale.x = w.facing;
    const weaponId = this.action?.weapon ?? hold;
    const mount = WEAPON_MOUNTS.get(weaponId),
      rig = rigForSkin(this.id);
    const texture =
      (mount?.texture ? assets.get(mount.texture) : undefined) ??
      assets.get(`skins/weapons/${weaponId}`) ??
      assets.get(`weapons/icon/${weaponId}`);
    const equipped =
      w.alive &&
      !end &&
      !w.invulnerable &&
      !['jump', 'fall', 'rope', 'hurt', 'defeat'].includes(this.pose);
    this.weapon.visible =
      !!texture &&
      !!mount &&
      mount.width > 0 &&
      // Active backpacks are drawn by JetPackView; placed objects belong to their entity view
      // once released. Never keep a second copy attached to the character.
      !['grounded', 'none', 'backpack'].includes(mount.mode) &&
      !(this.action && mount.mode === 'placed') &&
      this.pose !== 'throw' &&
      equipped;
    if (texture && mount && this.weapon.visible) {
      this.weapon.texture = texture;
      this.weapon.anchor.set(...mount.grip);
      this.weapon.scale.set(mount.width / texture.width);
      const recoil = this.action
        ? Math.sin(Math.min(1, this.action.time / 0.42) * Math.PI) * p.recoil
        : 0;
      const point =
        mount.mode === 'shoulder'
          ? rig.shoulder
          : mount.mode === 'placed' || (mount.mode === 'tool' && mount.pose === 'land')
            ? rig.lowHand
            : rig.hand;
      // Move the launcher to the forward shoulder as it rises, keeping the face behind the tube.
      const shoulderClearance = mount.mode === 'shoulder' ? 5 + Math.abs(Math.sin(w.aim)) * 6 : 0;
      this.weapon.position.set(point[0] + shoulderClearance - recoil, point[1]);
      this.weapon.rotation = mount.aim ? -w.aim : (mount.angle ?? 0);
    }
    // This assembly is outside the breathing/stride rig: its supports stay on the world ground.
    const base = assets.get('skins/equipment/mortar-base'),
      barrel = assets.get('skins/equipment/mortar-barrel');
    this.ground.visible =
      !!base &&
      !!barrel &&
      mount?.mode === 'grounded' &&
      equipped &&
      w.grounded &&
      w.state !== 'walking';
    if (base && barrel && this.ground.visible) {
      this.ground.scale.x = w.facing;
      this.ground.position.set(0, 0);
      this.mortarBase.texture = base;
      this.mortarBase.anchor.set(0.5, 0.77);
      this.mortarBase.scale.set(20 / base.width);
      this.mortarBase.position.set(...rig.ground);
      this.mortarBarrel.texture = barrel;
      this.mortarBarrel.anchor.set(0.17, 0.5);
      this.mortarBarrel.scale.set(21 / barrel.width);
      this.mortarBarrel.position.set(rig.ground[0] - 1, rig.ground[1] - 3.5);
      this.mortarBarrel.rotation = -Math.max(0.15, Math.min(Math.PI / 2 - 0.05, w.aim));
    }
    const canopy = assets.get('objects/parachute');
    this.canopy.visible = !!canopy && w.chute && w.alive;
    if (canopy && this.canopy.visible) {
      this.canopy.texture = canopy;
      this.canopy.scale.set(24 / canopy.width);
      this.canopy.position.set(Math.sin(this.clock * 3) * 0.5, -22);
    }
    this.team.visible = w.alive;
    this.body.tint = w.invulnerable ? 0xb4e4ff : 0xffffff;
    this.weapon.tint = this.body.tint;
  }
}
