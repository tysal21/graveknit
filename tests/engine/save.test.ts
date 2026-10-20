import { describe, expect, it } from "vitest";
import { Game } from "../../src/engine/game";
import { offlineProgress } from "../../src/engine/offline";
import { deserialize, exportSave, importSave, repair, serialize } from "../../src/engine/save";
import { seeded } from "../../src/engine/rng";
import { newGame } from "../helpers";

describe("saves", () => {
  it("round-trips through text", () => {
    const g = newGame();
    g.s.cm = 1234;
    const back = deserialize(serialize(g.s))!;
    expect(back.cm).toBe(1234);
    expect(back.parts).toHaveLength(g.s.parts.length);
  });

  it("exports and imports", () => {
    const g = newGame();
    g.log("Ünïcode survives — ☠");
    const back = importSave(exportSave(g.s))!;
    expect(back.log[0].text).toBe("Ünïcode survives — ☠");
  });

  it("rejects junk", () => {
    expect(importSave("hello")).toBeNull();
    expect(deserialize("{")).toBeNull();
    expect(deserialize('{"v":999}')).toBeNull();
  });

  it("repairs parts without a proper rarity (the prototype's NaN bug)", () => {
    const g = newGame();
    const s = JSON.parse(serialize(g.s));
    s.parts.push({ id: 999, base: "houndSkull", ilvl: 5, rarity: undefined, affixes: [], residue: 0, isNew: true, born: 0 });
    const g2 = new Game(deserialize(JSON.stringify(s)), seeded(2));
    repair(g2);
    const p = g2.partById(999)!;
    expect(["common", "magic", "rare"]).toContain(p.rarity);
    expect(Number.isFinite(g2.c.dps)).toBe(true);
  });
});

describe("offline progress", () => {
  it("is capped at 12 hours and makes only valid parts", () => {
    const g = newGame();
    const r = offlineProgress(g, 48 * 3600);
    expect(r.capped).toBe(true);
    expect(r.sec).toBe(12 * 3600);
    for (const p of g.s.parts) expect(["common", "magic", "rare"]).toContain(p.rarity);
  });
});
