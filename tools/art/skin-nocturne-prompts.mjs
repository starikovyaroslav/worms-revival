/** Exact built-in-imagegen requests: revised stage outfits after owner rejected jackets. */
const subjects = [
  [
    'nocturne-velvet',
    'Бархатная госпожа',
    'Mature adult woman worm, angular face, sleek BLACK BOB, arched brows, red lipstick and a knowing confident smile. BLACK LEATHER sculpted strapless stage CORSET TOP with straight high bust line, opaque full torso coverage, silver front buckles, bare shoulders, separate long black opera gloves and a slim silver-ring choker. Peach segmented worm tail.',
  ],
  [
    'nocturne-crimson',
    'Багровая бунтарка',
    'Mature adult woman worm, freckled face, RED SIDE-SWEPT UNDERCUT hair, bold eyeliner and a rebellious grin. BURGUNDY LEATHER asymmetric ONE-SHOULDER stage top with opaque full torso coverage, broad diagonal black buckle belt, small brass studs, one long glove and one fingerless glove, slim black choker. Peach segmented worm tail.',
  ],
  [
    'nocturne-silver',
    'Серебряный церемониймейстер',
    'Mature adult man worm, strong mature jaw, SILVER slicked-back hair, neatly trimmed dark beard, raised eyebrow and a charming smirk. BLACK LEATHER sleeveless high-neck fitted stage tunic, bare muscular arms, decorative silver chest buckles over the solid opaque tunic, wide metal belt, studded wrist cuffs and black fingerless gloves. Broad peach segmented worm tail.',
  ],
  [
    'nocturne-violet',
    'Фиолетовая хищница',
    'Mature adult woman worm with deep brown skin, VIOLET HIGH PONYTAIL, gold hoop earrings, sophisticated makeup and a self-assured smile. PLUM LEATHER halterneck stage bodice with opaque full torso coverage, bare shoulders, solid high front panel, gold clasps and wide buckled waist belt, separate long plum opera gloves and gold choker. Deep brown segmented worm tail.',
  ],
];
export const stageJobs = subjects.map(([id, name, subject]) => ({
  id,
  name,
  profile: 'nocturne',
  sheet: 'v4',
  reference: 'apps/client/public/assets/skins/glam-cabaret.png',
  output: `assets-in/skins/${id}.png`,
  prompt: `Use case: stylized-concept.
Asset type: production 16-pose game sprite sheet of ONE adult anthropomorphic worm.
Reference image is STYLE AND WORM ANATOMY ONLY. Create a NEW distinct identity, not a recolor of the reference. Match detailed early-2000s grotesque raster game art, warm volumetric shading and fine outlines.
Subject: ${subject}
Mood: bold confident adult gothic stage couture, commanding gaze and poised silhouette. Fashion editorial game character, fully opaque costume covering chest and torso, ordinary game actions. NO jacket, coat, nudity, exposed cleavage, lingerie, erotic posing or props.
Acting: poised upright neck, deliberate precise four-phase inchworm stride with visible tail compression/extension, lifted chin, sharp aim/throw/punch, proud theatrical fist-pump victory. Hair follows movement.
Layout: square 1536x1536, EXACTLY 4 equal columns and 4 equal rows, 16 separate full-body sprites facing RIGHT in side/three-quarter view. Same adult identity, costume and size in every cell. Fit EVERY pose inside CENTRAL 65% of its cell with wide completely transparent gutters on all sides; no touching neighboring sprites, no clipping. Common tail-bottom baseline even for airborne poses. Keep hands, hair and curled tail complete.
EXACT ROW-MAJOR POSES:
ROW1: neutral idle; same idle BOTH EYES CLOSED blink; walk1 tail planted/body reaching; walk2 tail pulled in/body compressed.
ROW2: walk3 body arched/tail pushing; walk4 body extending/recovering; jump stretched upward; fall tense with tail tucked.
ROW3: landing compressed crouch with hands low; hurt flinch leaning back; aim EMPTY HANDS extended RIGHT at chest level; throw follow-through EMPTY hand extended RIGHT.
ROW4: melee punch RIGHT; rope hanging hands together above head with NO rope; defeat alive but slumped/disappointed; victory proud fist-pump.
Worm anatomy: long upright segmented neck and curling tail, NO human legs. Floating cartoon hands allowed. TRUE transparent alpha background. Rich gradients, fine raster detail, no forced limited palette, no large pixel blocks. No floor, cast shadows, scenery, particles, text, labels, gridlines, watermark or extra characters.`,
}));

/** Final owner-requested costume pass; identity, anatomy and the sixteen actions stay fixed. */
export const costumeJobs = stageJobs.map((job) => ({
  ...job,
  reference: `assets-in/skins/stage/${job.id}.png`,
  prompt: `Use case: identity-preserve.
Asset type: final production 16-pose adult worm game sprite sheet.
Edit this supplied sheet. Keep EXACTLY the same four-by-four layout, sixteen poses, adult character face, hairstyle, skin tone, worm anatomy, size, orientation and fully transparent background. Preserve complete fingers, hair and tails with generous gutters on all sides. Keep blink closed and all four walk phases distinct. No human legs.
Change only costume details: turn existing opaque leather stage costume into glossy opaque LATEX in the SAME color. Keep its current neckline and full chest/torso coverage. Add a clear ring CHOKER and a decorative leather HARNESS with silver buckle straps OVER the opaque costume. Preserve bare shoulders and the original gloves/cuffs. Add a SMALL neatly COILED BLACK WHIP clipped to the BACK/SIDE waist belt, visible as a compact loop with a short handle, never held, never extended, never crossing hands. Keep this attached belt accessory consistently in all sixteen frames.
Acting remains commanding and self-assured, exactly these normal game actions, no sexual behavior, no nudity, no restraints on the body. No jacket. Empty hands in aim/throw/punch remain free for separately rendered game weapons. Do not add weapons to hands, labels, grid lines, scenery, floor, shadows or other characters. Finely shaded raster game art; TRUE transparent alpha background.`,
}));

// Two costume edits were refused; ship their completed leather-stage originals.
// Never label an attempted edit as a delivered image or silently retry a refusal.
export const nocturneJobs = stageJobs.map((job) =>
  ['nocturne-velvet', 'nocturne-silver'].includes(job.id)
    ? costumeJobs.find((edit) => edit.id === job.id)
    : job,
);
