import { describe, expect, it } from "vitest";
import { BASES, LAST_STAGE, bossById } from "../../src/content/acts";
import { TUNE } from "../../src/content/tune";
import { liveAdds, openSquadSlots, spawnTrash, startBoss, stepCombat } from "../../src/engine/combat";
import { canCraft, equip, graftSlots, restitchCost } from "../../src/engine/crafting";
import { castRitual } from "../../src/engine/economy";
import { Game } from "../../src/engine/game";
import { affixFits, makePart } from "../../src/engine/parts";
import { seeded } from "../../src/engine/rng";
import { deserialize, repair } from "../../src/engine/save";
import { calc } from "../../src/engine/stats";
import { arrive, newGame } from "../helpers";

/** a game standing in front of the Arch-Necromancer */
function atRival(seed = 1) {
  const g = newGame(seed);
  g.s.maxStage = g.s.stage = 30;
  openSquadSlots(g);
  return g;
}

/** make the squad harmless and unkillable, so a test can watch a fight unfold */
function freeze(g: Game, extra: (g: Game) => void = () => {}) {
  const real = g.refresh.bind(g);
  g.refresh = () => {
    real();
    for (const c of g.cs) (c.aps = 1e-9), (c.poisonDps = 0), (c.maxHp = 1e12);
    if (g.pl) g.pl.hp = 1e12;
    extra(g);
  };
  g.refresh();
}

/** run the boss fight until `t` seconds in */
function runTo(g: Game, t: number) {
  while (g.foe!.t < t) {
    stepCombat(g, 0.1);
    if (g.foe!.kind !== "boss") throw new Error("the fight ended early");
  }
}

