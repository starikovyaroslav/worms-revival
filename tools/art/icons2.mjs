import { C, clipped, ol, shape, svg } from './lib.mjs';

// More weapon icons and world sprites, same style rules as icons.mjs (128×128, flat side view,
// lit from the top left, one cool shadow step, one highlight). Designed bold and simple so they
// survive being reduced to a few dozen pixels.

const S = (b) => svg(128, 128, b);
const rot = (deg, inner) => `<g transform="rotate(${deg} 64 64)">${inner}</g>`;

function homing() {
  return S(
    rot(
      -28,
      shape(
        'M 14 52 L 92 52 Q 112 52 116 66 Q 112 80 92 80 L 14 80 Q 6 80 6 66 Q 6 52 14 52 Z',
        '#d8dcec',
        5.5,
      ) +
        `<rect x="14" y="68" width="98" height="12" fill="#a8aec8" opacity="0.85"/>` +
        shape('M 92 52 Q 112 52 120 66 Q 112 80 92 80 Z', '#2a8ad8', 5) +
        shape('M 28 52 L 14 30 L 44 52 Z', '#2a8ad8', 5) +
        shape('M 28 80 L 14 102 L 44 80 Z', '#2a8ad8', 5) +
        // Radar dish.
        `<path d="M 54 52 L 54 40" stroke="${C.out}" stroke-width="5" stroke-linecap="round"/><path d="M 40 36 Q 54 48 68 36 Z" fill="${C.yellow}" ${ol(4)}/>` +
        `<circle cx="54" cy="66" r="6" fill="${C.red}" ${ol(3.5)}/>`,
    ),
  );
}

function mortar() {
  return S(
    // Base plate and bipod.
    shape('M 22 108 L 106 108 L 98 120 L 30 120 Z', C.steelSh, 5) +
      `<path d="M 50 104 L 36 118 M 78 104 L 92 118" ${ol(6)}/>` +
      rot(
        -18,
        shape('M 46 44 L 82 44 L 90 108 L 38 108 Z', '#5a6a42', 5.5) +
          `<path d="M 50 48 L 46 104" stroke="#9ab070" stroke-width="7" stroke-linecap="round"/>` +
          shape('M 42 40 L 86 40 L 86 52 L 42 52 Z', C.steel, 5) +
          // Shell leaving the tube.
          shape('M 52 12 Q 64 -2 76 12 L 76 42 L 52 42 Z', '#8a8a96', 5) +
          `<rect x="52" y="22" width="24" height="6" fill="${C.yellow}"/>`,
      ),
  );
}

function pigeon() {
  return S(
    // Wing, body, head, beak and the letter it carries.
    shape('M 30 70 Q 6 52 14 28 Q 40 36 60 62 Z', '#c4c8da', 5) +
      shape(
        'M 28 70 Q 30 40 64 40 Q 104 40 108 70 Q 104 96 64 98 Q 38 98 28 70 Z',
        '#e8eaf4',
        5.5,
      ) +
      `<path d="M 40 84 Q 64 94 94 80" fill="none" stroke="#b4b8d0" stroke-width="9" stroke-linecap="round"/>` +
      shape('M 86 44 Q 98 28 112 36 Q 118 50 106 58 Z', '#e8eaf4', 5) +
      shape('M 112 40 L 126 46 L 112 52 Z', '#f2a030', 4.5) +
      `<circle cx="104" cy="42" r="4.5" fill="${C.out}"/><circle cx="102.5" cy="40.5" r="1.5" fill="#fff"/>` +
      shape('M 20 78 L 4 92 L 24 92 Z', '#b0b4cc', 4.5) +
      shape('M 46 92 L 72 92 L 72 114 L 46 114 Z', '#fffdf6', 4.5) +
      `<path d="M 46 92 L 59 104 L 72 92" fill="none" stroke="${C.out}" stroke-width="3.5"/>`,
  );
}

