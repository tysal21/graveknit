import { Game } from "../src/engine/game";
import { seeded } from "../src/engine/rng";
import { tutFinish } from "../src/engine/tutorial";

/** a new game with a fixed random seed, tutorial skipped */
export function newGame(seed = 1) {
  const g = new Game(null, seeded(seed));
  tutFinish(g, true);
  return g;
}
