import { describe, expect, it } from "vitest";
import { TUNE } from "../../src/content/tune";
import { startBoss } from "../../src/engine/combat";
import type { BossWin } from "../../src/engine/game";
import { migrate } from "../../src/engine/save";
import { SAVE_VERSION } from "../../src/engine/state";
import { newGame } from "../helpers";

/** start the Warden fight from Stage 9 and finish it on the next step */
function killWarden(g: ReturnType<typeof newGame>) {
  g.s.stage = 9;
  startBoss(g);
  g.foe!.hp = 0;
  const wins: BossWin[] = [];
  g.on((e) => e.type === "bossWin" && wins.push(e.win));
  g.step(0.1);
  return wins[0];
}

describe("bosses re-knit between kills", () => {
  it("a beaten boss can't be fought again until it has re-knitted", () => {
    const g = newGame();
    g.s.maxStage = 10;
    killWarden(g);
    expect(g.bossReady()).toBe(false);
    expect(g.bossReknitLeft()).toBeCloseTo(TUNE.bossReknit, 0);
    g.s.clock += TUNE.bossReknit;
    expect(g.bossReady()).toBe(true);
  });

  it("auto-boss waits for the re-knit instead of refighting straight away", () => {
    const g = newGame();
    g.s.maxStage = 10;
    killWarden(g);
    g.s.opt.boss = true;
    g.s.opt.push = false;
    let fights = 0;
    for (let t = 0; t < TUNE.bossReknit - 30; t += 1) {
      g.advance(1);
      if (g.foe?.kind === "boss") fights++;
    }
    expect(fights).toBe(0);
  });

  it("a boss from an earlier act pays faded reagents, like an old stage", () => {
    const g = newGame();
    g.s.maxStage = 10;
    const near = killWarden(g);
    expect(near.marrow).toBe(TUNE.bossLoot.marrow);
    expect(near.dust).toBe(TUNE.bossLoot.dust);
    // far past the Warden, repeat kills pay about a tenth to a seventh of the reagents
    g.s.maxStage = 24;
    let marrow = 0, dust = 0;
    for (let i = 0; i < 200; i++) {
      const w = killWarden(g);
      marrow += w.marrow;
      dust += w.dust;
    }
    expect(marrow / 200).toBeLessThan(TUNE.bossLoot.marrow * 0.3);
    expect(dust / 200).toBeLessThan(TUNE.bossLoot.dust * 0.3);
    expect(dust).toBeGreaterThan(0);
  });

  it("old saves get every boss ready to fight", () => {
    const g = newGame();
    const old = JSON.parse(JSON.stringify(g.s));
    old.v = 5;
    old.bosses = { warden: { kills: 3, thrall: false, tries: 3 } };
    const s = migrate(old)!;
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.bosses.warden).toEqual({ kills: 3, thrall: false, tries: 3, readyAt: 0 });
  });
});