function cluster() {
  const bomblet = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.red}" ${ol(4.5)}/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.28}" fill="${C.redHi}"/>`;
  return S(
    `<circle cx="64" cy="72" r="38" fill="#c43a3a" ${ol(6)}/>` +
      `<path d="M 40 52 Q 50 40 66 38" fill="none" stroke="${C.redHi}" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="M 94 60 Q 104 84 80 106 Q 100 96 98 64 Z" fill="${C.redSh}" opacity="0.85"/>` +
      shape('M 54 36 L 54 24 Q 54 20 58 20 L 70 20 Q 74 20 74 24 L 74 36 Z', C.steel, 5) +
      bomblet(28, 40, 12) +
      bomblet(100, 36, 11) +
      bomblet(22, 100, 11) +
      bomblet(106, 102, 12),
  );
}

function banana() {
  const body =
    'M 20 40 Q 30 100 90 108 Q 110 108 116 96 Q 112 100 96 94 Q 52 84 40 34 Q 34 28 24 32 Z';
  const inner =
    `<rect width="128" height="128" fill="#ffe14a"/>` +
    `<path d="M 40 128 Q 90 118 128 80 L 128 128 Z" fill="#e0b020"/>` +
    `<path d="M 28 40 Q 40 90 84 100" fill="none" stroke="#fff6a0" stroke-width="7" stroke-linecap="round" opacity="0.9"/>`;
  return S(
    clipped(body, inner) +
      `<path d="${body}" fill="none" ${ol(6)}/>` +
      shape('M 20 40 L 14 24 L 30 28 Z', '#8a6a3a', 4.5) +
      shape('M 116 96 L 124 104 L 112 108 Z', '#5a4028', 4) +
      // Fuse.
      `<path d="M 24 30 Q 22 12 40 8" fill="none" ${ol(6)}/><path d="M 24 30 Q 22 12 40 8" fill="none" stroke="#9a8a7a" stroke-width="2.5"/>` +
      `<circle cx="42" cy="8" r="6" fill="${C.yellow}" ${ol(3)}/>`,
  );
}

function shotgun() {
  return S(
    rot(
      -20,
      shape('M 8 56 L 92 56 L 92 70 L 8 70 Z', '#4a4f5e', 5) +
        `<rect x="12" y="58" width="76" height="4" fill="#8a92ac"/>` +
        shape('M 30 70 L 78 70 L 78 80 L 30 80 Z', '#8a5a34', 4.5) +
        shape(
          'M 88 54 L 110 50 Q 124 52 122 66 L 118 84 Q 112 90 100 84 L 88 72 Z',
          '#a8703c',
          5.5,
        ) +
        `<path d="M 94 58 L 112 56" stroke="#e8b078" stroke-width="5" stroke-linecap="round"/>` +
        shape('M 74 70 L 78 88 L 88 88 L 86 70 Z', C.steelSh, 4),
    ),
  );
}

function handgun() {
  return S(
    shape('M 22 48 L 100 48 L 100 66 L 52 66 L 52 72 L 22 72 Z', '#58607a', 5.5) +
      `<rect x="26" y="52" width="68" height="5" fill="#a0a8c4"/>` +
      shape('M 54 66 L 80 66 L 76 112 Q 70 118 62 114 L 54 76 Z', '#6a4a30', 5.5) +
      `<path d="M 60 74 L 62 106" stroke="#a8784a" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M 52 68 Q 60 90 76 84" fill="none" ${ol(5)}/>` +
      shape('M 100 48 L 114 48 L 114 56 L 100 56 Z', C.steelSh, 4.5),
  );
}

function uzi() {
  return S(
    shape('M 14 44 L 104 44 L 104 74 L 56 74 L 56 62 L 14 62 Z', '#3e4254', 5.5) +
      `<rect x="18" y="47" width="82" height="5" fill="#7a82a0"/>` +
      shape('M 20 54 L 6 54 L 6 62 L 20 62 Z', C.steelSh, 4) +
      shape('M 60 74 L 80 74 L 84 118 L 66 118 Z', '#2e3140', 5.5) +
      `<path d="M 66 80 L 68 112" stroke="#6a7290" stroke-width="4" stroke-linecap="round"/>` +
      shape('M 100 50 L 122 50 L 122 60 L 100 60 Z', '#6a4a30', 4.5) +
      `<path d="M 40 74 Q 48 94 58 80" fill="none" ${ol(5)}/>`,
  );
}

