import { Container, Graphics, Sprite } from 'pixi.js';
import type { Worm, WormMotionEvent } from '@wr/sim';
import { assets } from './assets';
import { scaleArt } from './views/common';
import { SKIN_MOTION, skinById, type SkinId, type SkinPose } from './skins';
import { WEAPON_MOUNTS, rigForSkin } from './weaponMounts';
import { heldGeometry, armElbow, smoothAim } from './weaponGeometry';
import {
  WormReactions,
  REACTION_CLIPS,
  reactionDeformation,
  type ReactionFrame,
} from './wormReactions';

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
  private arms = new Graphics();
  private hands = new Graphics();
  private armParts = new Container();
  private palmParts = new Container();
  private segments = Array.from({ length: 4 }, () => new Sprite());
  private palms = Array.from({ length: 2 }, () => new Sprite());
  private reactions = new WormReactions();
  private reaction: ReactionFrame | null = null;
  private drawnReaction = false;
  private aimAngle: number | null = null;
  private equipmentKey = '';
  /** Local-to-worm ray used by the crosshair, aligned with the rendered barrel. */
  aimRay: { x: number; y: number; angle: number } | null = null;
  private ground = new Container();
  private mortarBase = new Sprite();
  private mortarBarrel = new Sprite();
  private canopy = new Sprite();
  private team = new Graphics();
  private clock = 0;
  private sampledTime: number | null = null;
  private action: { weapon: string; time: number; start: number } | null = null;
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
    this.armParts.addChild(...this.segments);
    this.palmParts.addChild(...this.palms);
    this.rig.addChild(
      this.body,
      this.arms,
      this.armParts,
      this.weapon,
      this.hands,
      this.palmParts,
      this.team,
    );
    this.ground.addChild(this.mortarBase, this.mortarBarrel);
    this.container.addChild(this.rig, this.ground, this.canopy);
  }
  static create(id: unknown, color: number): SkinActor | null {
    const skin = skinById(id);
    return skin && assets.has(`skins/${skin.id}/idle`) ? new SkinActor(skin.id, color) : null;
  }
  playAct(weapon: string, simulationSeconds = this.clock): void {
    this.action = { weapon, time: 0, start: simulationSeconds };
  }
  motion(event: WormMotionEvent): void {
    this.reactions.handle(event);
  }
  update(
    w: Worm,
    dtMs: number,
    hold: string,
    end?: 'win' | 'defeat',
    waterLevel?: number,
    simulationSeconds?: number,
  ): void {
    const now = simulationSeconds ?? this.clock + Math.max(0, dtMs) / 1000;
    const dt =
      simulationSeconds === undefined
        ? Math.max(0, dtMs) / 1000
        : this.sampledTime === null
          ? 0
          : Math.max(0, now - this.sampledTime);
    this.sampledTime = now;
    this.clock = now;
    this.reaction = this.reactions.update(w, now);
    const key = `${hold}/${w.facing}`;
    this.aimAngle =
      this.aimAngle === null || key !== this.equipmentKey || dt === 0 || this.action?.time === 0
        ? w.aim
        : smoothAim(this.aimAngle, w.aim, dt);
    this.equipmentKey = key;
    if (this.action) {
      this.action.time = Math.max(0, now - this.action.start);
      if (this.action.time >= 0.42) this.action = null;
    }
    this.death = w.alive ? 0 : this.death + dt;
    this.container.visible = w.drowned
      ? this.reaction?.clip === 'water'
      : w.alive || this.death < 0.7;
    this.pose = chooseSkinPose({
      health: w.health,
      state: w.state,
      vy: w.vy,
      walkFrame: w.walkFrame,
      blasted: w.blasted,
      hurt: false,
      landing: false,
      blink: this.clock % 3.7 > 3.58,
      hold,
      holdPose: WEAPON_MOUNTS.get(hold)?.pose ?? 'idle',
      ...(this.action ? { action: actionPose(this.action.weapon) } : {}),
      ...(end ? { end } : {}),
    });
    if (w.invulnerable) this.pose = 'idle';
    // Aim atlas poses already contain fixed outstretched arms. Use the neutral torso underneath
    // the articulated assembly, avoiding two extra painted fists floating beside the new wrists.
    if (this.pose === 'aim') this.pose = 'idle';
    if (this.reaction && !w.invulnerable) this.pose = REACTION_CLIPS[this.reaction.clip].fallback;
    const reactionTexture =
      this.reaction && !w.invulnerable
        ? assets.get(`reactions/${this.id}/${this.reaction.clip}_${this.reaction.frame}`)
        : undefined;
    this.drawnReaction = !!reactionTexture;
    const weaponId = this.action?.weapon ?? hold;
    const mount = WEAPON_MOUNTS.get(weaponId);
    const heldTorso =
      mount &&
      mount.width > 0 &&
      !['grounded', 'none', 'backpack'].includes(mount.mode) &&
      !['jump', 'fall', 'rope', 'hurt', 'throw', 'defeat', 'win'].includes(this.pose) &&
      !(this.action && mount.mode === 'placed') &&
      !this.reaction &&
      !w.invulnerable &&
      w.alive &&
      !end
        ? assets.get(`rig/body/${this.id}`)
        : undefined;
    this.body.texture =
      reactionTexture ??
      heldTorso ??
      assets.get(`skins/${this.id}/${this.pose}`) ??
      assets.get(`skins/${this.id}/idle`)!;
    scaleArt(this.body);
    this.animate(w, hold, end);
    if (this.reaction?.clip === 'water' && waterLevel !== undefined)
      this.rig.y = waterLevel - w.y + this.reaction.progress * 19;
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
    const deformation = reactionDeformation(
      this.drawnReaction || w.invulnerable ? null : this.reaction,
    );
    this.body.scale.x *= deformation.x;
    this.body.scale.y *= deformation.y;
    this.rig.rotation += deformation.lean;
    this.rig.scale.x = w.facing;
    const weaponId = this.action?.weapon ?? hold;
    const mount = WEAPON_MOUNTS.get(weaponId),
      rig = rigForSkin(this.id);
    const texture =
      (mount?.texture ? assets.tight(mount.texture) : undefined) ??
      assets.tight(`skins/weapons/${weaponId}`) ??
      assets.tight(`weapons/icon/${weaponId}`);
    const equipped =
      w.alive &&
      !end &&
      !w.invulnerable &&
      !this.reaction &&
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
    this.arms.clear();
    this.hands.clear();
    this.armParts.visible = false;
    this.palmParts.visible = false;
    this.aimRay = null;
    if (texture && mount && this.weapon.visible) {
      this.weapon.texture = texture;
      this.weapon.anchor.set(...mount.grip);
      this.weapon.scale.set(mount.width / texture.width);
      const recoil = this.action
        ? Math.sin(Math.min(1, this.action.time / 0.42) * Math.PI) * p.recoil
        : 0;
      const geometry = heldGeometry(
        mount,
        rig,
        this.aimAngle ?? w.aim,
        texture.width / texture.height,
      );
      // One assembly: wrist, forearm, gun and barrel ray share the recoil and stride offsets.
      this.rig.rotation = 0;
      this.rig.y = 0;
      const recoilX = Math.cos(geometry.rotation) * recoil,
        recoilY = Math.sin(geometry.rotation) * recoil;
      this.weapon.position.set(geometry.grip.x - recoilX, geometry.grip.y - recoilY);
      this.weapon.rotation = geometry.rotation;
      const profile = skinById(this.id)!.profile;
      const glove = profile === 'dominant' || profile === 'nocturne';
      const material = glove
        ? 'leather'
        : profile === 'sick'
          ? 'pale'
          : profile === 'elder'
            ? 'elder'
            : 'orange';
      const upper = assets.tight(`rig/${material}/upper`),
        forearm = assets.tight(`rig/${material}/forearm`);
      const gripHand = assets.tight(`rig/${material}/grip`),
        supportHand = assets.tight(`rig/${material}/support`);
      const paintedArms = !!upper && !!forearm && !!gripHand && !!supportHand;
      this.armParts.visible = paintedArms;
      this.palmParts.visible = paintedArms;
      for (const part of [...this.segments, ...this.palms]) part.visible = false;
      const flesh = glove ? 0x282730 : profile === 'sick' ? 0xd5b393 : 0xf6a375;
      const outline = glove ? 0x101019 : 0x643324;
      for (const [index, wrist] of [geometry.support, geometry.grip].entries()) {
        if (!wrist) continue;
        const target = { x: wrist.x - recoilX, y: wrist.y - recoilY };
        const shoulder = { x: index ? 3 : 1, y: rig.hand[1] - 1 };
        const elbow = armElbow(shoulder, target);
        if (paintedArms) {
          const nodes = [shoulder, elbow, target];
          for (let joint = 0; joint < 2; joint++) {
            const sprite = this.segments[index * 2 + joint]!;
            const a = nodes[joint]!,
              b = nodes[joint + 1]!;
            sprite.texture = joint ? forearm : upper;
            sprite.anchor.set(0.05, 0.5);
            sprite.position.set(a.x, a.y);
            sprite.width = Math.hypot(b.x - a.x, b.y - a.y) + 1;
            sprite.height = index ? 3 : 2.7;
            sprite.rotation = Math.atan2(b.y - a.y, b.x - a.x);
            sprite.visible = true;
          }
          const palm = this.palms[index]!;
          palm.texture = index || mount.mode === 'shoulder' ? gripHand : supportHand;
          palm.anchor.set(0.74, 0.52);
          palm.position.set(target.x, target.y);
          const height = index ? 3.4 : 3.1;
          palm.scale.set(height / palm.texture.height);
          palm.rotation = geometry.rotation;
          palm.visible = true;
          continue;
        }
        const path = () =>
          this.arms
            .moveTo(shoulder.x, shoulder.y)
            .quadraticCurveTo(elbow.x, elbow.y, target.x, target.y);
        path().stroke({ color: outline, width: 3.8, cap: 'round' });
        path().stroke({ color: flesh, width: 2.8, cap: 'round' });
        this.hands
          .ellipse(target.x, target.y, 1.8, 2.1)
          .fill(flesh)
          .stroke({ color: outline, width: 0.45 });
        for (const dy of [-0.6, 0.2, 1])
          this.hands
            .moveTo(target.x + 0.1, target.y + dy)
            .lineTo(target.x + 1.3, target.y + dy)
            .stroke({ color: outline, width: 0.25, alpha: 0.65 });
      }
      if (mount.aim)
        this.aimRay = {
          x: (geometry.barrel.x - recoilX) * w.facing,
          y: geometry.barrel.y - recoilY,
          angle: this.aimAngle ?? w.aim,
        };
    }
    // This assembly is outside the breathing/stride rig: its supports stay on the world ground.
    const base = assets.tight('skins/equipment/mortar-base'),
      barrel = assets.tight('skins/equipment/mortar-barrel');
    this.ground.visible =
      !!base &&
      !!barrel &&
      mount?.mode === 'grounded' &&
      equipped &&
      w.grounded &&
      w.state !== 'walking';
    this.body.x = this.ground.visible ? -5 : 0;
    if (base && barrel && this.ground.visible) {
      this.ground.scale.x = w.facing;
      this.ground.position.set(0, 0);
      this.mortarBase.texture = base;
      this.mortarBase.anchor.set(0.5, 0.77);
      this.mortarBase.scale.set(20 / base.width);
      this.mortarBase.position.set(rig.ground[0] - 4, rig.ground[1]);
      this.mortarBarrel.texture = barrel;
      this.mortarBarrel.anchor.set(0.17, 0.5);
      this.mortarBarrel.scale.set(21 / barrel.width);
      this.mortarBarrel.position.set(0, -6.5);
      this.mortarBarrel.rotation = -(this.aimAngle ?? w.aim);
      this.aimRay = {
        x: 0,
        y: -6.5,
        angle: this.aimAngle ?? w.aim,
      };
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
