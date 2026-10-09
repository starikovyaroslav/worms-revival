import { svg } from './lib.mjs';

// Pre-rendered worm poses for the retro look. Each frame is two SVGs on a 96×96 canvas
// (4 units = 1 final pixel, so it becomes a 24×24 sprite): the body with its face, and the
// bandana on its own so the game can tint it with the team colour.
// Colours are taken straight from the DB32 palette so nothing shifts when quantised.

const P = {
  out: '#222034',
  skin: '#eec39a',
  skinSh: '#d9a066',
  crease: '#8f563b',
  white: '#ffffff',
  mouth: '#ac3232',
  tongue: '#d95763',
  blush: '#d95763',
  bandHi: '#ffffff',
  bandMid: '#cbdbfc',
  bandSh: '#9badb7',
  bandDeep: '#847e87',
};

const U = 4; // units per pixel
const OX = 48;
const OY = 88; // feet

const X = (x) => OX + x * U;
const Y = (y) => OY + y * U;
const f1 = (n) => Number(n.toFixed(2));

function bezier(a, b, c, t) {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * b[0] + t * t * c[0],
    u * u * a[1] + 2 * u * t * b[1] + t * t * c[1],
  ];
}

/** Spine points and radii (px, relative to the feet), same shape as the in-game procedural worm. */
function spine(o) {
  const tail = [-6.5 + (o.tailShift ?? 0), -3];
  const mid = [-2.6 + (o.midShift ?? 0), -3 - (o.hump ?? 0)];
  const lift = (o.stretch ?? 0) + (o.breathe ?? 0);
  const neck = [1.2 + (o.lean ?? 0), -11 - lift];
  const head = [2.0 + (o.lean ?? 0) * 1.2, -15.4 - lift];
  const fat = 1 + (o.squash ?? 0) * 0.16;
  const pts = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const [x, y] = bezier(tail, mid, neck, t);
    pts.push({ x, y, r: (2.6 + t * 2.9) * fat, t });
  }
  return { pts, head, neck, fat };
}

function bodyShapes(sp) {
  const { pts, head, fat } = sp;
  const circles = [...pts, { x: head[0], y: head[1], r: 5.1 * fat }];
  // Three passes give a clean cel-shaded volume: shade, base, highlight.
  const c = (dx, dy, k, color) =>
    circles
      .map(
        (p) =>
          `<circle cx="${f1(X(p.x + dx))}" cy="${f1(Y(p.y + dy))}" r="${f1(p.r * k * U)}" fill="${color}"/>`,
      )
      .join('');
  return c(0, 0, 1, P.skinSh) + c(-0.35, -0.45, 0.82, P.skin);
}

function creases(sp) {
  let out = '';
  for (let i = 3; i < sp.pts.length - 2; i += 3) {
    const a = sp.pts[i - 1];
    const b = sp.pts[i + 1];
    const p = sp.pts[i];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const r = p.r * 0.8;
    out += `<path d="M ${f1(X(p.x - nx * r))} ${f1(Y(p.y - ny * r))} L ${f1(X(p.x + nx * r))} ${f1(Y(p.y + ny * r))}" stroke="${P.crease}" stroke-width="${U * 0.55}" stroke-linecap="round"/>`;
  }
  return out;
}