function minigun() {
  const barrel = (y) =>
    `<rect x="14" y="${y}" width="76" height="9" rx="4" fill="${C.steel}" ${ol(4)}/>`;
  return S(
    barrel(40) +
      barrel(56) +
      barrel(72) +
      shape('M 6 36 L 18 36 L 18 86 L 6 86 Z', C.steelSh, 5) +
      shape('M 88 32 L 112 40 L 112 82 L 88 90 Z', '#4a5068', 5.5) +
      `<path d="M 94 40 L 106 44" stroke="#8a92ac" stroke-width="5" stroke-linecap="round"/>` +
      shape('M 100 90 L 124 90 L 124 104 L 100 104 Z', '#6a4a30', 4.5) +
      // Ammo belt.
      `<path d="M 96 92 Q 70 120 36 112" fill="none" stroke="${C.out}" stroke-width="12" stroke-linecap="round"/>` +
      `<path d="M 96 92 Q 70 120 36 112" fill="none" stroke="#e0b040" stroke-width="7" stroke-linecap="round" stroke-dasharray="6 5"/>`,
  );
}

function longbow() {
  return S(
    // Bow limb.
    `<path d="M 40 10 Q 112 64 40 118" fill="none" ${ol(11)}/><path d="M 40 10 Q 112 64 40 118" fill="none" stroke="#a8703c" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M 40 10 L 40 118" stroke="${C.out}" stroke-width="4"/><path d="M 40 10 L 40 118" stroke="#f0e8d8" stroke-width="2"/>` +
      // Arrow.
      `<path d="M 24 64 L 112 64" stroke="${C.out}" stroke-width="8" stroke-linecap="round"/><path d="M 24 64 L 112 64" stroke="#a8703c" stroke-width="4" stroke-linecap="round"/>` +
      shape('M 108 56 L 124 64 L 108 72 Z', '#cfd4e4', 4.5) +
      shape('M 22 64 L 6 52 L 14 64 L 6 76 Z', C.red, 4),
  );
}

function firepunch() {
  const fist =
    'M 30 70 Q 28 44 54 44 L 92 44 Q 108 46 108 66 L 108 86 Q 108 104 88 106 L 50 106 Q 30 104 30 70 Z';
  return S(
    // Flames behind the fist.
    shape(
      'M 4 70 Q 22 58 34 64 L 40 90 Q 20 98 10 112 Q 14 92 4 70 Z M 18 60 Q 26 44 40 52 L 44 80 Z',
      '#ff8a30',
      5,
    ) +
      shape('M 14 72 Q 26 66 36 72 L 38 88 Q 24 92 18 100 Q 20 84 14 72 Z', '#ffd23a', 4) +
      clipped(
        fist,
        `<rect width="128" height="128" fill="#ffd9ae"/><rect x="0" y="86" width="128" height="40" fill="#e8a08e"/>` +
          `<path d="M 54 44 L 54 70 M 72 44 L 72 70 M 90 46 L 90 70" stroke="#c27a86" stroke-width="5"/>`,
      ) +
      `<path d="${fist}" fill="none" ${ol(6)}/>` +
      shape('M 92 94 L 118 88 L 118 112 L 92 112 Z', '#f2f2f6', 5),
  );
}

function prod() {
  return S(
    shape('M 14 78 L 76 62 L 80 76 L 18 92 Z', '#a8703c', 5.5) +
      `<path d="M 22 80 L 72 67" stroke="#e8b078" stroke-width="4" stroke-linecap="round"/>` +
      // Glove with a pointing finger.
      shape('M 70 54 L 100 46 Q 122 44 122 60 L 122 72 Q 120 90 100 90 L 76 94 Z', '#fffdf6', 5.5) +
      shape('M 100 46 L 116 40 Q 126 40 126 50 Q 124 56 112 58 Z', '#fffdf6', 5) +
      `<path d="M 84 70 L 98 68" stroke="#c8c4dc" stroke-width="4" stroke-linecap="round"/>`,
  );
}

