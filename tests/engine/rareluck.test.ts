import { describe, expect, it } from "vitest";
import { TUNE } from "../../src/content/tune";
import { migrate } from "../../src/engine/save";
import { countRareLuck, rareChance, rareLuckMult } from "../../src/engine/stash";
import type { Part } from "../../src/engine/state";
import { newGame } from "../helpers";

const drop = (rarity: Part["rarity"]) => ({ rarity }) as Part;

describe("Rare luck", () => {
  it("doubles the Rare odds at 180 kills without a Rare, again at 360, and resets on a Rare", () => {
    const g = newGame();
    const base = rareChance(g);
    expect(base).toBeCloseTo(TUNE.rarityW.rare / 100, 5);
    for (let i = 0; i < TUNE.rareDoubleKills - 1; i++) countRareLuck(g, i % 20 ? null : drop("magic"));
    expect(rareLuckMult(g)).toBe(1);
    countRareLuck(g, null);
    expect(rareLuckMult(g)).toBe(2);
    expect(rareChance(g)).toBeCloseTo(14 / (93 + 14), 5);
    g.s.rareDry = 2 * TUNE.rareDoubleKills;
    expect(rareLuckMult(g)).toBe(4);
    countRareLuck(g, drop("rare"));
    expect(g.s.rareDry).toBe(0);
    expect(rareChance(g)).toBeCloseTo(base, 5);
  });

  it("stops rising at the cap", () => {
    const g = newGame();
    g.s.rareDry = 50 * TUNE.rareDoubleKills;
    expect(rareChance(g)).toBeCloseTo(TUNE.rareCapW / (93 + TUNE.rareCapW), 5);
  });

  it("starts at zero for old saves", () => {
    const g = newGame();
    const old = JSON.parse(JSON.stringify({ ...g.s, v: 2 }));
    delete old.rareDry;
    expect(migrate(old)!.rareDry).toBe(0);
  });
});
