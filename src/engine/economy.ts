import { GENERATORS, type GeneratorDef } from "../content/generators";
import { RITUAL_TUNE, RITUALS, type RitualId } from "../content/rituals";
import { TUNE } from "../content/tune";
import { fmt } from "./format";
import type { Game } from "./game";
import { altarBonus } from "./stats";
import { tutEvent } from "./tutorial";

/** Corpse Mass per second from generators */
export function cmRate(g: Game) {
  let r = 0;
  for (const gen of GENERATORS) r += gen.rate * (g.s.gens[gen.id] || 0);
  return r;
}

export const genCost = (gen: GeneratorDef, owned: number) => Math.ceil(gen.cost * Math.pow(TUNE.costGrow, owned));

export function buyGenerator(g: Game, id: string, max: boolean) {
  const gen = GENERATORS.find((x) => x.id === id);
  if (!gen || gen.later || g.s.maxStage < gen.unlock) return;
  let n = 0;
  for (;;) {
    const c = genCost(gen, g.s.gens[id] || 0);
    if (g.s.cm < c) break;
    g.s.cm -= c;
    g.s.gens[id] = (g.s.gens[id] || 0) + 1;
    n++;
    if (!max) break;
  }
  if (n) {
    g.refresh();
    tutEvent(g, "buy");
  }
}

export function castRitual(g: Game, id: RitualId, auto: boolean) {
  const s = g.s;
  const r = s.rit[id];
  const def = RITUALS.find((x) => x.id === id)!;
  if (r.ready > s.clock) return;
  const pw = auto ? TUNE.autoRitualPower : 1;
  r.ready = s.clock + def.cd;
  if (id === "raise") {
    r.until = s.clock + def.dur!;
    r.power = pw;
    g.log(auto ? "Raise the Fallen (auto): drops ×1.6 for 10 minutes." : "Raise the Fallen: double drops for 10 minutes.");
  }
  if (id === "hunger") {
    const gain = Math.max(RITUAL_TUNE.hungerMin, cmRate(g) * RITUAL_TUNE.hungerSecs) * pw;
    s.cm += gain;
    g.log(`Grave Hunger: +${fmt(gain)} Corpse Mass.`);
  }
  if (id === "moon") {
    r.until = s.clock + def.dur!;
    r.power = pw;
    g.log(auto ? "Blood Moon (auto): +30% damage for 20 seconds." : "Blood Moon: +50% damage for 20 seconds.");
  }
  if (!auto) tutEvent(g, "ritual");
  g.refresh();
}

/** auto mode casts Raise and Hunger on cooldown, and saves Blood Moon for bosses */
export function autoRituals(g: Game) {
  for (const id of ["raise", "hunger"] as const) if (g.s.rit[id].ready <= g.s.clock) castRitual(g, id, true);
  if (g.s.rit.moon.ready <= g.s.clock && g.foe?.kind === "boss") castRitual(g, "moon", true);
}

export const infuseCost = (level: number) => Math.floor(TUNE.infuseBase * Math.pow(TUNE.infuseGrow, level - 1));

export function canInfuse(g: Game, abom = 0) {
  const a = g.s.squad[abom];
  const c = g.cs[abom];
  return !!a && !!c && a.infusion < c.cap && g.s.ess >= infuseCost(a.infusion);
}

export function infuse(g: Game, abom = 0) {
  g.refresh();
  if (!canInfuse(g, abom)) return;
  const a = g.s.squad[abom];
  g.s.ess -= infuseCost(a.infusion);
  a.infusion++;
  g.log(`Infusion level ${a.infusion}. The stitches glow faintly.`);
  if (g.s.hint === "infuse") g.s.hint = null;
  g.refresh();
}

/** the Bone Altar takes half your Corpse Mass */
export const altarOffer = (g: Game) => Math.floor(g.s.cm / 2);

export function altarPreview(g: Game) {
  const give = altarOffer(g);
  const now = altarBonus(g.s.altar);
  const after = altarBonus(g.s.altar + give);
  const dps = g.dps();
  return { give, now, after, dps, dpsAfter: (dps * (1 + after)) / (1 + now) };
}

export function sacrifice(g: Game) {
  if (g.s.cm < TUNE.altarMinCm) return;
  const pv = altarPreview(g);
  g.s.cm -= pv.give;
  g.s.altar += pv.give;
  g.refresh();
  g.log(`You feed ${fmt(pv.give)} Corpse Mass to the Bone Altar. The bones shift. Damage +${(pv.now * 100).toFixed(1)}% → +${(altarBonus(g.s.altar) * 100).toFixed(1)}% for this run (DPS ${fmt(pv.dps)} → ${fmt(g.dps())}).`);
}
