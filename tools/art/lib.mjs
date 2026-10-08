// Shared palette and helpers for procedurally authored SVG art.
// Everything is code, so a palette or outline change restyles the whole set at once.

export const C = {
  out: '#2a1a24',
  // Worm skin
  skin: '#ffd9ae',
  skinSh: '#e8a08e',
  skinDeep: '#c27a86',
  skinHi: '#fff3dc',
  // Neutrals
  white: '#fffdf6',
  paper: '#e9e4f2',
  steel: '#9aa0b4',
  steelSh: '#6e7490',
  steelHi: '#d4d8e6',
  // Hot colours
  red: '#d8403a',
  redSh: '#a82a30',
  redHi: '#ff8a78',
  yellow: '#ffd23a',
  orange: '#ff8a30',
  wood: '#c8884a',
  woodSh: '#9a6234',
  woodHi: '#e8b078',
  olive: '#6f9a3a',
  oliveSh: '#4a7230',
  oliveHi: '#b4d868',
  mouth: '#7a2438',
  tongue: '#f06a7e',
};

export const svg = (w, h, body, vb = `0 0 ${w} ${h}`) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${body}</svg>`;

/** Outline style used on every shape. */
export const ol = (w = 5) =>
  `stroke="${C.out}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** A filled shape with outline. */
export const shape = (d, fill, w = 5) => `<path d="${d}" fill="${fill}" ${ol(w)}/>`;

let uid = 0;
export const id = (p = 'c') => `${p}${++uid}`;

/** A clip group: draw `inner` only inside the path `d`. */
export const clipped = (d, inner) => {
  const k = id('clip');
  return `<clipPath id="${k}"><path d="${d}"/></clipPath><g clip-path="url(#${k})">${inner}</g>`;
};
