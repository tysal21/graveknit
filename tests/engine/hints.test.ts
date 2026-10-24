import { describe, expect, it } from "vitest";
import { TUNE } from "../../src/content/tune";
import { equip } from "../../src/engine/crafting";
import { makePart } from "../../src/engine/parts";
import { checkHints } from "../../src/engine/tutorial";
import { newGame } from "../helpers";

/** a game where every other one-time tip has already been shown */
function quietGame() {
  const g = newGame();
  for (const k of ["hInfuse", "hGens", "hDig", "hAct3", "hGrind", "hRestitch", "hSquad2", "hBoss"]) g.s.seen[k] = 1;
  return g;
}

describe("graft tip", () => {
  it("waits until a worn part could actually take a graft", () => {
    const g = quietGame();
    equip(g, makePart(g, "houndSkull", 5, "magic"));
    makePart(g, "houndSkull", 5, "magic");
    g.s.marrow = 0;
    g.s.dust = 0;
    checkHints(g);
    expect(g.s.hint).toBeFalsy();

    g.s.marrow = TUNE.graftMarrow;
    g.s.dust = TUNE.graftDust;
    checkHints(g);
    expect(g.s.hint).toBe("graft");
  });

  it("shows only once", () => {
    const g = quietGame();
    g.s.seen.hGraft = 1;
    equip(g, makePart(g, "houndSkull", 5, "magic"));
    makePart(g, "houndSkull", 5, "magic");
    g.s.marrow = TUNE.graftMarrow;
    g.s.dust = TUNE.graftDust;
    checkHints(g);
    expect(g.s.hint).toBeFalsy();
  });
});
