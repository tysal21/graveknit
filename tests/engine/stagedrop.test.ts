import { describe, expect, it } from "vitest";
import { TUNE } from "../../src/content/tune";
import { spawnTrash, stageBelow } from "../../src/engine/combat";
import { repair } from "../../src/engine/save";
import { newGame } from "../helpers";

describe("falling back a stage", () => {
  it("steps over boss stages, which have no normal enemies", () => {
    expect(stageBelow(11)).toBe(9);
    expect(stageBelow(21)).toBe(19);
    expect(stageBelow(5)).toBe(4);
    expect(stageBelow(1)).toBe(1);
  });

  it("dying on Stage 11 sends you to Stage 9, not the Warden's stage", () => {
    const g = newGame();
    g.s.maxStage = 12;
    g.s.stage = 11;
    g.s.bosses.warden = { kills: 1, thrall: false, tries: 1, readyAt: 0 };
    spawnTrash(g);
    g.pl!.hp = 0.0001;
    g.foe!.dmg = 1e9;
    for (let i = 0; i < 100 && g.s.stage === 11; i++) g.step(0.1);
    expect(g.s.stage).toBe(9);
    expect(g.foe!.kind).toBe("trash");
  });

  it("a save stuck on a boss stage loads without crashing", () => {
    const g = newGame();
    g.s.maxStage = 12;
    g.s.stage = 10;
    g.s.kills = TUNE.killsPerStage - 3;
    repair(g);
    expect(g.s.stage).toBe(9);
    expect(() => spawnTrash(g)).not.toThrow();
  });
});
