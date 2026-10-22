# Worms revival: generated art

## Current production pipeline

Use `npm run art:desktop` to rebuild **all 736 PNGs** from native masters, preserving RGB and
continuous alpha. `npm run art:audit` inventories every on-disk PNG; `npm run art:test` checks
dimensions, visibility, crop/animation contracts and RGBA preservation.
See [current delivery](../../docs/design/asset-delivery.md) for sources, scope and browser QA.
The historical `ingest.mjs` / `arsenal.mjs` quantized CLI entrypoints below are disabled.
Their helpers remain only for old algorithm regression tests and source IO/geometry.

`npm run art:skins` rebuilds 36 character atlases and two equipment atlases, plus the offline
pose viewer. Masters: ignored `assets-in/skins/`; exact built-in-imagegen prompts:
`skin-animation-prompts.mjs`, `skin-animation-repairs.json`, `skin-equipment.prompt.txt`.
The blocked dominatrix costume remains concept-only. A distinct closed-uniform commander
was approved and added to that family; its exact prompt is `skin-commander.prompt.txt`.
Four-member families: `skin-roster-prompts.mjs` adds 16 identities; spacing corrections
are recorded in `skin-roster-repairs.json`. No crowded/ambiguous sheet is silently sliced.
The ninth class, Nocturne, adds four adult stage-fashion identities via built-in imagegen:
`skin-nocturne-prompts.mjs` contains exact stage and costume-edit prompts, and
`skin-nocturne-status.json` records the two delivered latex edits and two refused edits
whose completed leather-stage originals ship instead. Coiled belt whips are costume only.
See [animation delivery](../../docs/design/worm-animations.md) for class capacities and limitations.
Browser acceptance: `node tools/art/skin-game-check.mjs http://127.0.0.1:5174/`.

## Historical first-batch pipeline (superseded)

This is the original environment/creatures/props batch. It is not a complete game-art inventory:
see [`asset-inventory.md`](../../docs/design/asset-inventory.md) for the supplemental arsenal pack,
legacy provenance caveat and remaining work.

The additional pack is built with `npm run art:arsenal` from three sheets and two selected
replacement icons. Its exact prompts and reviewed crop grid live in `arsenal-sources.json` and
`arsenal-repairs.json`. Outputs: `apps/client/public/assets/arsenal/` (48 PNGs + manifest/report).
Run `node tools/art/arsenal-check.mjs http://127.0.0.1:5174/` against a running dev client.

Requires Node 22.18+ (native TypeScript stripping) and ImageMagick 7 (`magick`).
The processor imports the renderer's `snap` and DB32 directly, without a duplicate palette.

```sh
node tools/art/ingest.mjs meadow/bg-mid.png
node tools/art/ingest.mjs --all
node tools/art/ingest.mjs --all --normalize
node --test tools/art/ingest.test.mjs
node tools/art/review.mjs
```

Inputs are in ignored `assets-in/`, following `docs/design/chatgpt-art-prompts.md`.
`--all` requires all 27 production inputs; the style reference is not a game asset.
The complete set produces 66 PNGs: 16 backgrounds, 16 terrain tiles/strips,
16 creature frames, 16 props, the original logo reading exactly `Worms revival`,
and a 159×74 nearest-neighbour menu derivative (`ui/logo-menu`).

Outputs and a separate version-2 `manifest.json` go to
`apps/client/public/assets/generated/`. Paths in this manifest are relative to that
directory. Existing art and the game's current manifest are not replaced.
`acceptance.json` records dimensions, source colour counts, output palette counts,
transparent pixels, connected islands, and seam error before/after processing.
Islands are diagnostic only: a single sprite may contain disconnected details.

Reduction selects the most frequent source colour in each block, then applies
DB32 and the asset's colour subset read from its prompt in the design document.
Magenta within 40 channel levels is treated as transparent before block
voting; original alpha is thresholded at 128. Sky and fill reject transparent
source pixels. Unexpected aspect ratios or fractional block sizes are errors.
Layers must touch the bottom and fit their documented height limits; repair
generation rather than silently rescale incorrect composition.

Some actual generations return 1254×1254 square canvases, shifted terrain bands,
or layers slightly above the requested height. `--normalize` explicitly enables
nearest-neighbour canvas normalization, occupied-row detection of the three
terrain bands, and vertical fitting of over-height layers. This leaves source
files untouched and records each adjustment in `acceptance.json` and stderr.
Wrong aspect ratios, missing/merged terrain bands and invalid sheet cells still
fail. Use this flag to reproduce the delivered set; the default remains strict.

Sheets use fixed 4×4 cells, checked for empty cells and artwork touching cell
borders. Creature cells retain their 32×32 frames and original alignment.
Props are cropped and fitted proportionally to their documented bounding size,
or 20×20 for props without a documented size. Their export names follow the
sheet table, including underscores; consumer mappings are a separate task.

Tile edges receive a symmetric premultiplied edge blend up to 24 logical pixels
wide when they differ, then DB32 quantization and binary alpha. Review repeated
tile previews visually: exact edge equality alone does not guarantee good art.

Generation uses the built-in image tool. Keep raw results and exact prompts
under `assets-in/`, and attach the chosen style reference on every request.
The first milestone (style reference plus meadow middle layer) was approved
by the owner on 2026-10-21; generation of the remaining assets is authorized.

After that approval, create contact sheets for both sprite sheets and repeat
previews for tiles, plus composed theme previews at 640×360 and 1280×720.
These are asset review compositions, not screenshots of integrated game art.
`npm run art:review` validates all 66 images against the manifest, prompt palette
and seam requirements before producing these previews in `assets-in/previews/`.

The client now loads this manifest after the legacy pack. Generated backgrounds,
destructible terrain textures, animals, projectiles and props are used wherever
the corresponding game state exists; missing assets keep their existing fallback.
Standing donkey, open crate and broken crate are reserve variants: there are no
matching persistent entity states in the current simulation.

For browser integration validation, start the dev server and run:

```sh
node tools/art/integration-check.mjs http://127.0.0.1:5174/
```

This checks four themes, different parallax speeds, integer pixel scale, crater
repainting, animated creatures and props, menu fit, and a missing-pack fallback.
Actual in-game screenshots are saved to `assets-in/previews/integration/`.
