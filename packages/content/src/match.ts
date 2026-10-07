import { Rng, WORM_H, WORM_HALF_W, type GameSetup } from '@wr/sim';
import { findSurfaces, generateMap, pickSpread, type MapStyle } from '@wr/mapgen';
import { schemeById } from './schemes';

export interface TeamConfig {
  name: string;
  worms: string[];
  /** 0 = human player, 1..5 = computer difficulty. */
  cpu: number;
}

/** Everything needed to recreate a match exactly: the basis for replays and netplay. */
export interface MatchConfig {
  seed: number;
  style: MapStyle;
  themeId: string;
  schemeId: string;
  teams: TeamConfig[];
}

/** Builds the deterministic starting state for a match: map, worm spawns, mines and drums. */
export function buildGameSetup(cfg: MatchConfig): GameSetup {
  const scheme = schemeById(cfg.schemeId);
  const map = generateMap({ seed: cfg.seed, style: cfg.style });
  const surfaces = findSurfaces(map.terrain, {
    halfWidth: WORM_HALF_W,
    height: WORM_H,
    waterMargin: 40,
    waterLevel: map.waterLevel,
  });
  const rng = new Rng(cfg.seed ^ 0x5eed);
  const wormCount = scheme.wormsPerTeam * cfg.teams.length;
  const picks = pickSpread(surfaces, wormCount + scheme.mines + scheme.barrels, 70, rng);
  // Worms get the most spread-out spots; objects fill in between.
  const spawns = pickSpread(picks, wormCount, 150, rng);
  const rest = picks.filter((p) => !spawns.includes(p));
  const objects = rest.slice(0, scheme.mines + scheme.barrels).map((p, i) => ({
    kind: i < scheme.mines ? ('mine' as const) : ('barrel' as const),
    x: p.x,
    y: p.y,
  }));
  return {
    seed: cfg.seed,
    scheme,
    teams: cfg.teams.map((t) => ({ name: t.name, worms: t.worms })),
    terrain: map.terrain,
    waterLevel: map.waterLevel,
    spawns,
    objects,
    cavern: cfg.style === 'cavern',
  };
}
