import { C, clipped, ol, shape, svg } from './lib.mjs';

// Objects and weapon art on a 128×128 canvas, three-quarter-free flat side view, lit from the
// top left. Each shape: base colour, one cool shadow step on the lower right, one highlight.

function grenade() {
  const body = 'M 64 38 C 98 36 104 70 96 94 C 88 116 40 116 32 94 C 24 70 30 40 64 38 Z';
  const inner =
    `<rect width="128" height="128" fill="${C.olive}"/>` +
    `<path d="M 128 60 C 108 70 100 96 80 128 L 128 128 Z" fill="${C.oliveSh}"/>` +
    // Fragmentation grooves.
    `<path d="M 30 70 Q 64 80 100 70 M 30 90 Q 64 100 98 90 M 52 40 Q 46 78 54 116 M 76 40 Q 82 78 74 116" fill="none" stroke="#3c5a28" stroke-width="3.5" opacity="0.6"/>` +
    `<path d="M 36 56 Q 40 46 52 44" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.75"/>` +
    `<ellipse cx="46" cy="60" rx="9" ry="14" fill="${C.oliveHi}" opacity="0.8" transform="rotate(-20 46 60)"/>`;
  return svg(
    128,
    128,
    clipped(body, inner) +
      `<path d="${body}" fill="none" ${ol(5)}/>` +
      // Fuse cap and lever.
      shape('M 50 36 L 50 24 Q 50 18 56 18 L 74 18 Q 80 18 80 24 L 80 36 Z', C.steel, 5) +
      `<path d="M 54 24 L 54 32" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.7"/>` +
      shape('M 78 24 Q 112 22 108 56 Q 106 66 98 62 Q 100 40 78 36 Z', C.steelSh, 5) +
      `<circle cx="95" cy="14" r="11" fill="none" stroke="${C.out}" stroke-width="10"/><circle cx="95" cy="14" r="11" fill="none" stroke="${C.yellow}" stroke-width="5"/>`,
  );
}

function dynamite() {
  const stick = (x, y, tilt) => {
    const d = `M ${x} ${y} L ${x + 26} ${y} L ${x + 26} ${y + 80} L ${x} ${y + 80} Z`;
    return (
      `<g transform="rotate(${tilt} ${x + 13} ${y + 40})">` +
      clipped(
        d,
        `<rect x="${x}" y="${y}" width="26" height="80" fill="${C.red}"/>` +
          `<rect x="${x + 17}" y="${y}" width="9" height="80" fill="${C.redSh}"/>` +
          `<rect x="${x + 4}" y="${y}" width="5" height="80" fill="${C.redHi}" opacity="0.9"/>`,
      ) +
      `<path d="${d}" fill="none" ${ol(5)}/></g>`
    );
  };
  return svg(
    128,
    128,
    stick(26, 36, -8) +
      stick(76, 36, 8) +
      stick(51, 30, 0) +
      // Tape bands.
      shape('M 22 66 L 106 64 L 106 80 L 22 82 Z', '#e0bb7a', 5) +
      `<path d="M 24 70 L 104 68" stroke="#fff" stroke-width="3" opacity="0.5" stroke-linecap="round"/>` +
      // Fuse and spark.
      `<path d="M 64 30 Q 60 14 76 10 Q 88 8 92 18" fill="none" ${ol(7)}/><path d="M 64 30 Q 60 14 76 10 Q 88 8 92 18" fill="none" stroke="#8a7a6a" stroke-width="3"/>` +
      `<path d="M 94 6 L 98 16 L 108 12 L 100 20 L 108 28 L 98 24 L 94 34 L 92 22 L 82 24 L 90 16 L 84 8 L 92 14 Z" fill="${C.yellow}" ${ol(3)}/>` +
      `<circle cx="95" cy="19" r="4" fill="#fff"/>`,
  );
}

