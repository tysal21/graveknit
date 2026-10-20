import { describe, expect, it } from "vitest";
import { TUNE } from "../../src/content/tune";
import { makePart } from "../../src/engine/parts";
import { dropPart, renderCommons, renderMany } from "../../src/engine/stash";
import { newGame } from "../helpers";

function fillStash(g: ReturnType<typeof newGame>) {
  while (g.looseCount() < TUNE.stashMax) makePart(g, "houndSkull", 5, "magic");
}

describe("the stash", () => {
  it("renders the oldest unkept part when full", () => {
    const g = newGame();
    fillStash(g);
    const loose = g.s.parts.filter((p) => !g.isWorn(p));
    loose[0].kept = true;
    const oldestUnkept = loose[1];
    const cm = g.s.cm;
    const p = dropPart(g, "watchRib", 6, TUNE.rarityW);
    expect(p).not.toBeNull();
    expect(g.partById(oldestUnkept.id)).toBeUndefined();
    expect(g.partById(loose[0].id)).toBeDefined();
    expect(g.looseCount()).toBe(TUNE.stashMax);
    expect(g.s.cm).toBeGreaterThan(cm);
  });

  it("leaves the new drop behind when every part is kept", () => {
    const g = newGame();
    fillStash(g);
    for (const p of g.s.parts) p.kept = true;
    expect(dropPart(g, "watchRib", 6, TUNE.rarityW)).toBeNull();
    expect(g.looseCount()).toBe(TUNE.stashMax);
  });

  it("always lets trophies in", () => {
    const g = newGame();
    fillStash(g);
    for (const p of g.s.parts) p.kept = true;
    expect(dropPart(g, "lanternCore", 10, TUNE.bossRarityW)).not.toBeNull();
  });

  it("never renders worn or kept parts", () => {
    const g = newGame();
    const a = makePart(g, "houndSkull", 5, "common");
    const b = makePart(g, "houndSkull", 5, "common");
    b.kept = true;
    renderCommons(g);
    expect(g.partById(a.id)).toBeUndefined();
    expect(g.partById(b.id)).toBeDefined();
    expect(renderMany(g, g.s.parts)).toBe(0); // only worn + kept left
    expect(g.s.parts.filter((p) => g.isWorn(p))).toHaveLength(5);
  });
});
