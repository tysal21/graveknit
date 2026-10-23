import { describe, expect, it } from "vitest";
import { RITUALS } from "../../src/content/rituals";
import { castRitual, ritualReady } from "../../src/engine/economy";
import { newGame } from "../helpers";

const readyCount = (g: ReturnType<typeof newGame>) => RITUALS.filter((r) => ritualReady(g, r)).length;

describe("ritual ready count (the top pill)", () => {
  it("doesn't count Plague Wind before Stage 21", () => {
    const g = newGame();
    expect(readyCount(g)).toBe(3);
    for (const id of ["raise", "hunger", "moon"] as const) castRitual(g, id, false);
    expect(readyCount(g)).toBe(0);
  });

  it("counts Plague Wind once it opens", () => {
    const g = newGame();
    g.s.maxStage = 21;
    expect(readyCount(g)).toBe(4);
  });
});
