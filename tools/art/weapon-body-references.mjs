import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, readImage, writeImage, cut } from './ingest.mjs';
import { empty, blit } from './desktop-world.mjs';
import { SKINS } from '../../packages/render/src/skins.ts';
const dir = resolve(root, 'docs/design/concepts/combat-motion-v1');
mkdirSync(dir, { recursive: true });
const skins = SKINS.filter((s) =>
  existsSync(resolve(root, `apps/client/public/assets/skins/${s.id}.png`)),
);
const jobs = [];
for (let group = 0; group < 3; group++) {
  const members = skins.slice(group * 16, group * 16 + 16),
    grid = members.length === 4 ? 2 : 4;
  const sheet = empty(192 * grid, 192 * grid);
  for (const [i, skin] of members.entries())
    blit(
      sheet,
      cut(
        readImage(resolve(root, `apps/client/public/assets/skins/${skin.id}.png`)),
        0,
        0,
        192,
        192,
      ),
      (i % grid) * 192,
      Math.floor(i / grid) * 192,
    );
  const reference = `docs/design/concepts/combat-motion-v1/weapon-bodies-${group + 1}-reference.png`;
  writeImage(resolve(root, reference), sheet);
  const prompt = `Use case: identity-preserve. Asset type: production transparent game character torso rig sprites. Reference image: a ${grid} by ${grid} sheet of ${members.length} DIFFERENT adult cartoon worm identities, one identity per cell. Edit each character in-place: preserve the EXACT identity, face, hair, costume, colors, worm anatomy, body pose, curled tail and relative character scale. Remove both arms and hands from EVERY character, replacing their painted area with the natural uninterrupted torso/costume surface. No stumps, no holes, no detached limbs. The arms will be separate animated sprites in the game, so this MUST be an armless neutral torso sheet. All characters face right. Keep the same ${grid} by ${grid} layout and character ordering, with generous completely transparent gutters. Render at higher native resolution with smooth hand-painted comic shading and crisp dark contours, not pixel art. No new characters, no weapons, no labels, no watermark, no background or ground shadows. Every full worm body and tail is fully visible and isolated within its cell. Keep all clothing fully covering the same body areas as the reference. Exactly ${members.length} figures. The only anatomical change is removing the arms and hands, not altering the head, torso or tail. Transparent PNG.`;
  const stem = `docs/design/concepts/combat-motion-v1/weapon-bodies-${group + 1}`;
  writeFileSync(resolve(root, `${stem}.prompt.txt`), prompt + '\n');
  jobs.push({
    grid,
    members: members.map((s) => s.id),
    reference,
    output: `${stem}.png`,
    prompt: `${stem}.prompt.txt`,
  });
}
writeFileSync(resolve(dir, 'weapon-body-jobs.json'), JSON.stringify(jobs, null, 2) + '\n');