function supersheep() {
  return S(
    // Cape streaming behind, then a smaller sheep on top.
    shape('M 52 40 Q 20 36 6 18 Q 14 56 30 84 L 54 90 Z', '#d02020', 5.5) +
      `<path d="M 44 46 Q 24 44 14 30" fill="none" stroke="#ff7a6a" stroke-width="4" stroke-linecap="round" opacity="0.9"/>` +
      `<g transform="translate(14 8) scale(0.88)">` +
      [
        [40, 58, 22],
        [64, 46, 24],
        [88, 56, 22],
        [96, 78, 18],
        [66, 86, 24],
        [38, 82, 20],
        [64, 66, 26],
      ]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.white}" ${ol(5.5)}/>`)
        .join('') +
      [
        [40, 58, 22],
        [64, 46, 24],
        [88, 56, 22],
        [96, 78, 18],
        [66, 86, 24],
        [38, 82, 20],
        [64, 66, 26],
      ]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 2.8}" fill="${C.white}"/>`)
        .join('') +
      shape('M 100 52 Q 120 50 122 70 Q 122 86 108 88 Q 98 80 100 52 Z', '#3a2c36', 4.5) +
      `<rect x="102" y="58" width="16" height="9" rx="3" fill="#ffd23a" ${ol(3)}/><circle cx="112" cy="64" r="5" fill="#fff"/>` +
      `</g>`,
  );
}

function airstrike() {
  return S(
    // Little cartoon bomber with bombs falling.
    shape(
      'M 16 52 Q 30 40 60 40 L 98 40 Q 120 42 122 52 Q 120 62 98 64 L 36 64 Q 20 62 16 52 Z',
      '#9aa6c4',
      5.5,
    ) +
      `<path d="M 30 46 L 92 44" stroke="#d8def0" stroke-width="5" stroke-linecap="round"/>` +
      shape('M 14 46 L 4 28 L 24 28 L 34 44 Z', '#5a6a98', 5) +
      shape('M 54 56 L 80 56 L 66 82 L 44 82 Z', '#5a6a98', 5) +
      `<circle cx="104" cy="50" r="6" fill="#cfeaff" ${ol(3.5)}/>` +
      // Bombs.
      [
        [44, 104],
        [68, 112],
        [92, 104],
      ]
        .map(
          ([x, y]) =>
            `<ellipse cx="${x}" cy="${y}" rx="7" ry="11" fill="#3a3e50" ${ol(4)}/><path d="M ${x - 4} ${y - 12} L ${x - 8} ${y - 22} L ${x + 8} ${y - 22} L ${x + 4} ${y - 12} Z" fill="#8a92ac" ${ol(3)}/>`,
        )
        .join(''),
  );
}

function blowtorch() {
  return S(
    rot(
      -14,
      shape('M 14 70 L 62 70 L 62 100 L 14 100 Z', '#c43a3a', 5.5) +
        `<rect x="18" y="74" width="8" height="22" fill="${C.redHi}" opacity="0.8"/>` +
        shape('M 62 78 L 96 82 L 96 92 L 62 92 Z', C.steel, 5) +
        shape('M 96 76 L 108 76 L 108 98 L 96 98 Z', C.steelSh, 5) +
        // Flame.
        shape('M 108 78 Q 128 74 124 88 Q 128 100 108 96 Z', '#ff8a30', 4.5) +
        shape('M 108 82 Q 120 82 118 88 Q 120 94 108 92 Z', '#ffe45a', 3.5) +
        shape('M 30 70 L 30 56 L 48 56 L 48 70', C.steelSh, 4.5),
    ),
  );
}

