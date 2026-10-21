import { describe, expect, it } from "vitest";
import { TUNE } from "../../src/content/tune";
import { migrate } from "../../src/engine/save";
import { countRareLuck, rareChance } from "../../src/engine/stash";
import type { Part } from "../../src/engine/state";
import { newGame } from "../helpers";

const drop = (rarity: Part["rarity"]) => ({ rarity }) as Part;

describe("Rare luck", () => {
  it("doubles the Rare odds every few misses and resets on a Rare", () => {
    const g = newGame();
    const base = rareChance(g);
    expect(base).toBeCloseTo(TUNE.rarityW.rare / 100, 5);
    for (let i = 0; i < TUNE.rareDoubleEvery; i++) countRareLuck(g, drop("magic"));
    // twice the Rare weight against the same Common + Magic weight
    expect(rareChance(g)).toBeCloseTo((2 * 7) / (93 + 2 * 7), 5);
    countRareLuck(g, drop("rare"));
    expect(g.s.rareDry).toBe(0);
    expect(rareChance(g)).toBeCloseTo(base, 5);
  });

  it("stops rising at the cap", () => {
    const g = newGame();
    g.s.rareDry = 500;
    expect(rareChance(g)).toBeCloseTo(TUNE.rareCapW / (93 + TUNE.rareCapW), 5);
  });

  it("starts at zero for old saves", () => {
    const g = newGame();
    const old = JSON.parse(JSON.stringify({ ...g.s, v: 2 }));
    delete old.rareDry;
    expect(migrate(old)!.rareDry).toBe(0);
  });
});
