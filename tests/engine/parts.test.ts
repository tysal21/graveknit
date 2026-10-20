import { describe, expect, it } from "vitest";
import { affixValue, allowedTiers, makePart, partName, tierOdds } from "../../src/engine/parts";
import { newGame } from "../helpers";

describe("affix tiers", () => {
  it("unlocks tiers at the right item levels (T4 at 3, T3 at 8, T2 at 20, T1 at 35)", () => {
    expect(allowedTiers(1)).toEqual([5]);
    expect(allowedTiers(3)).toEqual([5, 4]);
    expect(allowedTiers(8)).toEqual([5, 4, 3]);
    expect(allowedTiers(20)).toEqual([5, 4, 3, 2]);
    expect(allowedTiers(35)).toEqual([5, 4, 3, 2, 1]);
  });

  it("tier odds always add up to 100%", () => {
    for (const il of [1, 3, 8, 20, 35]) {
      const sum = Object.values(tierOdds(il)).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1);
    }
  });
});

describe("parts", () => {
  it("gives Commons no affixes, Magic 2 and Rare 4", () => {
    const g = newGame();
    expect(makePart(g, "houndSkull", 5, "common").affixes).toHaveLength(0);
    expect(makePart(g, "houndSkull", 5, "magic").affixes).toHaveLength(2);
    expect(makePart(g, "houndSkull", 5, "rare").affixes).toHaveLength(4);
  });

  it("never rolls the same affix twice on a part", () => {
    const g = newGame(7);
    for (let i = 0; i < 200; i++) {
      const p = makePart(g, "watchRib", 9, "rare");
      expect(new Set(p.affixes.map((a) => a.k)).size).toBe(4);
    }
  });

  it("makes trophies Rare", () => {
    const g = newGame();
    expect(makePart(g, "lanternCore", 10, "magic").rarity).toBe("rare");
  });

  it("names Magic parts with their prefix and suffix", () => {
    const g = newGame();
    const p = makePart(g, "gnawedHand", 1, "magic");
    p.affixes = [{ k: "mutilating", t: 5, roll: 0.5, locked: false }, { k: "frenzy", t: 5, roll: 0.5, locked: false }];
    expect(partName(p)).toBe("Mutilating Gnawed Hand of Frenzy");
  });

  it("produces real numbers for every affix value (no NaN)", () => {
    const g = newGame(3);
    for (let i = 0; i < 300; i++) {
      const p = makePart(g, "cleaverArm", 1 + (i % 10), "rare");
      for (const a of p.affixes) expect(Number.isFinite(affixValue(a, p.ilvl))).toBe(true);
    }
  });
});
