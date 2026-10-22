import { Game } from "../src/engine/game";
import { seeded } from "../src/engine/rng";
import { tutFinish } from "../src/engine/tutorial";

/** a new game with a fixed random seed, tutorial skipped */
export function newGame(seed = 1) {
  const g = new Game(null, seeded(seed));
  tutFinish(g, true);
  return g;
}

/** skip the enemy's walk-in, so a test can fight it straight away */
export function arrive(g: Game) {
  if (g.foe) g.foe.walk = 0;
}
