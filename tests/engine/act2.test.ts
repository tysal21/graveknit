import { describe, expect, it } from "vitest";
import { BASES, LAST_STAGE, bossById } from "../../src/content/acts";
import { TUNE } from "../../src/content/tune";
import { guardianFor, makeVanguard, openSquadSlots, spawnTrash, startBoss, useAbility } from "../../src/engine/combat";
import { equip } from "../../src/engine/crafting";
import { makePart } from "../../src/engine/parts";
import { newGame } from "../helpers";

describe("Act 2", () => {
  it("runs to Stage 20 with the Ossuary Colossus at the end", () => {
    expect(LAST_STAGE).toBe(20);
    expect(bossById("colossus").stage).toBe(20);
    expect(BASES.colossusRib.trophy).toBe(true);
  });

  it("opens squad slot 2 at Stage 20, empty", () => {
    const g = newGame();
    g.s.maxStage = 19;
    openSquadSlots(g);
    expect(g.s.squad).toHaveLength(1);
    g.s.maxStage = 20;
    openSquadSlots(g);
    expect(g.s.squad).toHaveLength(2);
    expect(g.s.squad[1].eq).toEqual({});
    expect(g.cs).toHaveLength(2);
  });

  it("the second Abomination adds its damage and abilities", () => {
    const g = newGame();
    g.s.maxStage = 20;
    openSquadSlots(g);
    const before = g.dps();
    equip(g, makePart(g, "knightArm", 20, "common"), 1);
    expect(g.dps()).toBeGreaterThan(before);
    expect(g.abilities()).toContainEqual({ abom: 1, id: "cleave" });
    // both Cleaves have their own cooldown
    g.s.maxStage = 20;
    useAbility(g, "cleave", true, 0);
    useAbility(g, "cleave", true, 1);
    expect(g.pl!.cd["0:cleave"]).toBeGreaterThan(g.s.clock);
    expect(g.pl!.cd["1:cleave"]).toBeGreaterThan(g.s.clock);
  });

  it("a part moves when stitched onto another Abomination", () => {
    const g = newGame();
    g.s.maxStage = 20;
    openSquadSlots(g);
    const arm = g.partById(g.s.squad[0].eq.main)!;
    equip(g, arm, 1);
    expect(g.s.squad[1].eq.main).toBe(arm.id);
    expect(g.s.squad[0].eq.main).toBeUndefined();
  });

  it("Make Vanguard swaps who is in front", () => {
    const g = newGame();
    g.s.maxStage = 20;
    openSquadSlots(g);
    const second = g.s.squad[1].name;
    makeVanguard(g, 1);
    expect(g.s.squad[0].name).toBe(second);
  });

  it("The Heap adds 10% max HP to the squad", () => {
    const g = newGame();
    const hp = g.c.maxHp;
    g.s.bosses.colossus = { kills: 1, thrall: true, tries: 0 };
    g.refresh();
    expect(g.c.maxHp).toBeCloseTo(hp * 1.1, 5);
  });

  it("pushing walks past a boss you've already beaten into the next act", () => {
    const g = newGame();
    g.s.maxStage = 11;
    g.s.stage = 9;
    g.s.bosses.warden = { kills: 1, thrall: false, tries: 1 };
    g.s.kills = TUNE.killsPerStage - 1;
    g.foe!.hp = 0;
    g.step(0.1);
    expect(g.s.stage).toBe(11);
  });

  it("the Colossus fight starts from Stage 19", () => {
    const g = newGame();
    g.s.maxStage = 20;
    g.s.stage = 19;
    startBoss(g);
    expect(g.foe!.bossId).toBe("colossus");
  });
});

describe("stage guardians", () => {
  it("guard the last kill of Stages 2-4 and 12-14, the first time only", () => {
    for (const st of [2, 3, 4, 12, 13, 14]) expect(guardianFor(st)).toBeTruthy();
    expect(guardianFor(5)).toBeUndefined();
    const g = newGame();
    g.s.stage = g.s.maxStage = 2;
    g.s.kills = TUNE.killsPerStage - 1;
    spawnTrash(g);
    expect(g.foe!.kind).toBe("guardian");
    // not on a stage you're only farming
    g.s.maxStage = 3;
    spawnTrash(g);
    expect(g.foe!.kind).toBe("trash");
  });

  it("drop a Magic part and stop showing up once beaten", () => {
    const g = newGame();
    g.s.stage = g.s.maxStage = 3;
    g.s.kills = TUNE.killsPerStage - 1;
    spawnTrash(g);
    const parts = g.s.parts.length;
    g.foe!.hp = 0;
    g.step(0.1);
    expect(g.s.seen.g3).toBe(1);
    const p = g.s.parts[g.s.parts.length - 1];
    expect(g.s.parts.length).toBe(parts + 1);
    expect(p.base).toBe("diggerArm");
    expect(p.rarity).toBe("magic");
    g.s.stage = 3;
    g.s.kills = TUNE.killsPerStage - 1;
    spawnTrash(g);
    expect(g.foe!.kind).toBe("trash");
  });

  it("losing to one drops you back a stage", () => {
    const g = newGame();
    g.s.stage = g.s.maxStage = 2;
    g.s.kills = TUNE.killsPerStage - 1;
    spawnTrash(g);
    g.pl!.hp = 0.01;
    g.foe!.atk = 99;
    g.step(0.1);
    expect(g.s.stage).toBe(1);
    expect(g.s.seen.g2).toBeUndefined();
  });
});
