import { describe, expect, it } from "vitest";
import { TUNE } from "../../src/content/tune";
import { pressMarrow, restitch, restitchCost } from "../../src/engine/crafting";
import { affixValue, makePart, rollRoll, tierRange } from "../../src/engine/parts";
import { newGame } from "../helpers";

describe("Re-stitch", () => {
  it("lifts a part to your best stage, keeps its rolls, and charges Dust and Essence", () => {
    const g = newGame();
    g.s.maxStage = 12;
    const p = makePart(g, "cleaverArm", 4, "magic");
    g.s.parts.push(p);
    const before = p.affixes.map((a) => ({ ...a }));
    const c = restitchCost(g, p)!;
    expect(c.to).toBe(12);
    g.s.dust = c.dust;
    g.s.ess = c.ess;
    expect(restitch(g, p)).toBe(true);
    expect(p.ilvl).toBe(12);
    expect(p.affixes.map((a) => ({ ...a }))).toEqual(before);
    expect(g.s.dust).toBe(0);
    expect(g.s.ess).toBe(0);
  });

  it("does nothing when the part is already at your best item level, or you can't pay", () => {
    const g = newGame();
    g.s.maxStage = 6;
    const p = makePart(g, "cleaverArm", 6, "magic");
    expect(restitchCost(g, p)).toBeNull();
    p.ilvl = 2;
    g.s.dust = 0;
    expect(restitch(g, p)).toBe(false);
    expect(p.ilvl).toBe(2);
  });
});

describe("pressing Marrow", () => {
  it("turns Grave Dust into a Marrow Shard", () => {
    const g = newGame();
    g.s.dust = TUNE.dustPerMarrow + 3;
    const m = g.s.marrow;
    expect(pressMarrow(g)).toBe(true);
    expect(g.s.dust).toBe(3);
    expect(g.s.marrow).toBe(m + 1);
    expect(pressMarrow(g)).toBe(false);
  });
});

describe("affix rolls", () => {
  it("land in the middle most of the time and at the top about 1 time in 50", () => {
    const g = newGame();
    let top = 0, mid = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const r = rollRoll(g.rng);
      if (r >= 0.9) top++;
      if (r >= 0.3 && r < 0.7) mid++;
    }
    expect(top / n).toBeGreaterThan(0.012);
    expect(top / n).toBeLessThan(0.03);
    expect(mid / n).toBeGreaterThan(0.6);
  });

  it("stretch each tier so a great Tier 2 can beat a poor Tier 1", () => {
    const [lo1] = tierRange("mutilating", 1);
    const [, hi2] = tierRange("mutilating", 2);
    expect(hi2).toBeGreaterThan(lo1);
    const great2 = affixValue({ k: "mutilating", t: 2, roll: 1, locked: false }, 40);
    const poor1 = affixValue({ k: "mutilating", t: 1, roll: 0, locked: false }, 40);
    expect(great2).toBeGreaterThan(poor1);
  });
});
