// Test bots: simple players that play Acts 1 to 3 at full speed and report how long each first boss kill takes.
// Run with: npm run bots
import { describe, expect, it } from "vitest";
import { GENERATORS } from "../../src/content/generators";
import { equip, marrow, pressMarrow, restitch } from "../../src/engine/crafting";
import { buyGenerator, castRitual, genCost, infuse } from "../../src/engine/economy";
import { partGain } from "../../src/engine/stats";
import { RITUALS } from "../../src/content/rituals";
import type { Game } from "../../src/engine/game";
import { newGame } from "../helpers";

/** what an attentive player does every few seconds */
function playTurn(g: Game) {
  // stitch on any upgrade, for every squad member
  for (let abom = 0; abom < g.s.squad.length; abom++) {
    let best, tries = 0;
    do {
      best = null;
      let top = 0.005;
      for (const p of g.s.parts) {
        const gain = partGain(g, p, undefined, abom);
        if (gain > top) [best, top] = [p, gain];
      }
      if (best) equip(g, best, abom);
      // a guard: two parts that each look better than the other would swap forever
    } while (best && ++tries < 10);
  }
  // lift worn Magic/Rare parts that have fallen 3+ item levels behind, then press spare Dust into Marrow
  for (const p of g.s.parts) if (g.isWorn(p) && p.rarity !== "common" && p.ilvl <= g.s.maxStage - 3) restitch(g, p);
  while (g.s.dust > 30) pressMarrow(g);
  // reroll worn Magic/Rare parts with spare Marrow
  for (const p of g.s.parts) if (g.isWorn(p) && p.rarity !== "common" && g.s.marrow > 2) marrow(g, p);
  for (let i = 0; i < 20; i++) for (let abom = 0; abom < g.s.squad.length; abom++) infuse(g, abom);
  // Blood Moon and Plague Wind are saved for boss fights
  for (const r of RITUALS) if ((r.id !== "moon" && r.id !== "wind") || g.foe?.kind === "boss") castRitual(g, r.id, false);
  // buy the cheapest open generator
  for (let i = 0; i < 20; i++) {
    const open = GENERATORS.filter((x) => !x.later && g.s.maxStage >= x.unlock);
    const cheapest = open.sort((a, b) => genCost(a, g.s.gens[a.id] || 0) - genCost(b, g.s.gens[b.id] || 0))[0];
    if (!cheapest || g.s.cm < genCost(cheapest, g.s.gens[cheapest.id] || 0)) break;
    buyGenerator(g, cheapest.id, false);
  }
}

/** minutes of play until each boss first dies (Infinity if not within the limit) */
function minutesToBosses(seed: number, ids: string[], limitMin: number) {
  const g = newGame(seed);
  g.s.opt.boss = true;
  const out: Record<string, number> = {};
  for (let t = 0; t < limitMin * 60; t += 5) {
    g.advance(5);
    playTurn(g);
    for (const id of ids) if (out[id] === undefined && g.bossCleared(id)) out[id] = g.s.clock / 60;
    if (ids.every((id) => out[id] !== undefined)) break;
  }
  return ids.map((id) => out[id] ?? Infinity);
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[Math.floor((s.length - 1) / 2)] + s[Math.ceil((s.length - 1) / 2)]) / 2;
};

describe("balance bots", () => {
  it("beat the Crypt Warden in about 20 minutes, the Ossuary Colossus in about an hour and the Arch-Necromancer in about 2", () => {
    const runs = [1, 2, 3, 4, 5, 6].map((seed) => minutesToBosses(seed, ["warden", "colossus", "rival"], 400));
    const warden = runs.map((r) => r[0]), colossus = runs.map((r) => r[1]), rival = runs.map((r) => r[2]);
    console.log(`First Warden kill (minutes): ${warden.map((t) => t.toFixed(1)).join(", ")} · median ${median(warden).toFixed(1)}`);
    console.log(`First Colossus kill (minutes): ${colossus.map((t) => t.toFixed(1)).join(", ")} · median ${median(colossus).toFixed(1)}`);
    console.log(`First Arch-Necromancer kill (minutes): ${rival.map((t) => t.toFixed(1)).join(", ")} · median ${median(rival).toFixed(1)}`);
    expect(median(warden)).toBeGreaterThan(8);
    expect(median(warden)).toBeLessThan(45);
    expect(median(colossus)).toBeGreaterThan(median(warden) + 15);
    expect(median(colossus)).toBeLessThan(150);
    expect(median(rival)).toBeGreaterThan(median(colossus) + 20);
    expect(median(rival)).toBeLessThan(300);
  }, 600_000);
});
