import { describe, expect, it } from "vitest";
import { arrive, newGame } from "../helpers";

describe("damage numbers", () => {
  it("each hit on the enemy and on the Vanguard leaves a number for the screen", () => {
    const g = newGame();
    g.step(0.01);
    arrive(g);
    // a foe that won't die, so the same fight runs long enough to hit back
    g.foe!.hp = g.foe!.max = 1e9;
    g.foe!.atk = g.foe!.int;
    g.step(0.01);
    expect(g.pops.some((p) => p.side === "foe" && p.n > 0)).toBe(true);
    expect(g.pops.some((p) => p.side === "me" && p.kind === "hurt" && p.n > 0)).toBe(true);
  });

  it("Phase shows Dodged instead of a number", () => {
    const g = newGame();
    g.step(0.01);
    arrive(g);
    g.foe!.hp = g.foe!.max = 1e9;
    g.pl!.phaseUntil = g.s.clock + 99;
    g.foe!.atk = g.foe!.int;
    g.step(0.01);
    expect(g.pops.some((p) => p.side === "me" && p.kind === "dodge")).toBe(true);
  });

  it("only keeps the latest few, so a long fight can't pile them up", () => {
    const g = newGame();
    g.advance(300);
    expect(g.pops.length).toBeLessThanOrEqual(12);
  });
});
