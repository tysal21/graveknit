// Test bots: simple players that play Act 1 at full speed and report how long the first Warden kill takes.
// Run with: npm run bots
import { describe, expect, it } from "vitest";
import { GENERATORS } from "../../src/content/generators";
import { equip, marrow } from "../../src/engine/crafting";
import { buyGenerator, castRitual, genCost, infuse } from "../../src/engine/economy";
import { partGain } from "../../src/engine/stats";
import { RITUALS } from "../../src/content/rituals";
import type { Game } from "../../src/engine/game";
import { newGame } from "../helpers";

/** what an attentive player does every few seconds */
function playTurn(g: Game) {
  // stitch on any upgrade
  let best;
  do {
    best = null;
    let top = 0.005;
    for (const p of g.s.parts) {
      const gain = partGain(g, p);
      if (gain > top) [best, top] = [p, gain];
    }
    if (best) equip(g, best);
  } while (best);
  // reroll worn Magic/Rare parts with spare Marrow
  for (const p of g.s.parts) if (g.isWorn(p) && p.rarity !== "common" && g.s.marrow > 2) marrow(g, p);
  for (let i = 0; i < 20; i++) infuse(g);
  for (const r of RITUALS) if (r.id !== "moon" || g.foe?.kind === "boss") castRitual(g, r.id, false);
  // buy the cheapest open generator
  for (let i = 0; i < 20; i++) {
    const open = GENERATORS.filter((x) => !x.later && g.s.maxStage >= x.unlock);
    const cheapest = open.sort((a, b) => genCost(a, g.s.gens[a.id] || 0) - genCost(b, g.s.gens[b.id] || 0))[0];
    if (!cheapest || g.s.cm < genCost(cheapest, g.s.gens[cheapest.id] || 0)) break;
    buyGenerator(g, cheapest.id, false);
  }
}

function minutesToFirstWarden(seed: number, limitMin = 90) {
  const g = newGame(seed);
  g.s.opt.boss = true;
  for (let t = 0; t < limitMin * 60; t += 5) {
    g.advance(5);
    playTurn(g);
    if (g.bossCleared("warden")) return g.s.clock / 60;
  }
  return Infinity;
}

describe("balance bots", () => {
  it("beat the Crypt Warden in roughly 20 minutes of active play", () => {
    const times = [1, 2, 3, 4, 5, 6].map((s) => minutesToFirstWarden(s));
    const sorted = [...times].sort((a, b) => a - b);
    const median = (sorted[2] + sorted[3]) / 2;
    console.log(`First Warden kill (minutes): ${times.map((t) => t.toFixed(1)).join(", ")} · median ${median.toFixed(1)}`);
    expect(median).toBeGreaterThan(8);
    expect(median).toBeLessThan(45);
  }, 120_000);
});
