import { describe, expect, it } from "vitest";
import { BUILT_LAST_STAGE, LAST_STAGE, PLAYTEST_END, lastStageFor } from "../../src/content/acts";

describe("playtest end", () => {
  it("stops a normal browser link at the Ossuary Colossus", () => {
    expect(PLAYTEST_END).toBe(20);
    expect(lastStageFor("")).toBe(20);
    expect(lastStageFor("?foo=1")).toBe(20);
  });

  it("lets ?dev links, tests and bots reach every act", () => {
    expect(lastStageFor("?dev")).toBe(BUILT_LAST_STAGE);
    expect(lastStageFor(null)).toBe(BUILT_LAST_STAGE);
    expect(LAST_STAGE).toBe(BUILT_LAST_STAGE);
  });
});
