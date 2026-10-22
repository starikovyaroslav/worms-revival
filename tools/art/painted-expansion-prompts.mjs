/** Deterministic prompt inventory for the approved painted direction, not an image API runner. */
import { readFileSync, writeFileSync } from 'node:fs';
const reference = 'docs/design/concepts/visual-pilot-v2/meadow-pilot-v1.png';
const base =
  'Use case: stylized-concept. Production raster asset for a side-view 2D artillery game. Image 1 is ONLY the approved STYLE REFERENCE. Match its expressive early-2000s hand-painted cartoon, broad volumetric forms, rich unquantized colours, upper-left light, thin coloured contour, readable silhouettes. NOT photorealistic, NOT pixel art. No dithering, posterization, scanlines, noise, text, labels, logos, watermark, ground shadows or scenery unless specifically requested. Preserve continuous soft alpha edges.';
const jobs = [];
const add = (id, prompt, transparent = true, grid) =>
  jobs.push({
    id,
    prompt: base + '\n' + prompt,
    transparent,
    reference,
    output: `assets-in/painted-expansion/${id}.png`,
    ...(grid ? { grid } : {}),
  });
const themes = {
  desert: {
    sky: 'Clear warm pale turquoise sky fading to cream at the horizon, a few broad ivory clouds, quiet hot daylight. No sun disk, terrain or silhouettes.',
    far: 'very distant pale dusty rose mesa silhouettes, low contrast warm haze',
    mid: 'distant muted ochre mesas and broad flat-topped sandstone buttes, calm large shapes',
    near: 'still distant muted terracotta sandstone slopes, a few sparse small cactus silhouettes grouped together, no tiny texture',
    soil: 'warm ochre sandstone and sand cross-section, broad geological strata, a few large embedded rounded red-brown stones, no speckled noise or roots',
    rim: 'pale golden sand cap over warm sandstone, broad smooth irregular dunes, NO grass',
    water: 'deep turquoise oasis water with broad white-cream foam crests, no land',
  },
  arctic: {
    sky: 'Cold blue daylight sky fading to pale icy cyan at the horizon, a few broad soft ivory clouds. No sun disk, terrain or silhouettes.',
    far: 'very distant pale desaturated blue angular snowy mountain silhouettes, low contrast atmospheric haze',
    mid: 'distant blue-grey rounded glacier ridges and broad snow fields, calm readable shapes',
    near: 'still distant muted blue-grey snowy foothills with sparse grouped fir-tree silhouettes, no foreground texture',
    soil: 'icy blue-grey frozen earth cutaway with a few broad embedded grey boulders, smooth blue ice lenses and large geological strata, no speckled noise',
    rim: 'thick rounded ivory SNOW cap over blue-grey frozen earth with a few short icicles, NO grass',
    water:
      'cold deep navy-blue water with broad pale cyan-white foam crests, no land or floating ice objects',
  },
  hell: {
    sky: 'Ominous dark purple charcoal NIGHT sky fading to muted burnt red haze at bottom. A few broad purple-grey smoke clouds, no sun, stars, terrain or silhouettes. Background must stay quiet behind gameplay.',
    far: 'very distant muted dark plum volcanic mountain silhouettes, low contrast reddish atmospheric haze',
    mid: 'distant purple-brown volcanic ridges and a few broad basalt spires, no glowing cracks, quiet large shapes',
    near: 'still distant dark charcoal broad basalt slopes and grouped jagged rock silhouettes, subtle muted red rimlight, no tiny texture',
    soil: 'dark warm charcoal and purple-brown volcanic rock cutaway, broad readable fractured strata, a FEW muted ember-orange crevices, no uniform glowing lattice, no speckled noise',
    rim: 'charcoal volcanic ash cap over dark purple-brown cracked basalt with sparse dull embers, NO grass or continuous bright lava border',
    water:
      'molten lava SURFACE, deep dark burnt red body with broad rolling orange crests and sparse hot yellow foam-like strokes, not blue water, no land',
  },
};
for (const [theme, spec] of Object.entries(themes)) {
  for (const name of ['sky', 'far', 'mid', 'near'])
    add(
      `${theme}-${name}`,
      name === 'sky'
        ? `Landscape 3:1 seamless panoramic SKY ONLY. ${spec.sky} Opaque full bleed. Matching left/right colours.`
        : `Landscape 3:1 horizontal seamless PARALLAX LAYER ONLY: ${spec[name]}. Upper 45 percent genuinely transparent, continuous hill ridge near middle, lower half completely filled to BOTTOM EDGE in muted uniform layer colour. Left/right ridge same height/colour; no margins at sides or bottom. No sky, water, characters, props or UI.`,
      name !== 'sky',
    );
  add(
    `${theme}-soil`,
    `Square seamless underground MATERIAL TILE ONLY: ${spec.soil}. Flat front-facing cutaway, not a platform or island. Fill every pixel opaque. Match edges left/right AND top/bottom. NO surface rim, snow cap, grass, sky, horizon, water, bevel, cast shadow or small-grain noise.`,
    false,
  );
  add(
    `${theme}-edges`,
    `Landscape 2:1 terrain ribbon SHEET: EXACTLY FOUR full-width HORIZONTAL RIBBONS, centred in four equal rows. Each ribbon only central 45 percent of row height; WIDE transparent horizontal gutters. Cut ends at both side edges for horizontal tiling, matching height/colour left/right. Row 1 TOP EDGE: ${spec.rim}. Row 2 UNDERSIDE: hanging ${spec.soil}, material ABOVE irregular lower edge, short roots only in desert, transparent BELOW. Row 3 SCORCHED EDGE: dark charred ash rim, broad readable material, no flame. Row 4 BARE ROCK EDGE: broad rounded muted stone rim matching biome, no surface cap. All four ribbons are straight horizontal material strips, NOT isolated islands. True alpha background.`,
  );
  add(
    `${theme}-water`,
    `Landscape 3:1 horizontally seamless surface STRIP: ${spec.water}. Upper25percent fully transparent, painted rolling crest around upperthird, ALL pixels below crest opaque to bottomedge. Bottomedge uniform dark bodycolour. Matching crest height and colour left/right. No side or bottom margins. Broad brush shapes, not photorealistic reflections.`,
    true,
  );
}
const sheet = (id, cells, grid = 4, extra = '') => {
  add(
    id,
    `Square production SPRITE SHEET, EXACTLY ${grid} columns x ${grid} rows. ${grid * grid} isolated complete assets. Read LEFT TO RIGHT, TOP TO BOTTOM. Each object centred and fits only central 60 percent of its cell, generous clear transparent gutters. Strict side-on view unless icon. True transparent background, NO ground line or shadow. Never touch neighbouring cells or canvas edge. ${extra}\n${cells.map((c, i) => `Cell ${i + 1}: ${c.description ?? c.id}.`).join('\n')}`,
    true,
    grid,
  );
  jobs.at(-1).cells = cells;
};
const readPack = (p) =>
  JSON.parse(readFileSync(`apps/client/public/assets/${p ? `${p}/` : ''}manifest.json`)).assets;