function mine() {
  const dome = 'M 14 88 Q 14 38 64 38 Q 114 38 114 88 Z';
  const inner =
    `<rect width="128" height="128" fill="#4a4f5e"/>` +
    `<path d="M 128 60 Q 100 70 90 128 L 128 128 Z" fill="#343848"/>` +
    `<path d="M 26 70 Q 30 50 52 44" fill="none" stroke="#9aa2bc" stroke-width="8" stroke-linecap="round" opacity="0.8"/>` +
    // Rivets.
    `<circle cx="34" cy="76" r="3.5" fill="#8088a4"/><circle cx="94" cy="76" r="3.5" fill="#343848"/><circle cx="64" cy="82" r="3.5" fill="#8088a4"/>`;
  return svg(
    128,
    128,
    // Flat base plate.
    `<ellipse cx="64" cy="92" rx="54" ry="14" fill="#2e3140" ${ol(5)}/>` +
      clipped(dome, inner) +
      `<path d="${dome}" fill="none" ${ol(5)}/>` +
      // Trigger prongs and the blinking light.
      shape('M 30 50 L 24 34 L 38 44 Z', C.steelSh, 4) +
      shape('M 98 50 L 104 34 L 90 44 Z', C.steelSh, 4) +
      `<circle cx="64" cy="38" r="15" fill="#2e3140" ${ol(5)}/><circle cx="64" cy="38" r="9" fill="#ff3a3a"/>` +
      `<circle cx="61" cy="35" r="3" fill="#ffd0d0"/>`,
  );
}

function crate(kind) {
  const body = 'M 14 22 L 114 22 L 114 112 L 14 112 Z';
  const wood = kind === 'weapon';
  const base = wood ? C.wood : '#f4f4fa';
  const sh = wood ? C.woodSh : '#c4c4d8';
  const hi = wood ? C.woodHi : '#ffffff';
  const inner =
    `<rect width="128" height="128" fill="${base}"/>` +
    `<rect x="92" y="0" width="40" height="128" fill="${sh}"/>` +
    `<rect x="18" y="22" width="8" height="90" fill="${hi}" opacity="0.7"/>` +
    (wood
      ? `<path d="M 14 54 L 114 54 M 14 82 L 114 82" stroke="${sh}" stroke-width="4"/><path d="M 14 22 L 114 112 M 114 22 L 14 112" stroke="${C.woodSh}" stroke-width="7" opacity="0.7"/>`
      : '');
  const corner = (x, y, sx, sy) =>
    shape(
      `M ${x} ${y} L ${x + 24 * sx} ${y} L ${x + 24 * sx} ${y + 8 * sy} L ${x + 8 * sx} ${y + 8 * sy} L ${x + 8 * sx} ${y + 24 * sy} L ${x} ${y + 24 * sy} Z`,
      C.steel,
      4,
    );
  const emblem = wood
    ? `<circle cx="64" cy="67" r="20" fill="${C.yellow}" ${ol(5)}/>` +
      `<path d="M 64 52 L 69 62 L 80 63 L 72 71 L 74 82 L 64 76 L 54 82 L 56 71 L 48 63 L 59 62 Z" fill="${C.orange}" ${ol(3)}/>`
    : shape(
        'M 52 40 L 76 40 L 76 56 L 92 56 L 92 80 L 76 80 L 76 96 L 52 96 L 52 80 L 36 80 L 36 56 L 52 56 Z',
        '#e0303a',
        5,
      ) + `<path d="M 56 44 L 56 54" stroke="#ff9a9a" stroke-width="4" stroke-linecap="round"/>`;
  return svg(
    128,
    128,
    clipped(body, inner) +
      `<path d="${body}" fill="none" ${ol(6)}/>` +
      corner(14, 22, 1, 1) +
      corner(114, 22, -1, 1) +
      corner(14, 112, 1, -1) +
      corner(114, 112, -1, -1) +
      emblem,
  );
}

function barrel() {
  const body = 'M 34 20 Q 14 64 34 110 L 94 110 Q 114 64 94 20 Z';
  const inner =
    `<rect width="128" height="128" fill="#d0402c"/>` +
    `<rect x="82" y="0" width="50" height="128" fill="#a02a22"/>` +
    `<rect x="36" y="0" width="10" height="128" fill="#ff8a6a" opacity="0.8"/>` +
    // Metal hoops.
    `<path d="M 0 38 L 128 38 L 128 50 L 0 50 Z M 0 82 L 128 82 L 128 94 L 0 94 Z" fill="${C.steel}"/>` +
    `<path d="M 0 82 L 128 82 L 128 88 L 0 88 Z" fill="${C.steelSh}" opacity="0.6"/>`;
  return svg(
    128,
    128,
    clipped(body, inner) +
      `<path d="${body}" fill="none" ${ol(6)}/>` +
      `<path d="M 0 38 L 128 38 M 0 50 L 128 50" stroke="${C.out}" stroke-width="3" opacity="0"/>` +
      // Warning flame badge.
      `<circle cx="64" cy="66" r="18" fill="${C.yellow}" ${ol(5)}/>` +
      `<path d="M 64 52 Q 74 62 70 72 Q 68 80 64 80 Q 58 80 57 73 Q 56 66 62 62 Q 62 68 66 68 Q 66 60 64 52 Z" fill="${C.orange}" ${ol(3)}/>` +
      // Lid.
      `<ellipse cx="64" cy="20" rx="30" ry="9" fill="#8a2a22" ${ol(5)}/><ellipse cx="64" cy="19" rx="22" ry="5" fill="#b8402e"/>`,
  );
}