function drill() {
  return S(
    shape('M 44 10 L 84 10 L 84 30 L 44 30 Z', '#ffd23a', 5.5) +
      shape('M 30 30 L 98 30 L 90 56 L 38 56 Z', '#e0a020', 5.5) +
      shape('M 46 56 L 82 56 L 82 74 L 46 74 Z', C.steel, 5) +
      shape('M 54 74 L 74 74 L 66 118 L 62 118 Z', '#cfd4e4', 5) +
      `<path d="M 56 80 L 62 112" stroke="#fff" stroke-width="4" stroke-linecap="round"/>` +
      // Handles.
      shape('M 14 14 L 44 14 L 44 24 L 14 24 Z', '#4a5068', 5) +
      shape('M 84 14 L 114 14 L 114 24 L 84 24 Z', '#4a5068', 5) +
      // Debris.
      `<circle cx="38" cy="112" r="4" fill="#8f563b"/><circle cx="90" cy="108" r="5" fill="#8f563b"/><circle cx="100" cy="96" r="3" fill="#8f563b"/>`,
  );
}

function girder() {
  return S(
    rot(
      -18,
      shape('M 8 44 L 120 44 L 120 56 L 8 56 Z', '#d8802a', 5.5) +
        shape('M 8 74 L 120 74 L 120 86 L 8 86 Z', '#d8802a', 5.5) +
        `<path d="M 14 56 L 34 74 L 54 56 L 74 74 L 94 56 L 112 74" fill="none" ${ol(8)}/>` +
        `<path d="M 14 56 L 34 74 L 54 56 L 74 74 L 94 56 L 112 74" fill="none" stroke="#f0a850" stroke-width="3.5" stroke-linecap="round"/>` +
        `<rect x="12" y="46" width="100" height="4" fill="#ffd090" opacity="0.8"/>`,
    ),
  );
}

function bat() {
  return S(
    rot(
      -38,
      shape('M 6 60 Q 4 64 6 68 L 78 74 Q 118 76 122 66 Q 118 56 78 56 Z', '#c8884a', 5.5) +
        `<path d="M 14 62 L 80 60" stroke="#f0c088" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M 80 66 L 120 68" stroke="#9a6234" stroke-width="5" stroke-linecap="round" opacity="0.8"/>` +
        shape('M 4 58 L 22 58 L 22 76 L 4 76 Z', '#2a3a6a', 4.5) +
        `<path d="M 8 62 L 18 62 M 8 70 L 18 70" stroke="#6a7ac0" stroke-width="3"/>` +
        shape('M -2 62 L 6 62 L 6 72 L -2 72 Z', '#d8c8a0', 4),
    ),
  );
}

function rope() {
  return S(
    // Rope coil and a grappling hook.
    `<path d="M 24 100 Q 8 80 30 70 Q 60 60 66 82 Q 70 104 40 104 Q 18 104 22 90" fill="none" ${ol(12)}/>` +
      `<path d="M 24 100 Q 8 80 30 70 Q 60 60 66 82 Q 70 104 40 104 Q 18 104 22 90" fill="none" stroke="#d8b078" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M 62 74 Q 80 56 96 44" fill="none" ${ol(10)}/><path d="M 62 74 Q 80 56 96 44" fill="none" stroke="#d8b078" stroke-width="5" stroke-linecap="round"/>` +
      shape('M 90 50 L 98 24 Q 104 16 112 24 L 120 56 Q 112 40 106 40 L 98 62 Z', C.steel, 5) +
      shape('M 94 36 L 74 24 Q 68 28 76 40 Z', C.steel, 4.5) +
      `<circle cx="96" cy="48" r="6" fill="${C.steelSh}" ${ol(4)}/>`,
  );
}

function parachute() {
  const cap =
    'M 10 54 Q 20 8 64 8 Q 108 8 118 54 Q 100 40 90 54 Q 78 40 64 54 Q 50 40 38 54 Q 28 40 10 54 Z';
  return S(
    `<path d="M 14 54 L 58 100 M 38 54 L 60 100 M 64 54 L 64 100 M 90 54 L 68 100 M 114 54 L 70 100" fill="none" stroke="${C.out}" stroke-width="3.5"/>` +
      clipped(
        cap,
        `<rect width="128" height="128" fill="#fffdf6"/>` +
          `<path d="M 10 0 L 38 0 L 38 128 L 10 128 Z M 64 0 L 90 0 L 90 128 L 64 128 Z" fill="${C.red}"/>` +
          `<path d="M 0 40 Q 64 30 128 40 L 128 128 L 0 128 Z" fill="#000" opacity="0.12"/>`,
      ) +
      `<path d="${cap}" fill="none" ${ol(5.5)}/>` +
      ``,
  );
}

