/** Exact built-in imagegen production jobs for four distinct members in every class. */
const definitions = [
  [
    'officer-ice',
    'Ледяная инспекторша',
    'dominant',
    'Mature adult woman with an angular narrow face, ice-grey eyes, short SILVER PIXIE hair, cool pale peach skin. CLOSED NAVY OFFICER COAT in matte wool with high collar, silver seam trim, navy gloves. Cold analytical authority, a small knowing smile; slim upright worm neck and compact coiled tail.',
  ],
  [
    'officer-red',
    'Рыжая надзирательница',
    'dominant',
    'Adult woman with COPPER RED HAIR in a thick braid behind the head, freckles, arched brows, sly confident smile. CLOSED BURGUNDY FIELD JACKET with practical charcoal shoulder panels, high zipped collar, black gloves. Lean peach segmented worm body, self-assured commanding posture.',
  ],
  [
    'officer-iron',
    'Железная начальница',
    'dominant',
    'Stocky mature adult woman, broad square face, short BLACK BUZZ CUT, a small healed cheek scar, hard dark eyes and stern mouth. CLOSED BLACK PADDED FIELD JACKET with steel-grey shoulder panels and high collar, charcoal gloves. Thick upright worm neck and strong curled segmented tail, uncompromising presence.',
  ],
  [
    'brutal-sapper',
    'Брутальный сапёр',
    'heavy',
    'Burly adult male worm, BALD HEAD, dense dark full BEARD, broad jaw, fierce grin, amber work goggles resting on forehead. MUSTARD canvas work vest over a closed charcoal shirt, dark gloves. Huge broad worm neck, muscular thick segmented tail, heavy deliberate stance. No tools attached.',
  ],
  [
    'brutal-brawler',
    'Брутальная громила',
    'heavy',
    'Burly adult female worm, wide angular face, DARK SHORT BUZZ CUT, healed eyebrow scar, fierce grin. STEEL BLUE armored canvas vest over closed dark field shirt, fingerless gloves. Broad neck, powerful stocky segmented body and curled tail; noticeably heavier and wider than a slim officer.',
  ],
  [
    'soft-cook',
    'Добродушный повар',
    'soft',
    'Very chubby adult male worm with round cheeks, drooping dark MOUSTACHE, kind anxious eyes, small soft WHITE COOK CAP. Cream closed shirt and pale GREEN APRON stretched over large soft belly, bare cartoon hands. Warm peach body with several soft folds, big sagging belly and broad curled tail. Bashful friendly temperament. No utensils.',
  ],
  [
    'soft-artist',
    'Мечтательная художница',
    'soft',
    'Very chubby adult female worm with round cheeks, large round SPECTACLES, dark curls under a PURPLE BERET. Closed MUSTARD SWEATER with blue overall bib, bare cartoon hands. Warm peach skin, soft folded belly and broad curled segmented tail. Dreamy gentle distracted expression; clearly adult face, not a child. No brushes or props.',
  ],
  [
    'glam-cabaret',
    'Кабаретная дива',
    'glam',
    'Adult cabaret-star woman worm with sophisticated mature face, emerald eyes, rich RED WAVY HAIR in a 1940s side wave, stylish makeup and confident smile. Elegant CLOSED EMERALD VELVET TAILORED JACKET with high neckline, tiny gold brooch and full sleeves, emerald gloves. Slender peach segmented worm neck and graceful curled tail. Charismatic theatrical character, non-erotic stage fashion, no low neckline or cleavage.',
  ],
  [
    'elder-captain',
    'Старый капитан',
    'elder',
    'Elderly male worm with deeply lined sun-weathered face, bushy WHITE FULL BEARD and brows, NAVY PEAKED CAP, stubborn sharp eyes. Old closed NAVY DOUBLE-BREASTED COAT with dull brass buttons. Stooped wrinkled neck, thin folded peach segmented tail, dignified cranky temperament. No pipe or props.',
  ],
  [
    'elder-professor',
    'Старая профессорша',
    'elder',
    'Elderly female worm with deeply wrinkled face, thin WHITE BRAID and wispy bangs, small round reading SPECTACLES, stern inquisitive eyes. Closed BURGUNDY KNITTED CARDIGAN with cream collar. Thin hunched wrinkled peach worm neck and tightly curled segmented tail, thoughtful scolding temperament. No books or props.',
  ],
  [
    'sickly-clerk',
    'Простуженный клерк',
    'sick',
    'Weary sickly ADULT male worm with gaunt sallow olive-peach face, tired red-rimmed eyes, thin MOUSTACHE, round wire SPECTACLES and floppy brown wool hat. CLOSED WORN BROWN JACKET and bulky GREY SCARF. Long drooping neck, slack thin segmented worm tail, determined but exhausted expression. No gore or fluids or props.',
  ],
  [
    'sickly-nurse',
    'Усталая санитарка',
    'sick',
    'Weary sickly ADULT female worm with medium brown skin and subdued olive undertone, tired lined eyes, short BURGUNDY CURLS tied back, a small plain cool patch on forehead. CLOSED SAGE MEDICAL WORK JACKET and white scarf, plain gloves, no insignia. Drooping long neck and slack segmented tail, compassionate but exhausted temperament. No gore, fluids, medical symbols or props.',
  ],
  [
    'veteran-sailor',
    'Ветеран-моряк',
    'veteran',
    'Capable injured ADULT male veteran worm, weathered face, GREY STUBBLE, navy KNIT CAP, one healed eyebrow scar. Closed NAVY STRIPED SAILOR SHIRT, dark glove. Distinct fixed STEEL TAIL BRACE and ONE FOREARM CRUTCH supporting his posture; keep brace and crutch visible in every grounded pose. Peach segmented body and curled tail. Tough wry expression, dignified competent fighter, no gore.',
  ],
  [
    'veteran-aviator',
    'Ветеранка-лётчица',
    'veteran',
    'Capable injured ADULT female veteran worm, lined face, cropped SILVER HAIR, BROWN FLIGHT CAP with goggles resting on top, assured grin. CLOSED BROWN SHEARLING FLIGHT JACKET and dark glove. Fixed STEEL TAIL BRACE and ONE FOREARM CRUTCH supporting asymmetrical stance; keep both in every grounded pose. Warm peach segmented worm neck and curled tail. Proud practical temperament, no gore.',
  ],
  [
    'classic-punk',
    'Нахальный панк',
    'classic',
    'Scrappy ADULT male worm with angular cheeky face, PURPLE MOHAWK, narrow dark brows, mischievous toothy grin. Plain closed dark tee and BLACK DENIM VEST with two small dull metal studs. Long elastic peach segmented neck, lean curled tail, lively rebellious expression, bare cartoon hands. No weapons or props.',
  ],
  [
    'classic-scout',
    'Нахальная разведчица',
    'classic',
    'Scrappy ADULT female worm with freckled face, BROWN PONYTAIL, GREEN HEADBAND, bright eyes and cheeky lopsided grin. CLOSED OLIVE SCOUT JACKET with simple canvas shoulder panels, dark gloves. Long lean peach segmented neck and elastic curled tail. Lively bold curious temperament. No weapons or props.',
  ],
];
const refs = {
  dominant: 'apps/client/public/assets/skins/commander-femme.png',
  heavy: 'docs/design/concepts/worm-skins-v1/brutal.png',
  soft: 'docs/design/concepts/worm-skins-v1/soft.png',
  glam: 'docs/design/concepts/worm-skins-v1/glam-femme.png',
  elder: 'docs/design/concepts/worm-skins-v1/elder.png',
  sick: 'docs/design/concepts/worm-skins-v1/sickly.png',
  veteran: 'docs/design/concepts/worm-skins-v1/veteran.png',
  classic: 'docs/design/concepts/worm-skins-v1/classic.png',
};
const acting = {
  dominant:
    'Upright economical commanding posture, short precise tail strides, restrained breathing, sharp punch, cold offended flinch, proud fist-salute victory.',
  heavy:
    'Heavy low-center-of-mass acting, broad planted stance, short forceful tail pushes, angry flinch, strong braced punch and clenched-fist victory.',
  soft: 'Belly and soft folds visibly lag and squash, awkward inchworm compression/extension, startled flinch, soft broad landing, bashful relieved victory.',
  glam: 'Poised lifted chin, graceful S-curve, fluid tail strides, hair follow-through, stylish aim and throw, offended flinch, theatrical confident victory.',
  elder:
    'Stooped careful compressed shuffle, small hunched jump, deep slow landing, cranky flinch, emphatic scolding punch, pleased stubborn victory. Remain elderly in all poses.',
  sick: 'Drooping neck, shallow weary breathing, slack tired shuffle, cautious jump, slumped landing, exhausted flinch, determined tired throw and relieved victory.',
  veteran:
    'Asymmetric supported movement: walk1 plant crutch, walk2 shift weight, walk3 move tail, walk4 recover crutch. Airborne crutch tucked alongside body. One free hand aims, throws and punches; other supports the crutch on ground. Proud salute victory. No mockery.',
  classic:
    'Elastic long neck and energetic inchworm compression/stretch gait, nimble jump, bouncy landing, cheeky aiming squint, snappy throw and punch, mischievous fist-pump victory.',
};
export const rosterJobs = definitions.map(([id, name, profile, subject]) => ({
  id,
  name,
  profile,
  sheet: 'v3',
  reference: refs[profile],
  output: `assets-in/skins/${id}.png`,
  prompt: `Use case: stylized-concept.
Asset type: production 16-pose game animation sheet for ONE adult anthropomorphic worm.
Image 1 is STYLE ONLY. Match finely shaded early-2000s grotesque raster game artwork, warm volumetric skin and worm anatomy. Do NOT copy that character's identity or clothes; create the new individual described below, NOT a recolor.
Subject: ${subject}
Acting: ${acting[profile]}
Layout: square 1536x1536, EXACTLY 4 columns and 4 rows, 16 full-body sprites facing RIGHT in side/three-quarter view. Same face, body size, age, hair, clothes and accessories throughout. Common tail-bottom ground baseline, including jumping poses (world motion handled by game). Every pose fits CENTRAL 68% of its cell; generous fully transparent margins on ALL sides. Keep fingers, hair, tails and crutches complete. No cropping.
EXACT ROW-MAJOR POSES:
ROW1: 1 neutral idle; 2 same idle BOTH EYES CLOSED for blink; 3 walk1 body reaches/tail planted; 4 walk2 tail pulled in/body compressed.
ROW2: 5 walk3 body arched/tail pushing; 6 walk4 extending/recovering; 7 jump stretched upward; 8 fall tense eyes/tail tucked.
ROW3: 9 landing compressed crouch; 10 hurt flinch leaning back; 11 aim EMPTY HANDS forward at chest level (gun rendered separately); 12 throw follow-through EMPTY hand extended forward after release.
ROW4: 13 melee punch forward right; 14 rope hanging both hands together above head; 15 defeat alive but slumped/disappointed; 16 victory expressive proud gesture matching temperament.
Veterans keep required brace and crutch: one free hand for aim/throw/punch; in rope pose tuck crutch alongside tail. All other characters have no props. Preserve segmented worm anatomy, upright long neck and curled tail, NO human legs. Adults only, fully clothed in practical non-erotic outfits; no sexualized actions or clothing, no nudity, cleavage, latex, corsets or fetish accessories.
Detailed crisp raster shading and fine outlines, rich original color gradients, NO forced 32-color palette or huge pixel blocks. TRUE TRANSPARENT ALPHA, not checkerboard. No weapons, ammunition, rope, floor, shadows, scenery, particles, labels, gridlines, text, logos, watermarks or extra characters.`,
}));