function bazooka() {
  const tube =
    'M 14 52 L 102 52 Q 118 52 118 66 Q 118 80 102 80 L 14 80 Q 4 80 4 66 Q 4 52 14 52 Z';
  const inner =
    `<rect width="128" height="128" fill="#6a7a4a"/>` +
    `<rect y="68" width="128" height="30" fill="#4c5a36"/>` +
    `<rect x="0" y="54" width="128" height="6" fill="#a8bc7a" opacity="0.9"/>` +
    `<path d="M 40 52 L 40 80 M 78 52 L 78 80" stroke="#3a4528" stroke-width="3.5" opacity="0.7"/>`;
  return svg(
    128,
    128,
    `<g transform="rotate(-24 64 64)">` +
      // Rocket nose peeking out of the muzzle.
      shape('M 6 60 L -8 66 L 6 72 Z', C.red, 4) +
      clipped(tube, inner) +
      `<path d="${tube}" fill="none" ${ol(5.5)}/>` +
      // Muzzle ring, rear flare, grip, scope.
      shape('M 14 48 L 24 48 L 24 84 L 14 84 Q 8 66 14 48 Z', C.steel, 4.5) +
      shape('M 100 50 L 124 40 L 124 92 L 100 82 Z', C.steelSh, 4.5) +
      shape('M 54 80 L 74 80 L 78 112 L 62 112 Z', '#8a6a42', 4.5) +
      shape('M 46 44 L 86 44 L 86 52 L 46 52 Z', C.steelSh, 4) +
      `<rect x="52" y="34" width="28" height="12" rx="5" fill="${C.steel}" ${ol(4)}/>` +
      `</g>`,
  );
}

function sheep() {
  // Wool: stroked circles first, filled circles on top, so the cloud has one clean outline.
  const puffs = [
    [40, 58, 22],
    [64, 46, 24],
    [88, 56, 22],
    [96, 78, 18],
    [66, 86, 24],
    [38, 82, 20],
    [64, 66, 26],
  ];
  const stroke = puffs
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.white}" ${ol(5)}/>`)
    .join('');
  const fill = puffs
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 2.5}" fill="${C.white}"/>`)
    .join('');
  const shade = `<path d="M 90 64 Q 108 80 92 96 Q 78 110 56 104 Q 90 100 90 64 Z" fill="#d9d2ea" opacity="0.8"/>`;
  return svg(
    128,
    128,
    // Legs and head behind/in front.
    shape('M 44 100 L 44 118 L 54 118 L 54 100 Z', '#3a2c36', 4) +
      shape('M 78 100 L 78 118 L 88 118 L 88 100 Z', '#3a2c36', 4) +
      stroke +
      fill +
      shade +
      `<path d="M 34 52 Q 44 38 58 40" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.9"/>` +
      // Head.
      shape('M 100 52 Q 120 50 122 70 Q 122 86 108 88 Q 98 80 100 52 Z', '#3a2c36', 4.5) +
      shape('M 100 52 L 112 38 L 114 56 Z', '#4e3a48', 4) +
      `<circle cx="112" cy="64" r="6" fill="#fff"/><circle cx="114" cy="65" r="3" fill="${C.out}"/>`,
  );
}

export function iconAssets() {
  return {
    'weapons/icon/grenade': grenade(),
    'weapons/icon/dynamite': dynamite(),
    'weapons/icon/mine': mine(),
    'weapons/icon/bazooka': bazooka(),
    'weapons/icon/sheep': sheep(),
    'objects/crate-weapon': crate('weapon'),
    'objects/crate-health': crate('health'),
    'objects/barrel': barrel(),
  };
}