function teleport() {
  const star = (x, y, r, c) =>
    `<path d="M ${x} ${y - r} L ${x + r * 0.28} ${y - r * 0.28} L ${x + r} ${y} L ${x + r * 0.28} ${y + r * 0.28} L ${x} ${y + r} L ${x - r * 0.28} ${y + r * 0.28} L ${x - r} ${y} L ${x - r * 0.28} ${y - r * 0.28} Z" fill="${c}" ${ol(3)}/>`;
  return S(
    `<ellipse cx="64" cy="70" rx="44" ry="50" fill="#3f3f74" ${ol(6)}/>` +
      `<ellipse cx="64" cy="70" rx="34" ry="40" fill="#5b6ee1"/>` +
      `<ellipse cx="64" cy="70" rx="22" ry="28" fill="#9ae0ff"/>` +
      `<ellipse cx="64" cy="70" rx="10" ry="14" fill="#ffffff"/>` +
      `<path d="M 30 50 Q 40 36 56 32" fill="none" stroke="#cfe8ff" stroke-width="5" stroke-linecap="round" opacity="0.9"/>` +
      star(24, 22, 14, '#ffd23a') +
      star(106, 30, 11, '#ffffff') +
      star(100, 108, 14, '#ffd23a'),
  );
}

function hhg() {
  const body = 'M 64 38 C 98 36 104 70 96 94 C 88 116 40 116 32 94 C 24 70 30 40 64 38 Z';
  return S(
    // Halo.
    `<ellipse cx="64" cy="14" rx="26" ry="8" fill="none" ${ol(10)}/><ellipse cx="64" cy="14" rx="26" ry="8" fill="none" stroke="#fff6a0" stroke-width="5"/>` +
      clipped(
        body,
        `<rect width="128" height="128" fill="#f2c230"/><path d="M 128 60 C 108 70 100 96 80 128 L 128 128 Z" fill="#c8901a"/>` +
          `<ellipse cx="46" cy="60" rx="9" ry="14" fill="#fff6a0" transform="rotate(-20 46 60)"/>`,
      ) +
      `<path d="${body}" fill="none" ${ol(5.5)}/>` +
      shape(
        'M 54 52 L 74 52 L 74 66 L 90 66 L 90 82 L 74 82 L 74 102 L 54 102 L 54 82 L 38 82 L 38 66 L 54 66 Z',
        '#fffdf6',
        4.5,
      ) +
      shape('M 50 38 L 50 26 Q 50 22 54 22 L 74 22 Q 78 22 78 26 L 78 38 Z', '#e8c850', 5) +
      `<circle cx="64" cy="22" r="9" fill="#e0303a" ${ol(4)}/>`,
  );
}

function skipgo() {
  return S(
    shape('M 28 12 L 100 12 L 100 24 L 28 24 Z', '#8a5a34', 5.5) +
      shape('M 28 104 L 100 104 L 100 116 L 28 116 Z', '#8a5a34', 5.5) +
      `<path d="M 36 24 L 36 40 Q 36 56 64 64 Q 36 72 36 88 L 36 104 L 92 104 L 92 88 Q 92 72 64 64 Q 92 56 92 40 L 92 24 Z" fill="#cfeaff" ${ol(5.5)}/>` +
      `<path d="M 44 28 L 84 28 L 78 44 Q 64 52 50 44 Z" fill="#fff" opacity="0.5"/>` +
      `<path d="M 40 100 L 88 100 L 80 84 Q 64 72 48 84 Z" fill="#f2c230" ${ol(3.5)}/>` +
      `<path d="M 64 60 L 64 76" stroke="#f2c230" stroke-width="5"/>`,
  );
}