const legacy = readPack(''),
  generated = readPack('generated'),
  arsenal = readPack('arsenal');
const icons = { ...legacy, ...arsenal };
const descriptions = Object.fromEntries(
  JSON.parse(readFileSync('tools/art/arsenal-sources.json'))
    .flatMap((s) => s.cells)
    .filter((c) => c.id)
    .map((c) => [c.id, c.description]),
);
const core = {
  bazooka: 'olive military shoulder-fired RPG launcher pointing RIGHT, clear grip and sight',
  homing: 'olive guided missile launcher with red targeting lens pointing RIGHT',
  mortar: 'military mortar tube on a broad stable bipod base',
  grenade: 'olive segmented hand grenade with silver pin',
  cluster: 'red cluster grenade with dark segmentation',
  handgun: 'compact dark steel combat pistol pointing RIGHT',
  uzi: 'compact black submachine gun pointing RIGHT',
  shotgun: 'long wooden-stock pump shotgun pointing RIGHT',
  minigun: 'heavy six-barrel rotary gun pointing RIGHT',
  longbow: 'curved wooden longbow with an arrow',
  firepunch: 'clenched cartoon fist surrounded by orange flame',
  prod: 'extended cartoon index finger',
  sheep: 'white woolly sheep with black face',
  supersheep: 'white sheep wearing blue cape',
  pigeon: 'grey courier pigeon with tiny harness',
  dynamite: 'red dynamite bundle and burning fuse',
  mine: 'round olive proximity landmine with red indicator',
  banana: 'curved yellow banana',
  hhg: 'ornate gold holy grenade with small cross',
  airstrike: 'aggressive A-10 inspired ground-attack jet silhouette',
  blowtorch: 'compact metal blowtorch with nozzle pointing RIGHT',
  drill: 'orange heavy power drill pointing RIGHT',
  girder: 'steel girder section',
  bat: 'wooden baseball bat',
  rope: 'metal grappling pistol pointing RIGHT with coiled rope',
  parachute: 'open ivory military parachute canopy',
  teleport: 'cyan electric portal device',
  skipgo: 'rounded forward arrow',
  surrender: 'white cloth flag',
  petrol: 'small glass petrol bottle with cloth fuse',
  madcow: 'angry black-white cow',
  skunk: 'black-white skunk with striped tail',
  donkey: 'grey angry donkey',
};
const iconCells = Object.entries(icons)
  .filter(([id]) => id.startsWith('weapons/icon/'))
  .map(([id, a]) => ({
    id,
    w: a.w,
    h: a.h,
    description: descriptions[id] ?? core[id.split('/').at(-1)] ?? id.split('/').at(-1),
  }));
