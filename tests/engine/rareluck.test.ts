import { describe, expect, it } from "vitest";
import { migrate } from "../../src/engine/save";
import { SAVE_VERSION } from "../../src/engine/state";
import { newGame } from "../helpers";

describe("flat Rare chance", () => {
  it("drops the old Rare luck counter from saves", () => {
    const g = newGame();
    const old = JSON.parse(JSON.stringify({ ...g.s, v: 3, rareDry: 250 }));
    const s = migrate(old)!;
    expect(s.v).toBe(SAVE_VERSION);
    expect("rareDry" in s).toBe(false);
  });
});
