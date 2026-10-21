/** Rebuild every legacy path from new detailed masters and deterministic animation composition. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readImage } from './ingest.mjs';
import {
  writer,
  sheet,
  empty,
  blit,
  fitArt,
  canvas,
  densityFor,
  publicRoot,
} from './desktop-world.mjs';

const sources = JSON.parse(readFileSync(new URL('./legacy-hd-sources.json', import.meta.url)));
const named = (name) => {
  const spec = sources.find((s) => s.name === name),
    cells = sheet(spec.source);
  return Object.fromEntries(spec.cells.map((id, i) => [id, cells[i]]));
};

/** Rotation is an animation derivation of a detailed master, not an AI redraw or legacy upscale. */
export function rotate(im, angle) {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  const w = Math.ceil(Math.abs(im.w * c) + Math.abs(im.h * s)) + 2;
  const h = Math.ceil(Math.abs(im.w * s) + Math.abs(im.h * c)) + 2;
  const out = empty(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = x - w / 2,
        dy = y - h / 2;
      const sx = Math.floor(dx * c + dy * s + im.w / 2),
        sy = Math.floor(-dx * s + dy * c + im.h / 2);
      if (sx < 0 || sy < 0 || sx >= im.w || sy >= im.h) continue;
      im.data.copy(out.data, (y * w + x) * 4, (sy * im.w + sx) * 4, (sy * im.w + sx) * 4 + 4);
    }
  return out;
}
function bandMask(im) {
  const mask = empty(im.w, im.h);
  for (let i = 0; i < im.data.length; i += 4) {
    const [r, g, b, alpha] = im.data.subarray(i, i + 4);
    if (alpha && g > r * 1.2 && b > r * 1.2 && g > 65 && b > 65) {
      const shade = Math.max(r, g, b);
      mask.data.set([shade, shade, shade, alpha], i);
      im.data.fill(0, i, i + 4);
    }
  }
  return mask;
}
export function buildLegacy() {
  const out = writer(''),
    entries = Object.entries(out.manifest.assets).filter(
      ([id]) => !id.endsWith('_band') && id !== 'worm/idle_blink',
    );
  const icons = { ...named('icons-a'), ...named('icons-b') },
    weapons = named('weapons');
  icons.madcow = weapons.madcow;
  const states = named('worm-states'),
    walks = named('worm-walk');
  const sprite = (pack, id) => readImage(resolve(publicRoot, pack, `${id}.png`));
  const creature = (name) => sprite('generated', `creatures/${name}`);
  const object = (name) => sprite('generated', `objects/${name}`);
  const projectile = {
    grenade: weapons.grenade,
    cluster: weapons.cluster,
    bomblet: weapons.grenade,
    banana: weapons.banana,
    hhg: weapons.hhg,
    dynamite: weapons.dynamite,
    rocket: sprite('military', 'vfx/rocket_0'),
    arrow: weapons.arrow,
    pigeon: creature('pigeon_0'),
    sheep: creature('sheep_0'),
    supersheep: creature('supersheep_0'),
  };
  const body = (pose, w = 128, h = 128) => {
    const art = fitArt(pose, w * 0.75, h * 0.75);
    return blit(empty(w, h), art, (w - art.w) / 2, (h * 29) / 32 - art.h);
  };
  const hold = (weapon, angle, pose = states.idle_0, phase = 0) => {
    const result = body(pose),
      art = rotate(fitArt(weapon, 64, 36), angle);
    blit(result, art, 76 - art.w / 2 + Math.sin(phase) * 2, 75 - art.h / 2);
    return result;
  };
  const parachute = (payload, w, h, phase) => {
    const result = empty(w, h),
      canopy = fitArt(object('parachute'), w * 0.94, h * 0.58);
    blit(result, canopy, (w - canopy.w) / 2 + Math.sin(phase) * 2, 0);
    const art = fitArt(payload, w * 0.6, h * 0.47);
    return blit(result, art, (w - art.w) / 2, h * 0.91 - art.h);
  };
  const outputPose = (id, im, a, operations) => {
    const mask = bandMask(im);
    out.put(id, im, a, 'assets-in/desktop/worm-{states,walk}.png; desktop/weapons.png', operations);
    out.put(
      `${id}_band`,
      mask,
      { ...a, file: `${id}_band.png` },
      'cyan headband mask extracted from new master',
      ['separate tintable team layer'],
    );
  };
  for (const [id, a] of entries) {
    const density = densityFor(id, a),
      w = a.w * density,
      h = a.h * density;
    let im,
      source,
      operations = ['native detailed master', `density ${density}`];
    if (id.startsWith('weapons/icon/')) {
      const name = id.split('/').at(-1);
      if (!icons[name]) throw new Error(`Missing icon master: ${id}`);
      im = canvas(icons[name], w, h, density);
      source = 'assets-in/desktop/icons-{a,b}.png; desktop/weapons.png';
    } else if (id.startsWith('worm/')) {
      const name = id.split('/')[1];
      let pose = states[name] ?? walks[name];
      if (name.startsWith('tumble_'))
        pose = rotate(
          states[`tuck_${Number(name.split('_')[1]) % 4}`],
          (Math.floor(Number(name.split('_')[1]) / 4) * Math.PI * 2) / 3,
        );
      if (!pose) throw new Error(`Missing worm pose: ${id}`);
      outputPose(id, body(pose, w, h), a, [...operations, 'stable feet anchor 29/32']);
      continue;
    } else if (id.startsWith('hold/')) {
      const [, name, index] = id.match(/^hold\/(.+)_(\d+)$/),
        i = Number(index);
      const angle = i < 4 ? ((-i / 3) * Math.PI) / 2 : (((i - 4) / 4) * Math.PI) / 2;
      outputPose(id, hold(weapons[name], angle), a, [
        ...operations,
        'new body + weapon',
        `aim angle ${angle}`,
      ]);
      continue;
    } else if (id.startsWith('act/')) {
      const [, name, index] = id.match(/^act\/(.+)_(\d+)$/),
        i = Number(index);
      const count = entries.filter(([key]) => key.startsWith(`act/${name}_`)).length,
        phase = (i / Math.max(1, count - 1)) * Math.PI;
      if (name === 'teleport') {
        im = body(states.idle_0);
        // Detailed body dissolves in staggered scanline bands, not a magnified old frame.
        for (let y = 0; y < im.h; y++)
          if ((Math.floor(y / 4) + i) % 5 < i) im.data.fill(0, y * im.w * 4, (y + 1) * im.w * 4);
      } else if (name === 'surrender')
        im = hold(icons.surrender, -0.6 + Math.sin(phase) * 0.25, states.surrender, phase);
      else if (name === 'firepunch')
        im = hold(icons.firepunch, -Math.sin(phase) * 0.7, walks.punch, phase);
      else if (name === 'prod')
        im = hold(weapons.prod, -0.15 * Math.sin(phase), walks.reach, phase);
      else if (name === 'sheep' || name === 'supersheep')
        im = hold(creature(`${name}_0`), 0, walks.crouch);
      else if (['grenade', 'cluster', 'banana'].includes(name))
        im = hold(weapons[name], -0.6, states.throw);
      else
        im = hold(
          weapons[name],
          name === 'blowtorch' ? Math.sin(phase) * 0.15 : 0.5,
          name === 'blowtorch' ? states[`idle_${i % 4}`] : walks.crouch,
          phase,
        );
      outputPose(id, im, a, [
        ...operations,
        'detailed master composition',
        `action phase ${i}/${count}`,
      ]);
      continue;
    } else if (id.startsWith('chute/')) {
      outputPose(
        id,
        parachute(states.idle_0, w, h, (Number(id.split('/')[1]) / 10) * Math.PI * 2),
        a,
        [...operations, 'new canopy + body composition'],
      );
      continue;
    } else if (id.startsWith('spin/')) {
      const [, name, index] = id.match(/^spin\/(.+)_(\d+)$/),
        count = entries.filter(([key]) => key.startsWith(`spin/${name}_`)).length;
      const angle = (Number(index) / count) * (name === 'grenade' ? Math.PI : Math.PI * 2);
      im = canvas(rotate(projectile[name === 'mortar' ? 'bomblet' : name], angle), w, h, density);
      source = 'assets-in/desktop/weapons.png';
      operations.push(`rotation ${angle}`);
    } else if (id.startsWith('head/')) {
      im = canvas(
        rotate(projectile[id.includes('rocket') ? 'rocket' : 'supersheep'], a.angle ?? 0),
        w,
        h,
        density,
      );
      source = 'detailed rocket / sheep master';
      operations.push(`heading ${a.angle}`);
    } else if (id.startsWith('proj/')) {
      const name = id.split('/')[1];
      const base = name.replace(/_\d+$/, '').replace('sheepwalk', 'sheep');
      const index = Number(name.match(/_(\d+)$/)?.[1] ?? 0);
      const art = base === 'sheep' ? creature(`sheep_${index % 2}`) : projectile[base];
      if (!art) throw new Error(`Missing projectile: ${id}`);
      im = canvas(art, w, h, density);
      source = 'new detailed weapon / creature / rocket master';
    } else if (id.startsWith('objects/crate-health-chute_')) {
      im = parachute(
        object('crate_health'),
        w,
        h,
        (Number(id.split('_').at(-1)) / 12) * Math.PI * 2,
      );
      source = 'assets-in/sheets/props.png';
      operations.push('canopy + crate composition');
    } else if (id.startsWith('objects/')) {
      const name =
        {
          'crate-weapon': 'crate_weapon',
          'crate-health': 'crate_health',
          mine: 'mine_off',
          tombstone: 'grave_slab',
        }[id.split('/')[1]] ?? id.split('/')[1];
      im = canvas(object(name), w, h, density);
      source = 'assets-in/sheets/props.png';
    } else throw new Error(`Uncovered legacy image: ${id}`);
    out.put(id, im, a, source, operations);
  }
  const a = out.manifest.assets['worm/idle_0'];
  outputPose('worm/idle_blink', body(states.idle_blink), { ...a, file: 'worm/idle_blink.png' }, [
    'new blink pose',
  ]);
  out.finish();
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildLegacy();
