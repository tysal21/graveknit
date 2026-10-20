import { describe, expect, it } from "vitest";
import { Game } from "../../src/engine/game";
import { seeded } from "../../src/engine/rng";
import { startBoss } from "../../src/engine/combat";
import { equip } from "../../src/engine/crafting";
import { makePart } from "../../src/engine/parts";
import { TUT_RUNNING_FROM } from "../../src/content/tutorial";
import { newGame } from "../helpers";

describe("combat", () => {
  it("stays paused during the first tutorial steps", () => {
    const g = new Game(null, seeded(1));
    g.advance(30);
    expect(g.s.clock).toBe(0);
    g.s.tut = TUT_RUNNING_FROM;
    g.advance(5);
    expect(g.s.clock).toBeGreaterThan(4.9);
  });

  it("clears Stage 1 and pushes on", () => {
    const g = newGame();
    g.advance(120);
    expect(g.s.maxStage).toBeGreaterThan(1);
    expect(g.s.ess).toBeGreaterThan(0);
  });

  it("the Warden's lantern blast can't be blocked without Ward or Phase (option B)", () => {
    const g = newGame();
    g.s.maxStage = 10;
    g.s.stage = 9;
    g.refresh();
    expect(g.c.abilities).toEqual(["cleave", "haste"]);
    startBoss(g);
    expect(g.foe!.kind).toBe("boss");
    // with the Lantern Core worn, Ward becomes available
    equip(g, makePart(g, "lanternCore", 10, "rare"));
    expect(g.c.abilities).toContain("ward");
  });

  it("the Warden has 20× trash HP", () => {
    const g = newGame();
    g.s.maxStage = 10;
    g.s.stage = 9;
    startBoss(g);
    expect(g.foe!.max).toBeCloseTo((60 * Math.pow(1.17, 9) + 150) * 20, 0);
  });

  it("losing to the Warden sends you back to Stage 9", () => {
    const g = newGame();
    g.s.maxStage = 10;
    g.s.stage = 9;
    startBoss(g);
    while (g.foe!.kind === "boss") g.step(0.1);
    expect(g.s.log[0].cls).toBe("bad");
    expect(g.s.stage).toBe(9);
  });
});
