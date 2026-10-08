import { C, clipped, id, ol, shape, svg } from './lib.mjs';

// The body is a flexible mesh in game, so it is drawn as a straight horizontal strip:
// tail on the left, head on the right, no face. 640x160.
const BODY =
  'M 24 80 C 24 56 44 48 80 44 C 220 38 380 26 540 24 C 600 24 620 50 620 80 ' +
  'C 620 110 600 136 540 136 C 380 134 220 122 80 116 C 44 112 24 104 24 80 Z';

function bodyStrip({ tint = null, bruise = false } = {}) {
  const base = tint?.base ?? C.skin;
  const sh = tint?.sh ?? C.skinSh;
  const deep = tint?.deep ?? C.skinDeep;
  const hi = tint?.hi ?? C.skinHi;
  let creases = '';
  for (const [x, o] of [
    [120, 0.55],
    [190, 0.55],
    [260, 0.55],
    [330, 0.5],
    [400, 0.45],
    [470, 0.4],
    [540, 0.3],
  ]) {
    creases +=
      `<path d="M ${x} ${40 - (x - 120) / 40} Q ${x + 16} 82 ${x} ${124 + (x - 120) / 60}" fill="none" stroke="${deep}" stroke-width="5" stroke-linecap="round" opacity="${o}"/>` +
      `<path d="M ${x + 9} ${44 - (x - 120) / 40} Q ${x + 24} 80 ${x + 9} ${120 + (x - 120) / 60}" fill="none" stroke="${hi}" stroke-width="4" stroke-linecap="round" opacity="${o * 0.9}"/>`;
  }
  const inner =
    `<rect width="640" height="160" fill="${base}"/>` +
    // Lower half in cool shadow (cel step 1) and a deeper rim at the very bottom (step 2).
    `<path d="M 0 98 Q 160 90 320 98 T 640 92 L 640 160 L 0 160 Z" fill="${sh}"/>` +
    `<path d="M 0 124 Q 200 116 400 126 T 640 120 L 640 160 L 0 160 Z" fill="${deep}" opacity="0.6"/>` +
    creases +
    // Top-left light: a clean highlight band along the top edge.
    `<path d="M 54 56 Q 300 40 548 40" fill="none" stroke="${hi}" stroke-width="16" stroke-linecap="round" opacity="0.9"/>` +
    `<path d="M 80 64 Q 200 56 300 52" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.8"/>` +
    (bruise
      ? `<ellipse cx="300" cy="86" rx="46" ry="22" fill="#9a6aa8" opacity="0.4"/><ellipse cx="470" cy="70" rx="34" ry="18" fill="#7a5a98" opacity="0.35"/>`
      : '');
  return svg(640, 160, clipped(BODY, inner) + `<path d="${BODY}" fill="none" ${ol(8)}/>`);
}

