/** Exact reproducible prompts for built-in imagegen; this module itself never calls a service. */
import { SKINS } from '../../packages/render/src/skins.ts';
import { readFileSync } from 'node:fs';
export const acting = {
  heavy:
    'Heavy deliberate acting: braced broad neck, low center of mass, short forceful tail pushes, restrained breathing; hurt is an angry flinch, attack is a planted forceful punch, victory a proud clenched-fist salute.',
  soft: 'Soft flabby acting: belly and folds squash and lag behind the head; four walk poses show a clear soft inchworm compression then extension. Broad soft landing, startled hurt, awkward committed throw, relieved bashful victory. Keep adult face.',
  glam: 'Confident adult glamour acting: poised raised chin, fluid S-curved body, elegant controlled tail strides and hair follow-through. Stylish aim and throw, offended hurt expression, theatrical confident victory. Non-explicit fashion character acting.',
  dominant:
    'Composed imperious adult acting: very upright neck, minimal deliberate tail strides, exact controlled gestures and a commanding confident gaze. Braced precise aim, sharp throw and strike, offended narrowed eyes when hurt, triumphant hand-on-hip victory. Preserve the opaque latex costume and harness. No sexual actions.',
  elder:
    'Elderly acting: visibly stooped neck and shoulders, careful compressed inchworm shuffle, small hunched jump, deep slow landing pose, cranky hurt face; surprisingly emphatic throw and scolding punch; pleased stubborn victory. Age expressed through posture, never a younger face.',
  sick: 'Weary sickly acting: drooping neck, shallow strained breathing, slack tail shuffle, tired eyes; four distinct shuffle poses, cautious jump, slumped landing, wince and forehead-tissue gesture. Aim steadies the body, throw is determined but tired, exhausted relieved victory. No gore.',
  veteran:
    'Capable injured-veteran acting: characteristic asymmetrical supported posture and tail brace; four walk phases explicitly plant the crutch, shift weight, move tail, recover. Keep the crutch in every grounded pose; airborne poses tuck it alongside body. One free hand aims, throws and strikes. Defiant hurt, proud salute victory. No mockery or gore.',
  classic:
    'Scrappy nimble acting: elastic elongated neck, clear energetic four-phase inchworm gait with tail compression and stretch, lively jumping and landing, cheeky aiming squint, snappy throw and punch, mischievous fist-pump victory.',
};
export const jobs = SKINS.filter((skin) => skin.id !== 'commander-femme').map((skin) => ({
  ...skin,
  reference: `docs/design/concepts/worm-skins-${skin.sheet}/${skin.id}.png`,
  output: `assets-in/skins/${skin.id}.png`,
  prompt: `Use case: identity-preserve.
Asset type: PRODUCTION 16-pose game animation sprite sheet for one adult anthropomorphic worm.
Image1 is the EXACT approved character identity. Preserve face, age, sex, hair, body mass, skin colors, clothes, materials, scars and accessories in ALL SIXTEEN CELLS. This is a new animation sheet of that character, not a comparison of different characters.
Acting direction: ${acting[skin.profile]}
Layout: square 1536x1536, EXACTLY four equal columns and four equal rows, sixteen complete full-body sprites, facing RIGHT in side/three-quarter view. Every cell has generous FULLY TRANSPARENT gutters on all sides. Common feet/tail ground baseline and same character scale throughout; even the jumping pose sits on the same baseline because world position will be animated by the game. Fit the largest pose into the central 75 percent of its cell. Never crop hair, hands, tails or crutches.
EXACT ROW-MAJOR POSES:
ROW1: 1 neutral idle breathing pose; 2 same idle pose with BOTH EYES CLOSED for blink; 3 walk phase1 tail planted/body reaching forward; 4 walk phase2 tail pulling forward/body compressing.
ROW2: 5 walk phase3 body arched/tail pushing; 6 walk phase4 body extending to recover; 7 jumping pose stretched upward with hands raised slightly; 8 falling pose with tense eyes, tail tucked beneath body.
ROW3: 9 landing pose visibly compressed; 10 hurt pose visibly wincing and leaning back; 11 aiming pose BOTH EMPTY HANDS extended to the right at chest level to hold an independently rendered gun; 12 throwing pose hand extended forward after release, NO thrown object.
ROW4: 13 melee punch pose one hand extended forcefully right; 14 rope hanging pose both hands raised together above head, NO rope drawn; 15 defeat pose alive but slumped, disappointed face; 16 victory pose joyful/proud gesture appropriate to character, NO flag.
All characters are ADULT. Preserve worm anatomy: segmented body, long upright neck, curling tail, NO human legs. No weapons, scenery, floor, cast shadows, particles, extra objects, text, labels, grids, logos or watermarks. Hands can be floating cartoon hands; keep required costume and crutch/brace. Non-explicit fully clothed glamour, no nudity or sexual actions. Detailed polished early-2000s grotesque raster game art, sharp fine outlines, volumetric multi-tone materials matching reference, NO huge pixel blocks and NO forced 32-color palette. GENUINE transparent alpha background, not a checkerboard. SAME CHARACTER AND SCALE IN EVERY CELL.`,
}));
jobs.push({
  ...SKINS.find((skin) => skin.id === 'commander-femme'),
  reference: 'docs/design/concepts/worm-skins-v2/commando-femme.png',
  output: 'assets-in/skins/commander-femme.png',
  prompt: readFileSync(new URL('./skin-commander.prompt.txt', import.meta.url), 'utf8').trim(),
});