function surrender() {
  return S(
    `<rect x="26" y="10" width="10" height="112" rx="4" fill="#a8703c" ${ol(5.5)}/>` +
      `<circle cx="31" cy="10" r="8" fill="#f2c230" ${ol(4.5)}/>` +
      shape('M 36 20 Q 70 8 100 22 Q 86 40 102 58 Q 70 46 36 62 Z', '#fffdf6', 6) +
      `<path d="M 42 30 Q 66 22 90 28" fill="none" stroke="#d8d8ec" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M 42 52 Q 66 44 92 52" fill="none" stroke="#c8c8e0" stroke-width="4" stroke-linecap="round"/>`,
  );
}

// ---------- World sprites (small, in-game) ----------

function rocket() {
  return svg(
    128,
    48,
    shape('M 10 14 L 84 14 L 84 34 L 10 34 Z', '#8a9a72', 5.5) +
      `<rect x="14" y="16" width="68" height="5" fill="#c8d8a8"/>` +
      shape('M 84 12 Q 112 24 84 36 Z', C.red, 5.5) +
      shape('M 22 14 L 6 2 L 36 14 Z', '#5a6a42', 4.5) +
      shape('M 22 34 L 6 46 L 36 34 Z', '#5a6a42', 4.5) +
      `<rect x="46" y="16" width="8" height="18" fill="#ffd23a"/>`,
    '0 0 128 48',
  );
}

function arrow() {
  return svg(
    128,
    32,
    `<path d="M 16 16 L 100 16" stroke="${C.out}" stroke-width="10" stroke-linecap="round"/><path d="M 16 16 L 100 16" stroke="#c89a5a" stroke-width="5" stroke-linecap="round"/>` +
      shape('M 98 6 L 124 16 L 98 26 Z', '#cfd4e4', 5) +
      shape('M 16 16 L 2 4 L 12 16 L 2 28 Z', C.red, 4) +
      shape('M 28 16 L 16 6 L 24 16 L 16 26 Z', C.red, 4),
    '0 0 128 32',
  );
}

function tombstone() {
  const body = 'M 28 118 L 28 52 Q 28 14 64 14 Q 100 14 100 52 L 100 118 Z';
  return S(
    clipped(
      body,
      `<rect width="128" height="128" fill="#d8d8e4"/><rect x="80" width="48" height="128" fill="#a8a8c0"/><rect x="34" y="20" width="8" height="100" fill="#fff" opacity="0.6"/>`,
    ) +
      `<path d="${body}" fill="none" ${ol(6)}/>` +
      // Team-coloured flag (grey for tinting).
      `<path d="M 64 100 L 64 52" stroke="${C.out}" stroke-width="6"/><path d="M 64 52 L 92 62 L 64 74 Z" fill="#e6e6ee" ${ol(4.5)}/>` +
      `<path d="M 44 112 L 84 112" stroke="#8c8ca8" stroke-width="5" stroke-linecap="round"/>`,
  );
}

function bomblet() {
  return S(
    `<circle cx="64" cy="68" r="34" fill="#a02a2a" ${ol(8)}/><circle cx="52" cy="54" r="10" fill="${C.redHi}"/>` +
      shape('M 54 38 L 54 26 L 74 26 L 74 38 Z', C.steel, 6),
  );
}

export function iconAssets2() {
  return {
    homing: homing(),
    mortar: mortar(),
    pigeon: pigeon(),
    cluster: cluster(),
    banana: banana(),
    shotgun: shotgun(),
    handgun: handgun(),
    uzi: uzi(),
    minigun: minigun(),
    longbow: longbow(),
    firepunch: firepunch(),
    prod: prod(),
    supersheep: supersheep(),
    airstrike: airstrike(),
    blowtorch: blowtorch(),
    drill: drill(),
    girder: girder(),
    bat: bat(),
    rope: rope(),
    parachute: parachute(),
    teleport: teleport(),
    hhg: hhg(),
    skipgo: skipgo(),
    surrender: surrender(),
    rocket: rocket(),
    arrow: arrow(),
    tombstone: tombstone(),
    bomblet: bomblet(),
  };
}