describe("Act 3", () => {
  it("runs to Stage 30 with the Arch-Necromancer at the end", () => {
    expect(LAST_STAGE).toBe(30);
    expect(bossById("rival").stage).toBe(30);
    expect(BASES.rivalCore.trophy).toBe(true);
  });

  it("the Arch-Necromancer's summons shield him until they die", () => {
    const g = atRival();
    startBoss(g);
    freeze(g);
    runTo(g, 6);
    const f = g.foe!;
    expect(liveAdds(f)).toHaveLength(3);
    // poison hits every add, and the boss only a quarter as hard
    const hp = f.hp, add = f.adds[0].hp;
    freeze(g, (g) => (g.cs[0].poisonDps = 100));
    f.weakUntil = f.stunUntil = -1;
    stepCombat(g, 1);
    expect(add - f.adds[0].hp).toBeCloseTo(100, 0);
    expect(hp - f.hp).toBeCloseTo(100 * (1 - TUNE.addShield), 0);
  });

  it("hits go to the first add, and Sweeping splashes onto the rest", () => {
    const g = atRival();
    const arm = makePart(g, "rioterArm", 30, "magic");
    arm.affixes = [{ k: "sweeping", t: 1, roll: 1, locked: false }];
    equip(g, arm, 0);
    expect(g.c.splash).toBeGreaterThan(40);
    startBoss(g);
    freeze(g);
    runTo(g, 6);
    const f = g.foe!;
    const [a, b] = f.adds.map((x) => x.hp);
    freeze(g, (g) => (g.cs[0].aps = 50));
    stepCombat(g, 0.1);
    expect(f.adds[0].hp).toBeLessThan(a);
    expect(f.adds[1].hp).toBeLessThan(b);
    expect(a - f.adds[0].hp).toBeGreaterThan(b - f.adds[1].hp);
  });

  it("Sweeping only rolls on Off Arms from item level 11", () => {
    expect(affixFits("sweeping", makePart(newGame(), "rioterArm", 21, "common"))).toBe(true);
    expect(affixFits("sweeping", makePart(newGame(), "gnawedHand", 5, "common"))).toBe(false);
    const skull = makePart(newGame(), "beakSkull", 25, "magic");
    expect(affixFits("sweeping", skull)).toBe(false);
    expect(graftSlots(skull, { k: "sweeping", t: 1, roll: 0.5, locked: false })).toEqual([]);
  });

  it("Plague Wind triples poison, and opens at Stage 21", () => {
    const g = newGame();
    equip(g, makePart(g, "beakSkull", 21, "common"));
    const before = g.c.poisonDps;
    castRitual(g, "wind", false);
    expect(g.s.rit.wind.until).toBe(0);
    g.s.maxStage = 21;
    castRitual(g, "wind", false);
    g.refresh();
    expect(g.c.poisonDps).toBeCloseTo(before * 3, 5);
  });

  it("an Elite pays more and drops a signature part", () => {
    const g = newGame();
    g.s.maxStage = g.s.stage = 25;
    let rolls = 0;
    // force the next spawn to be an Elite
    const real = g.rng;
    g.rng = () => (rolls++ === 1 ? 0 : real());
    spawnTrash(g);
    g.rng = real;
    const f = g.foe!;
    expect(f.elite).toBe(true);
    expect(f.max).toBeGreaterThan(3 * 100);
    const parts = g.s.parts.length;
    f.hp = 0;
    arrive(g);
    stepCombat(g, 0.01);
    const sig = g.s.parts.slice(parts).find((p) => p.sig);
    expect(sig).toBeTruthy();
    expect(sig!.rarity === "magic" || sig!.rarity === "rare").toBe(true);
    // its built-in stats are 1.5× a normal copy's
    const plain = makePart(g, sig!.base, sig!.ilvl, "magic");
    const st = BASES[sig!.base].imp[0][0];
    const c = calc(g, {}), cs = calc(g, { swap: sig! }), cp = calc(g, { swap: plain });
    expect(cs[st] - c[st]).toBeGreaterThan(cp[st] - c[st]);
  });

  it("no Elites before Act 3 or far below your best stage", () => {
    const g = newGame();
    g.s.maxStage = g.s.stage = 15;
    g.rng = () => 0;
    spawnTrash(g);
    expect(g.foe!.elite).toBeFalsy();
  });

  it("bosses give a Spectral Thread on their first kill only", () => {
    const g = atRival();
    const t0 = g.s.thread;
    for (let i = 0; i < 6; i++) {
      startBoss(g);
      g.foe!.hp = 0;
      stepCombat(g, 0.01);
    }
    expect(g.s.bosses.rival.kills).toBe(6);
    expect(g.s.thread - t0).toBe(TUNE.bossLoot.firstThreads);
  });

  it("uniques can't be crafted or Re-stitched", () => {
    const g = newGame();
    g.s.maxStage = 30;
    const u = makePart(g, "plagueMask", 22, "common");
    expect(u.rarity).toBe("rare");
    expect(u.affixes).toEqual([]);
    expect(canCraft(u)).toBe(false);
    expect(restitchCost(g, u)).toBeNull();
    // The Plague Mask multiplies poison
    const plain = calc(g, { swap: makePart(g, "beakSkull", 22, "common") });
    expect(calc(g, { swap: u }).plague).toBe(TUNE.uniqueFx.plague);
    expect(plain.plague).toBe(1);
  });

  it("the Rival's Core copies the best affix another squad member wears", () => {
    const g = atRival();
    const arm = makePart(g, "boneScythe", 30, "magic");
    arm.affixes = [{ k: "frenzy", t: 1, roll: 1, locked: false }];
    equip(g, arm, 1);
    const before = g.cs[0].as;
    const core = makePart(g, "rivalCore", 30, "rare");
    core.affixes = [];
    equip(g, core, 0);
    // the Wisp Core it replaced gave +10% attack speed; the copied Frenzy T1 gives far more
    expect(g.cs[0].as).toBeGreaterThan(before + 15);
    expect(g.cs[1].as).toBeGreaterThan(20);
  });

  it("an old save that beat the Colossus before Act 3 existed opens Stage 21", () => {
    const g0 = newGame();
    const s = JSON.parse(JSON.stringify(g0.s));
    s.v = 4;
    delete s.rit.wind;
    s.maxStage = s.stage = 20;
    s.bosses.colossus = { kills: 3, thrall: false, tries: 3, readyAt: 0 };
    const loaded = deserialize(JSON.stringify(s))!;
    expect(loaded.rit.wind).toEqual({ ready: 0, until: 0, power: 1 });
    const g = new Game(loaded, seeded(3));
    repair(g);
    expect(g.s.maxStage).toBe(21);
  });
});

describe("reagents on old stages", () => {
  it("Dust and Marrow fade 15% per stage past the first 2 below your best, down to a tenth", async () => {
    const { reagentRate } = await import("../../src/engine/combat");
    expect(reagentRate(28, 28)).toBe(1);
    expect(reagentRate(26, 28)).toBe(1);
    expect(reagentRate(25, 28)).toBeCloseTo(0.85);
    expect(reagentRate(21, 28)).toBeCloseTo(0.85 ** 5);
    expect(reagentRate(1, 28)).toBe(TUNE.reagentFloor);
  });
});
