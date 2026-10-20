import { describe, expect, it } from "vitest";
import { TUNE } from "../../src/content/tune";
import { dust, equip, graft, graftSlots, marrow, toggleLock } from "../../src/engine/crafting";
import { makePart } from "../../src/engine/parts";
import { newGame } from "../helpers";

describe("crafting", () => {
  it("keeps a locked affix through Marrow rerolls", () => {
    const g = newGame();
    const p = makePart(g, "houndSkull", 9, "rare");
    toggleLock(g, p, 0);
    const locked = { ...p.affixes.find((a) => a.locked)! };
    g.s.marrow = 50;
    for (let i = 0; i < 20; i++) marrow(g, p);
    expect(p.affixes.find((a) => a.locked)).toMatchObject({ k: locked.k, t: locked.t, roll: locked.roll });
  });

  it("only allows one locked affix at a time and spends a Thread", () => {
    const g = newGame();
    g.s.thread = 2;
    const p = makePart(g, "houndSkull", 9, "rare");
    toggleLock(g, p, 0);
    toggleLock(g, p, 1);
    expect(p.affixes.filter((a) => a.locked)).toHaveLength(1);
    expect(g.s.thread).toBe(0);
  });

  it("Grave Dust keeps tiers", () => {
    const g = newGame();
    const p = makePart(g, "watchRib", 9, "rare");
    const tiers = p.affixes.map((a) => a.t);
    dust(g, p);
    expect(p.affixes.map((a) => a.t)).toEqual(tiers);
  });

  it("a full Residue bar guarantees a tier better than the old best", () => {
    const g = newGame(11);
    const p = makePart(g, "watchRib", 9, "rare");
    p.affixes.forEach((a) => (a.t = 4));
    p.residue = TUNE.residueMax;
    marrow(g, p);
    expect(Math.min(...p.affixes.map((a) => a.t))).toBeLessThanOrEqual(3);
    expect(p.residue).toBe(0);
  });

  it("grafting moves an affix, eats the donor and costs 3 Marrow and 5 Dust", () => {
    const g = newGame();
    g.s.marrow = 3;
    g.s.dust = 5;
    const t = makePart(g, "houndSkull", 5, "magic");
    const d = makePart(g, "houndSkull", 5, "magic");
    const i = graftSlots(t, d.affixes[0])[0];
    expect(graft(g, t, d, 0, i)).toBe(true);
    expect(t.affixes[i].k).toBe(d.affixes[0].k);
    expect(g.partById(d.id)).toBeUndefined();
    expect(g.s.marrow).toBe(0);
    expect(g.s.dust).toBe(0);
  });

  it("equipping a better arm raises damage", () => {
    const g = newGame();
    const before = g.c.hit;
    equip(g, makePart(g, "cleaverArm", 9, "common"));
    expect(g.c.hit).toBeGreaterThan(before);
  });
});
