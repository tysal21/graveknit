import { describe, expect, it } from "vitest";
import { startBoss } from "../../src/engine/combat";
import type { BossWin } from "../../src/engine/game";
import { migrate } from "../../src/engine/save";
import { newGame } from "../helpers";

/** start the Warden fight and knock him down to finish it on the next step */
function killWarden(g: ReturnType<typeof newGame>) {
  g.s.maxStage = 10;
  g.s.stage = 9;
  startBoss(g);
  g.foe!.hp = 0;
  const wins: BossWin[] = [];
  g.on((e) => e.type === "bossWin" && wins.push(e.win));
  g.step(0.1);
  return wins;
}

describe("boss victory report", () => {
  it("lists the loot from a first kill, trophy included", () => {
    const g = newGame();
    const [w] = killWarden(g);
    expect(w.first).toBe(true);
    expect(w.bossId).toBe("warden");
    expect(w.parts).toHaveLength(3);
    expect(g.partById(w.parts[0])!.base).toBe("lanternCore");
    for (const id of w.parts) expect(g.partById(id)).toBeTruthy();
    expect(w.ess).toBeGreaterThan(0);
  });

  it("repeat kills aren't marked as first", () => {
    const g = newGame();
    killWarden(g);
    const [w] = killWarden(g);
    expect(w.first).toBe(false);
    expect(w.parts).toHaveLength(2);
  });

  it("old saves get the pop-up setting, switched off", () => {
    const g = newGame();
    const old = JSON.parse(JSON.stringify(g.s));
    old.v = 1;
    delete old.opt.bossPop;
    const s = migrate(old)!;
    expect(s.v).toBe(2);
    expect(s.opt.bossPop).toBe(false);
  });
});