function face(sp, o) {
  const [hx, hy] = sp.head;
  const eye = o.eye ?? 'open';
  const look = o.look ?? [0.5, 0];
  const E = [
    [hx + 0.7, hy - 1.1],
    [hx + 3.3, hy - 1.2],
  ];
  let out = '';
  for (const [ex, ey] of E) {
    const cx = X(ex);
    const cy = Y(ey);
    if (eye === 'closed') {
      out += `<path d="M ${cx - 6} ${cy} Q ${cx} ${cy + 6} ${cx + 6} ${cy}" stroke="${P.out}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    } else if (eye === 'dead') {
      out += `<path d="M ${cx - 5} ${cy - 5} L ${cx + 5} ${cy + 5} M ${cx + 5} ${cy - 5} L ${cx - 5} ${cy + 5}" stroke="${P.out}" stroke-width="3" stroke-linecap="round"/>`;
    } else {
      const rx = eye === 'wide' ? 8 : 7;
      const ry = eye === 'wide' ? 9.5 : eye === 'half' ? 5 : 8.5;
      out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${P.white}" stroke="${P.out}" stroke-width="2"/>`;
      const pr = eye === 'wide' ? 2.8 : 3.8;
      out += `<circle cx="${cx + look[0] * 3}" cy="${cy + look[1] * 3}" r="${pr}" fill="${P.out}"/>`;
    }
  }
  // Brows.
  const brow = o.brow ?? 'neutral';
  const by = hy - 3.9;
  const bd = {
    neutral: [
      [-1, 0],
      [1.2, -0.3],
      [2.4, -0.2],
      [4.6, 0.2],
    ],
    angry: [
      [-0.4, -0.8],
      [1.8, 0.2],
      [2.4, 0.1],
      [4.8, -0.9],
    ],
    worried: [
      [-0.4, 0.2],
      [1.8, -0.7],
      [2.4, -0.7],
      [4.8, 0.3],
    ],
  }[brow];
  if (brow !== 'none') {
    out += `<path d="M ${X(hx + bd[0][0])} ${Y(by + bd[0][1])} L ${X(hx + bd[1][0])} ${Y(by + bd[1][1])} M ${X(hx + bd[2][0])} ${Y(by + bd[2][1])} L ${X(hx + bd[3][0])} ${Y(by + bd[3][1])}" stroke="${P.out}" stroke-width="3" stroke-linecap="round"/>`;
  }
  // Mouth.
  const mx = X(hx + 2.6);
  const my = Y(hy + 2.3);
  const mouth = o.mouth ?? 'smile';
  if (mouth === 'smile') {
    out += `<path d="M ${mx - 7} ${my - 1} Q ${mx} ${my + 6} ${mx + 7} ${my - 1}" stroke="${P.out}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  } else if (mouth === 'open') {
    out += `<path d="M ${mx - 7} ${my - 2} Q ${mx} ${my - 2} ${mx + 7} ${my - 2} Q ${mx + 5} ${my + 8} ${mx} ${my + 8} Q ${mx - 5} ${my + 8} ${mx - 7} ${my - 2} Z" fill="${P.mouth}" stroke="${P.out}" stroke-width="2"/><ellipse cx="${mx}" cy="${my + 6}" rx="3.5" ry="2" fill="${P.tongue}"/>`;
  } else if (mouth === 'scream') {
    out += `<ellipse cx="${mx}" cy="${my + 2}" rx="6" ry="8" fill="${P.mouth}" stroke="${P.out}" stroke-width="2"/><ellipse cx="${mx}" cy="${my + 6}" rx="3.8" ry="2.4" fill="${P.tongue}"/>`;
  } else if (mouth === 'grit') {
    out += `<rect x="${mx - 7}" y="${my - 3}" width="14" height="7" rx="2" fill="${P.white}" stroke="${P.out}" stroke-width="2"/><path d="M ${mx - 2} ${my - 3} L ${mx - 2} ${my + 4} M ${mx + 3} ${my - 3} L ${mx + 3} ${my + 4}" stroke="${P.out}" stroke-width="1.5"/>`;
  } else if (mouth === 'dead') {
    out += `<path d="M ${mx - 7} ${my} Q ${mx} ${my - 3} ${mx + 7} ${my}" stroke="${P.out}" stroke-width="3" fill="none"/><rect x="${mx - 1.5}" y="${my}" width="5" height="8" rx="2.5" fill="${P.tongue}" stroke="${P.out}" stroke-width="2"/>`;
  }
  // Rosy cheek.
  out += `<ellipse cx="${X(hx - 0.8)}" cy="${Y(hy + 1.6)}" rx="4" ry="2.6" fill="${P.blush}" opacity="0.55"/>`;
  return out;
}

function bandana(sp) {
  const i = 11;
  const a = sp.pts[i - 1];
  const b = sp.pts[i + 1];
  const p = sp.pts[i];
  const tx = b.x - a.x;
  const ty = b.y - a.y;
  const len = Math.hypot(tx, ty) || 1;
  const tnx = tx / len;
  const tny = ty / len;
  const nx = -tny;
  const ny = tnx;
  const w = 1.5; // half the band length along the spine
  const r = p.r + 0.5;
  const q = (s, n) => `${f1(X(p.x + tnx * s + nx * n))} ${f1(Y(p.y + tny * s + ny * n))}`;
  let out = `<path d="M ${q(-w, -r)} L ${q(w, -r)} L ${q(w, r)} L ${q(-w, r)} Z" fill="${P.bandMid}"/>`;
  out += `<path d="M ${q(-w, 0)} L ${q(w, 0)} L ${q(w, r)} L ${q(-w, r)} Z" fill="${P.bandSh}"/>`;
  out += `<path d="M ${q(-w, -r)} L ${q(-w + 0.6, -r)} L ${q(-w + 0.6, r)} L ${q(-w, r)} Z" fill="${P.bandHi}"/>`;
  // Knot and trailing tails at the back-bottom.
  const kx = X(p.x - nx * (r - 0.6) - tnx * 0.4);
  const ky = Y(p.y - ny * (r - 0.6) - tny * 0.4);
  out += `<circle cx="${f1(kx)}" cy="${f1(ky)}" r="5" fill="${P.bandMid}"/>`;
  out += `<path d="M ${f1(kx)} ${f1(ky)} L ${f1(kx - 14)} ${f1(ky + 6)} L ${f1(kx - 6)} ${f1(ky + 12)} Z" fill="${P.bandSh}"/>`;
  out += `<path d="M ${f1(kx)} ${f1(ky)} L ${f1(kx - 4)} ${f1(ky + 16)} L ${f1(kx + 5)} ${f1(ky + 10)} Z" fill="${P.bandDeep}"/>`;
  return out;
}

/** One frame: { body, band } SVG strings. `rotate` spins the whole worm (tumbling). */
export function wormFrame(o = {}) {
  const sp = spine(o);
  const wrap = (inner) => {
    const spin = o.rotate
      ? `<g transform="rotate(${o.rotate} ${OX} ${OY - 7 * U})">${inner}</g>`
      : inner;
    return svg(96, 96, spin);
  };
  return {
    body: wrap(bodyShapes(sp) + creases(sp) + face(sp, o)),
    band: wrap(bandana(sp)),
  };
}

const TAU = Math.PI * 2;

/** All animation frames: name → options. Mirrored in code for facing left. */
export function wormPoses() {
  const poses = {};
  for (let i = 0; i < 4; i++) {
    poses[`idle_${i}`] = { breathe: Math.sin((i / 4) * TAU) * 0.55, eye: 'open', mouth: 'smile' };
  }
  poses.idle_blink = { eye: 'closed', mouth: 'smile' };
  for (let i = 0; i < 15; i++) {
    const phase = (i / 15) * TAU;
    poses[`walk_${i}`] = {
      hump: Math.max(0, Math.sin(phase)) * 3.2,
      tailShift: Math.sin(phase) * 1.2,
      lean: 0.6,
      eye: 'open',
      mouth: 'smile',
    };
  }
  poses.jump = { stretch: 2.4, squash: -1, lean: 0.8, eye: 'wide', mouth: 'open' };
  poses.fall = {
    stretch: 3,
    squash: -1.2,
    lean: 0.4,
    eye: 'wide',
    mouth: 'scream',
    brow: 'worried',
  };
  poses.land = { stretch: -2.6, squash: 2, eye: 'half', mouth: 'grit', brow: 'angry' };
  poses.hurt_0 = { stretch: -1.5, squash: 1.2, eye: 'closed', mouth: 'grit', brow: 'angry' };
  poses.hurt_1 = { stretch: 1, squash: -0.5, eye: 'wide', mouth: 'scream', brow: 'worried' };
  for (let i = 0; i < 4; i++) {
    poses[`win_${i}`] = {
      stretch: [0, 2.4, 0.6, 2.4][i],
      squash: [0.6, -0.8, 0.2, -0.8][i],
      eye: i % 2 ? 'closed' : 'open',
      mouth: 'open',
      brow: 'neutral',
    };
  }
  for (let i = 0; i < 8; i++) {
    poses[`tumble_${i}`] = {
      stretch: 1,
      squash: -0.4,
      eye: 'wide',
      mouth: 'scream',
      brow: 'worried',
      rotate: i * 45,
    };
  }
  return poses;
}
