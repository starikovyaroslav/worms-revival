# Worms revival — delivered art set

> Historical first-batch report. Current delivery: [698 PNGs, full desktop density and native RGBA](../../docs/design/asset-delivery.md).
> The DB32/binary-alpha claims below describe the superseded original export only.

This document covers the original 66-PNG batch, not all artwork needed by the game.
The supplemental 48-PNG arsenal pack and remaining gaps are tracked in
[`asset-inventory.md`](../../docs/design/asset-inventory.md).

Generated on 2026-10-21 with the built-in imagegen tool, using the owner-approved
style reference for every request. The logo reads exactly **Worms revival**.
The selected source set contains 28 images including the style reference.
Exact prompts and originals are preserved in ignored `assets-in/`.

## Outputs

66 game PNGs live in `apps/client/public/assets/generated/`:

- 16 background layers: sky, far, mid, near for meadow, arctic, desert and hell.
- 16 terrain images: fill, rim, scorch, under for each theme.
- 16 creature frames and 16 props, in the source document's sheet order.
- One logo, cropped to its artwork bounds (317×147 logical pixels).
- A compact 159×74 menu version, derived with nearest-neighbour resizing.

The separate version-2 manifest retains the existing game's manifest contract.
The client loads this manifest after the legacy art pack. Backgrounds and terrain
use the selected theme's generated layers/tiles; creatures and props use generated
sprites with legacy/procedural fallbacks. Terrain art follows the current
destructible collision mask and dirty-region updates without changing simulation.
`acceptance.json` records source dimensions, color counts, alpha, connected islands,
edge error and normalization operations for every exported asset.

## Validation and review

All 66 PNGs match their manifest dimensions, use binary alpha, stay within DB32
and their prompt-specific palettes, and have matching required tile edges.
Seven processor tests pass, plus the project's typecheck, lint and terrain-art tests.
Two full exports of the original 65-image set were compared byte-for-byte: identical.
PNG date metadata is stripped so regeneration does not introduce timestamp diffs.
Compositions of all four themes were visually reviewed alongside both sprite
contact sheets and the logo. Repeated tile previews are also retained.

Open `assets-in/previews/themes-contact.png`, `creatures-contact.png`,
`objects-contact.png` and `logo-x4.png`. Individual theme compositions are provided
at 640×360 and 1280×720. These are review compositions.
Actual menu and match screenshots are in `assets-in/previews/integration/`.
The browser check covers all four themes, menu fit at three resolutions, parallax,
animated creatures, props, live crater repainting and missing-pack fallback.

## Generation adjustments

The generator returned 1254×1254 for square inputs, shifted the terrain bands,
and made some background layers slightly too tall. Use explicit `--normalize`
to reproduce the delivered set. It retains raw files and records nearest-neighbour
resizing, band extraction and height fitting; default ingestion remains strict.
The meadow near layer was repaired once before fitting. The props sheet was
repaired to remove an unwanted crate hanging below the parachute.

The generated logo's crop is larger/taller than the brief's approximate 220×70
target. Its lettering and mascot are preserved in the original; the compact
menu derivative prevents the title from pushing the start button off screen.
Neither image generation nor edge equality guarantees perfect art. The review
previews preserve the actual delivered appearance for final owner inspection.

```sh
npm run art:ingest -- --all --normalize
npm run art:review
npm run art:test
node tools/art/integration-check.mjs http://127.0.0.1:5174/
```