for (let i = 0; i < iconCells.length; i += 16)
  sheet(
    `icons-${i / 16}`,
    iconCells.slice(i, i + 16),
    i + 16 > iconCells.length ? 2 : 4,
    'Inventory ICONS, strong readable symbols, not UI panels, no hands or characters around equipment. Guns point RIGHT.',
  );
const propsDescriptions = [
  'rough stone grave cross',
  'rounded aged stone gravestone',
  'rectangular stone grave slab',
  'stone grave with carved cartoon skull',
  'olive weapon supply crate with small blank ammo emblem',
  'cream medical supply crate with red cross',
  'blue utility supply crate with simple cog emblem',
  'open wooden supply crate with hinged lid',
  'olive military fuel barrel with yellow warning stripe',
  'same military fuel barrel with small orange flames at top',
  'dark olive round proximity mine with unlit indicator',
  'same round proximity mine with lit red indicator',
  'open ivory military parachute canopy with taut suspension lines, no passenger',
  'broken wooden supply crate with snapped planks',
  'bundle of red dynamite with short burning fuse',
  'dark metal petrol canister',
];
const props = Object.entries(generated)
  .filter(([id]) => id.startsWith('objects/'))
  .map(([id, a], i) => ({ id, w: a.w, h: a.h, description: propsDescriptions[i] }));
