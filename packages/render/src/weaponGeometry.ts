import type { SkinRig, WeaponMount } from './weaponMounts';

export interface Point {
  x: number;
  y: number;
}
export interface HeldGeometry {
  grip: Point;
  support: Point | null;
  barrel: Point;
  rotation: number;
}
export function rotatePoint(p: Point, angle: number): Point {
  return {
    x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
    y: p.x * Math.sin(angle) + p.y * Math.cos(angle),
  };
}
/** The wrist is the pivot, not the centre of the PNG. Barrel and both hands share one transform. */
export function heldGeometry(
  mount: WeaponMount,
  rig: SkinRig,
  aim: number,
  aspect: number,
): HeldGeometry {
  const point =
    mount.mode === 'heavy' ? rig.lowHand : mount.mode === 'placed' ? rig.lowHand : rig.hand;
  let grip = { x: point[0], y: point[1] };
  const rotation = mount.aim ? -aim : (mount.angle ?? 0);
  const height = mount.width / aspect;
  const barrelOffset = rotatePoint(
    { x: 0, y: ((mount.barrelY ?? 0.4) - mount.grip[1]) * height },
    rotation,
  );
  if (mount.aim) {
    // Simulation shoots from worm.cy (feet - 6.5), not from the decorative shoulder.
    // Solve the moving wrists around that SAME axis: cosmetic anatomy cannot move a shot.
    const reach = Math.min(8, Math.max(5, point[0]));
    const offset = rotatePoint({ x: reach, y: 0 }, rotation);
    grip = { x: offset.x - barrelOffset.x, y: -6.5 + offset.y - barrelOffset.y };
  }
  const twoHanded = ['longgun', 'shoulder', 'heavy', 'tool'].includes(mount.mode);
  const frontOffset = rotatePoint(
    { x: mount.width * (mount.mode === 'shoulder' ? 0.16 : 0.19), y: 0 },
    rotation,
  );
  return {
    grip,
    support: twoHanded ? { x: grip.x + frontOffset.x, y: grip.y + frontOffset.y } : null,
    barrel: { x: grip.x + barrelOffset.x, y: grip.y + barrelOffset.y },
    rotation,
  };
}
/** Two-segment arm; positive bend keeps the elbow below the gun. */
export function armElbow(shoulder: Point, wrist: Point): Point {
  const dx = wrist.x - shoulder.x,
    dy = wrist.y - shoulder.y;
  const distance = Math.max(0.001, Math.hypot(dx, dy));
  const length = Math.max(5, distance * 0.56);
  const bend = Math.sqrt(Math.max(0, length * length - (distance * distance) / 4));
  return {
    x: (shoulder.x + wrist.x) / 2 - (dy / distance) * bend,
    y: (shoulder.y + wrist.y) / 2 + (dx / distance) * bend,
  };
}
/** Frame-rate independent presentation interpolation, reset on equipment/facing changes. */
export function smoothAim(current: number, target: number, seconds: number): number {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, seconds) / 0.028));
}
