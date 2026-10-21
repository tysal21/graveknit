import { describe, expect, it } from "vitest";
import { makePart } from "../../src/engine/parts";
import { matchesSearch } from "../../src/ui/panels/StitcheryPanel";
import { newGame } from "../helpers";

describe("Stitchery search", () => {
  it("matches names, slots, rarity, tiers and abilities; every word must match", () => {
    const g = newGame();
    const p = makePart(g, "houndSkull", 8, "magic");
    p.affixes = [{ k: "brutal", t: 3, roll: 0.5, locked: false }, { k: "frenzy", t: 4, roll: 0.5, locked: false }];
    expect(matchesSearch(p, "")).toBe(true);
    expect(matchesSearch(p, "hound")).toBe(true);
    expect(matchesSearch(p, "SKULL frenzy")).toBe(true);
    expect(matchesSearch(p, "magic t3")).toBe(true);
    expect(matchesSearch(p, "attack speed")).toBe(true);
    expect(matchesSearch(p, "rare")).toBe(false);
    expect(matchesSearch(p, "frenzy ribcage")).toBe(false);
    expect(matchesSearch(makePart(g, "diggerArm", 3, "common"), "bury")).toBe(true);
  });
});