sheet('props', props);
const creaturesDescriptions = [
  'white woolly sheep facing RIGHT, standing',
  'same white sheep facing RIGHT, walking step',
  'white super sheep with blue cape facing RIGHT, wings tucked',
  'same super sheep flying with cape flowing',
  'grey courier pigeon facing RIGHT, wings raised',
  'same pigeon wings lowered',
  'brown mole with digging claws facing RIGHT',
  'same mole in digging stride',
  'angry black-white dairy cow facing RIGHT',
  'grumpy hunched elderly woman with grey hair and handbag, full body, closed purple dress, cartoon weapon creature',
  'angry grey donkey standing facing RIGHT',
  'black-white skunk with fluffy tail facing RIGHT',
  'yellow banana pointing RIGHT',
  'same banana with split peel',
  'small curling green stink cloud with broad lobes',
  'grey donkey falling feet downward, facing RIGHT',
];
sheet(
  'creatures',
  Object.entries(generated)
    .filter(([id]) => id.startsWith('creatures/'))
    .map(([id, a], i) => ({ id, w: a.w, h: a.h, description: creaturesDescriptions[i] })),
);
const projectileNames = [
  'grenade',
  'cluster',
  'bomblet',
  'banana',
  'hhg',
  'dynamite',
  'rocket',
  'arrow',
  'meteor',
  'vase',
  'shard',
  'bullet',
  'mbbomb',
  'dragonball',
  'napalm',
  'carpet',
];
const projectileDescriptions = [
  'olive grenade',
  'red cluster grenade',
  'small red bomblet',
  'yellow banana',
  'gold holy grenade with small cross',
  'red dynamite with lit fuse',
  'olive military rocket red band, POINTING RIGHT, NO exhaust',
  'wooden arrow steel tip POINTING RIGHT',
  'large dark meteor with broad orange burning fissures',
  'ornate blue ceramic vase',
  'sharp blue ceramic shard',
  'small brass bullet POINTING RIGHT',
  'large round dark bomb with lit fuse',
  'orange glowing energy sphere',
  'small dark napalm canister with orange band',
  'rolled red patterned carpet',
];
sheet(
  'projectiles',
  projectileNames.map((name, i) => ({
    id: `proj/${name}`,
    w: { ...legacy, ...arsenal }[`proj/${name}`].w,
    h: { ...legacy, ...arsenal }[`proj/${name}`].h,
    description: projectileDescriptions[i],
  })),
);
const gear = [
  ['skins/weapons/bazooka', 'RPG shoulder launcher olive tube and steel sight, pointing RIGHT'],
  ['skins/weapons/handgun', 'small dark combat pistol pointing RIGHT'],
  ['skins/weapons/shotgun', 'long pump shotgun pointing RIGHT'],
  ['skins/weapons/uzi', 'compact Uzi submachine gun pointing RIGHT'],
  ['skins/weapons/minigun', 'large six-barrel minigun pointing RIGHT'],
  ['skins/weapons/longbow', 'wooden recurve bow, vertical, taut string'],
  ['skins/weapons/flamethrower', 'heavy flamethrower barrel and handgrip pointing RIGHT'],
  ['skins/weapons/sheeplauncher', 'oversized olive wide-bore launcher pointing RIGHT'],
  ['skins/weapons/blowtorch', 'compact brass blowtorch pointing RIGHT'],
  ['skins/weapons/drill', 'industrial orange power drill pointing RIGHT'],
  ['skins/weapons/rope', 'grappling hook pistol pointing RIGHT'],
  [
    'skins/equipment/mortar-base',
    'ground mortar BASE ONLY, low broad bipod and baseplate, no tube',
  ],
  ['skins/equipment/mortar-barrel', 'ground mortar TUBE ONLY pointing RIGHT, no base'],
  ['skins/equipment/radio', 'small dark military radio remote with antenna'],
  ['skins/equipment/detonator', 'compact red-plunger handheld detonator'],
  ['objects/jetpack', 'military twin tank jet backpack no flame'],
];
sheet(
  'equipment',
  gear.map(([id, description]) => ({ id, description, w: 32, h: 24 })),
);
const effects = [
  ['steam', 'broad soft white steam cloud expanding in four chronological stages'],
  ['gas', 'toxic green gas cloud with purple core expanding in four chronological stages'],
  ['ghost', 'translucent blue cartoon worm ghost rising, mischievous face, four animation stages'],
  ['scorch', 'horizontal charred black ground scar with broad cracks, four spreading stages'],
  [
    'incendiary',
    'broad orange ground flame plume expanding into rolling dark smoke, four chronological stages',
  ],
  [
    'energy',
    'bright cyan violet electrical blast ring with a broad bright core expanding in four chronological stages',
  ],
  [
    'nuke',
    'huge orange-white mushroom cloud developing then darkening in four chronological stages',
  ],
  [
    'engine',
    'horizontal orange rocket exhaust plume pointing LEFT from nozzle on RIGHT, four flicker stages',
  ],
  [
    'letter',
    'sealed cream envelope with red wax seal rotating slightly as it falls, four animation stages',
  ],
  [
    'missile',
    'olive military rocket with red band POINTING RIGHT, no exhaust, four stages with tiny fin vibration',
  ],
  [
    'homing',
    'dark guided missile with yellow band POINTING RIGHT, no exhaust, four fin vibration stages',
  ],
  [
    'rocket_mk2',
    'heavy dark aggressive guided rocket with orange band POINTING RIGHT, no exhaust, four fin vibration stages',
  ],
];
for (let i = 0; i < effects.length; i += 4) {
  const group = effects.slice(i, i + 4);
  sheet(
    `effects-${i / 4}`,
    group.flatMap(([name, desc]) =>
      [0, 1, 2, 3].map((frame) => ({
        id: `vfx/${name}_${frame}`,
        description: `${name}, stage ${frame + 1} of 4: ${desc}`,
      })),
    ),
    4,
    'VFX ANIMATION: each ROW is one four-frame chronological sequence. Keep row identity and common scale across all four frames, last stage still visible. Effects only, never characters, floor or panel.',
  );
}
for (const [id, desc] of [
  [
    'attack',
    'A-10 inspired twin engine straight-wing ground-attack aircraft, aggressive military silhouette',
  ],
  ['gunship', 'AC-130 inspired four turboprop heavy gunship with angular fuselage, side cannon'],
  [
    'stealth',
    'B-2 inspired sinister black flying-wing stealth bomber, recognisable sawtooth trailing edge',
  ],
])
  sheet(
    `aircraft-${id}`,
    [0, 1, 2, 3].map((i) => ({
      id: `vfx/${id}_${i}`,
      description: `The SAME ${desc}, facing RIGHT in strict side-view, entire wings and tail safely inside cell. Stage ${i + 1}: ${['closed bomb bay, normal navigation lights', 'closed bomb bay, navigation light blink', 'opening lower bomb bay doors', 'open lower bomb bay, one small bomb just below release slot'][i]}`,
    })),
    2,
    'Four consistent animation frames, one identical aircraft silhouette and size across all cells. Not cute toy planes, no faces, no logos or insignia, no sky, NO engine trails. Painted stylized military machinery, not a photograph.',
  );