// Neck bandana. Grey so the game can tint it with the team colour. Same height as the strip
// (160) so both share one coordinate system; positioned at x ≈ 420 of the strip.
function bandana() {
  const band = 'M 24 20 Q 74 10 100 24 Q 112 80 100 138 Q 74 150 24 142 Q 36 80 24 20 Z';
  const inner =
    `<rect width="120" height="160" fill="#e6e6ee"/>` +
    `<path d="M 0 88 Q 60 78 120 90 L 120 160 L 0 160 Z" fill="#b4b4c8"/>` +
    `<path d="M 0 122 Q 60 114 120 126 L 120 160 L 0 160 Z" fill="#8c8ca4" opacity="0.7"/>` +
    `<path d="M 38 18 Q 50 80 38 142" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.7"/>` +
    // Cloth folds.
    `<path d="M 66 22 Q 78 80 66 138" fill="none" stroke="#8c8ca4" stroke-width="4" opacity="0.5"/>`;
  // Knot with two tails at the front-bottom.
  const knot =
    shape('M 28 120 L 8 156 L 36 146 L 44 130 Z', '#cfcfdf', 5) +
    shape('M 44 130 L 40 158 L 64 148 L 60 128 Z', '#b4b4c8', 5) +
    `<circle cx="42" cy="124" r="13" fill="#e6e6ee" ${ol(5)}/>` +
    `<path d="M 36 120 Q 42 116 48 120" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
  return svg(120, 160, clipped(band, inner) + `<path d="${band}" fill="none" ${ol(6)}/>` + knot);
}

// ---------- Face parts: 96×96 cells, centred. ----------
const eyeWhite = (rx, ry) => `<ellipse cx="48" cy="48" rx="${rx}" ry="${ry}" fill="${C.white}"/>`;
const eyeOutline = (rx, ry) =>
  `<ellipse cx="48" cy="48" rx="${rx}" ry="${ry}" fill="none" ${ol(5)}/>`;

function eye(kind) {
  const k = id('e');
  switch (kind) {
    case 'open':
    case 'wide': {
      const [rx, ry] = kind === 'open' ? [30, 36] : [34, 41];
      return svg(
        96,
        96,
        `<clipPath id="${k}"><ellipse cx="48" cy="48" rx="${rx}" ry="${ry}"/></clipPath>` +
          eyeWhite(rx, ry) +
          // Soft violet shade under the upper lid.
          `<g clip-path="url(#${k})"><ellipse cx="48" cy="${48 - ry - 8}" rx="${rx + 6}" ry="26" fill="#d8cfee"/></g>` +
          eyeOutline(rx, ry),
      );
    }
    case 'half':
      return svg(
        96,
        96,
        `<clipPath id="${k}"><ellipse cx="48" cy="48" rx="30" ry="36"/></clipPath>` +
          eyeWhite(30, 36) +
          `<g clip-path="url(#${k})"><rect x="10" y="8" width="76" height="40" fill="${C.skin}"/><rect x="10" y="40" width="76" height="8" fill="${C.skinSh}"/></g>` +
          eyeOutline(30, 36) +
          `<path d="M 18 48 L 78 48" ${ol(6)}/>`,
      );
    case 'closed':
      return svg(96, 96, `<path d="M 20 46 Q 48 76 76 46" fill="none" ${ol(7)}/>`);
    case 'squint':
      return svg(96, 96, eyeWhite(30, 14) + eyeOutline(30, 14));
    case 'dead':
      return svg(96, 96, `<path d="M 24 24 L 72 72 M 72 24 L 24 72" fill="none" ${ol(9)}/>`);
    default:
      throw new Error(kind);
  }
}

function pupil() {
  return svg(
    48,
    48,
    `<circle cx="24" cy="24" r="20" fill="${C.out}"/>` +
      `<circle cx="17" cy="16" r="7" fill="#fff"/><circle cx="29" cy="30" r="3" fill="#fff" opacity="0.85"/>`,
  );
}

// Brows are drawn for the right-hand eye: the inner end is on the left.
function brow(kind) {
  const paths = {
    neutral: 'M 12 32 Q 46 12 84 30',
    angry: 'M 12 36 Q 48 26 86 8',
    worried: 'M 12 10 Q 48 22 86 34',
    raised: 'M 12 26 Q 46 0 84 26',
    sad: 'M 12 14 Q 48 22 86 30',
  };
  const d = paths[kind];
  if (!d) throw new Error(kind);
  return svg(
    96,
    48,
    `<path d="${d}" fill="none" stroke="${C.out}" stroke-width="13" stroke-linecap="round"/>`,
  );
}

function mouth(kind) {
  const OUT = ol(5);
  switch (kind) {
    case 'smile':
      return svg(
        96,
        64,
        `<path d="M 14 22 Q 48 54 82 22" fill="none" ${ol(7)}/><path d="M 10 18 L 16 24 M 86 18 L 80 24" fill="none" ${ol(5)}/>`,
      );
    case 'open': {
      const d = 'M 12 16 Q 48 14 84 16 Q 80 58 48 58 Q 16 58 12 16 Z';
      return svg(
        96,
        64,
        clipped(
          d,
          `<rect width="96" height="64" fill="${C.mouth}"/>` +
            `<path d="M 26 62 Q 48 36 70 62 Z" fill="${C.tongue}"/>` +
            `<path d="M 0 14 L 96 14 L 96 28 Q 48 34 0 28 Z" fill="${C.white}"/>`,
        ) + `<path d="${d}" fill="none" ${OUT}/>`,
      );
    }
    case 'talk-a':
    case 'talk-b': {
      const [rx, ry] = kind === 'talk-a' ? [17, 15] : [26, 9];
      const d = `M ${48 - rx} 32 A ${rx} ${ry} 0 1 0 ${48 + rx} 32 A ${rx} ${ry} 0 1 0 ${48 - rx} 32 Z`;
      return svg(
        96,
        64,
        clipped(
          d,
          `<rect width="96" height="64" fill="${C.mouth}"/><ellipse cx="48" cy="${32 + ry}" rx="${rx - 4}" ry="${ry * 0.6}" fill="${C.tongue}"/>`,
        ) + `<path d="${d}" fill="none" ${OUT}/>`,
      );
    }
    case 'scream': {
      const d = 'M 22 10 Q 48 4 74 10 Q 84 60 48 62 Q 12 60 22 10 Z';
      return svg(
        96,
        64,
        clipped(
          d,
          `<rect width="96" height="64" fill="${C.mouth}"/><ellipse cx="48" cy="60" rx="22" ry="16" fill="${C.tongue}"/>` +
            `<path d="M 0 8 L 96 8 L 96 22 Q 48 28 0 22 Z" fill="${C.white}"/>`,
        ) + `<path d="${d}" fill="none" ${OUT}/>`,
      );
    }
    case 'grit': {
      const d = 'M 12 22 Q 48 14 84 22 L 82 44 Q 48 52 14 44 Z';
      let teeth = '';
      for (let x = 24; x < 84; x += 12)
        teeth += `<path d="M ${x} 18 L ${x} 50" stroke="${C.out}" stroke-width="3"/>`;
      return svg(
        96,
        64,
        clipped(
          d,
          `<rect width="96" height="64" fill="${C.white}"/>${teeth}<path d="M 0 33 L 96 33" stroke="${C.out}" stroke-width="3"/>`,
        ) + `<path d="${d}" fill="none" ${OUT}/>`,
      );
    }
    case 'smug':
      return svg(
        96,
        64,
        `<path d="M 16 38 Q 44 44 70 30 Q 80 24 84 14" fill="none" ${ol(7)}/><path d="M 82 20 L 88 26" fill="none" ${ol(5)}/>`,
      );
    case 'worried':
      return svg(96, 64, `<path d="M 12 38 Q 26 24 40 38 T 68 38 T 86 32" fill="none" ${ol(7)}/>`);
    case 'dead':
      return svg(
        96,
        64,
        `<path d="M 16 22 Q 48 14 80 22" fill="none" ${ol(7)}/>` +
          shape('M 40 24 Q 40 58 52 58 Q 66 58 62 24 Z', C.tongue, 5) +
          `<path d="M 52 28 L 52 46" stroke="#c0405a" stroke-width="3" stroke-linecap="round"/>`,
      );
    default:
      throw new Error(kind);
  }
}

export function wormAssets() {
  const out = {
    'character/body-normal': bodyStrip(),
    'character/body-hurt': bodyStrip({
      tint: { base: '#f2d4c8', sh: '#d8a0a8', deep: '#b07a96', hi: '#fff0ee' },
      bruise: true,
    }),
    'character/body-poison': bodyStrip({
      tint: { base: '#d8e8a0', sh: '#a8c870', deep: '#7aa060', hi: '#f4ffd0' },
    }),
    'character/bandana': bandana(),
    'character/pupil': pupil(),
  };
  for (const k of ['open', 'half', 'closed', 'wide', 'squint', 'dead'])
    out[`character/eye-${k}`] = eye(k);
  for (const k of ['neutral', 'angry', 'worried', 'raised', 'sad'])
    out[`character/brow-${k}`] = brow(k);
  for (const k of [
    'smile',
    'open',
    'talk-a',
    'talk-b',
    'scream',
    'grit',
    'smug',
    'worried',
    'dead',
  ])
    out[`character/mouth-${k}`] = mouth(k);
  return out;
}