add(
  'materials',
  'Square texture atlas with EXACTLY TWO COLUMNS and TWO ROWS of opaque full-bleed MATERIAL TILES, no gutters, labels or borders. Top-left: broad rounded neutral grey stone strata, a few large quiet rock masses, no pebbly noise. Top-right: broad dark worn steel plates with a few restrained bevel highlights, no bolts, logos or rivet noise. Bottom-left: dark charred earth with broad ash cracks. Bottom-right: muted warm ochre clay strata. Every quadrant is a flat side-on material, no scene, perspective, object, floor, shadow or outline. All four are horizontally and vertically seamless tiles. Broad painted shapes matching reference, not photographic texture.',
  false,
);
add(
  'logo',
  'Transparent landscape game LOGO only. Exact title: "Worms revival". Big bold sculpted ivory lettering with thin charcoal contour and subtle warm olive metal backing; playful aggressive 2D painted artillery aesthetic matching reference. Title must be correctly spelled and fully readable. One small olive rocket and a broad curl of painted smoke as restrained accents, no characters or scenery. Single horizontal wordmark, generous clear alpha padding around the entire design. No tiny details, pixels, slogans, watermark or additional text.',
  true,
);
sheet(
  'supplemental',
  [
    {
      id: 'skins/equipment/mortar-barrel',
      w: 32,
      h: 24,
      description:
        'A detached military MORTAR TUBE ONLY. Perfectly HORIZONTAL, axis left-to-right, open muzzle at RIGHT, closed base at LEFT. No diagonal angle, NO vertical tilt, NO bipod or stand, NO hands. The game rotates this horizontal tube to aim.',
    },
    {
      id: 'objects/petrol-bottle',
      w: 10,
      h: 14,
      description:
        'small green glass petrol bottle with dark liquid and a cloth wick at top, wick gently burning',
    },
    {
      id: 'proj/frenchsheep',
      w: 16,
      h: 16,
      description:
        'white woolly rocket-propelled sheep with red beret facing RIGHT and a compact orange exhaust flame behind it',
    },
    {
      id: 'creatures/nun',
      w: 16,
      h: 20,
      description:
        'grumpy elderly cartoon woman in a fully covered traditional black nun habit and white coif, hunched with handbag, full body, facing RIGHT',
    },
  ],
  2,
);
writeFileSync('tools/art/painted-expansion-prompts.json', JSON.stringify(jobs, null, 2) + '\n');
console.log(`${jobs.length} built-in generation jobs; ${iconCells.length} inventory icons`);
