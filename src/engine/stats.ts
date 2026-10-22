import { AFFIX } from "../content/affixes";
import { ABILITY, ABILITY_TUNE, type AbilityId, type BossMoveType } from "../content/abilities";
import { ACTS, BASES } from "../content/acts";
import { GENERATORS } from "../content/generators";
import { RITUAL_TUNE } from "../content/rituals";
import { SLOTS } from "../content/slots";
import type { StatId } from "../content/stats";
import { TUNE } from "../content/tune";
import type { Game } from "./game";
import { affixShortName } from "../content/affixes";
import { affixScore, affixValue, implicits, partIntegrity } from "./parts";
import type { Affix, Part } from "./state";

export interface Stats extends Record<StatId, number> {
  hit: number;
  aps: number;
  poisonDps: number;
  maxHp: number;
  dps: number;
  /** Infusion levels that count (bought, up to the cap) */
  lvl: number;
  /** Infusion cap from Vessel Integrity */
  cap: number;
  /** total Vessel Integrity */
  integrity: number;
  /** Infusion multiplier */
  inf: number;
  altar: number;
  moon: number;
  /** Plague Wind's poison multiplier while it blows */
  wind: number;
  /** share of the squad's damage that heals the Vanguard (The Last Torch) */
  leech: number;
  /** Reap's finishing threshold, as a share of the target's HP */
  reapAt: number;
  /** poison multiplier from The Plague Mask */
  plague: number;
  abilities: AbilityId[];
}

export type Mirrored = { a: Affix; part: Part; wearer: number };

/** what a Rival's Core copies for this Abomination (null without one) */
export function mirroredAffix(g: Game, abom: number, eq: Part[] = wornParts(g, abom)): Mirrored | null {
  return eq.some((p) => BASES[p.base].mirror) ? bestAllyAffix(g, abom, eq) : null;
}

/** the best affix any other squad member wears, skipping the parts in `eq` */
export function bestAllyAffix(g: Game, abom: number, eq: Part[] = []): Mirrored | null {
  let best: Mirrored | null = null;
  g.s.squad.forEach((_, i) => {
    if (i === abom) return;
    for (const part of wornParts(g, i)) {
      // never copy a part this Abomination is about to wear (a swap preview), or another mirror
      if (eq.includes(part) || BASES[part.base].mirror) continue;
      for (const a of part.affixes) if (!best || affixScore(a) > affixScore(best.a)) best = { a, part, wearer: i };
    }
  });
  return best;
}

/** the parts an Abomination wears; `swap` previews wearing a different part in its slot */
export function wornParts(g: Game, abom = 0, swap?: Part): Part[] {
  const eq = g.s.squad[abom].eq;
  const out: Part[] = [];
  for (const { id: slot } of SLOTS) {
    if (swap && BASES[swap.base].slot === slot) {
      out.push(swap);
      continue;
    }
    const id = eq[slot];
    const p = id !== undefined ? g.partById(id) : undefined;
    if (p) out.push(p);
  }
  return out;
}

export function integrityCap(parts: Part[]) {
  const total = parts.reduce((s, p) => s + partIntegrity(p), 0);
  return { total, cap: Math.max(1, Math.floor(total / 10)) };
}

export const altarBonus = (given: number) => TUNE.altarK * Math.log10(1 + given / TUNE.altarScale);

/** every flat contribution to each stat, labelled with where it came from (used by info blips) */
export function statSources(g: Game, abom = 0): Partial<Record<StatId, [string, number][]>> {
  const m: Partial<Record<StatId, [string, number][]>> = {};
  const add = (st: StatId, label: string, v: number) => {
    if (v) (m[st] = m[st] || []).push([label, v]);
  };
  add("flat", "Base", TUNE.baseHit);
  add("cc", "Base", TUNE.baseCrit);
  add("cm", "Base", TUNE.baseCritMulti);
  add("hpFlat", "Base", TUNE.baseHp);
  for (const p of wornParts(g, abom)) {
    const b = BASES[p.base];
    for (const [st, v] of implicits(p)) add(st, `${b.name} (built in${p.sig ? ", signature ×1.5" : ""})`, v);
    for (const a of p.affixes) add(AFFIX[a.k].stat, `${affixShortName(a.k)} T${a.t} on ${b.name}`, affixValue(a, p.ilvl));
  }
  const mir = mirroredAffix(g, abom);
  if (mir) add(AFFIX[mir.a.k].stat, `Rival's Core copies ${affixShortName(mir.a.k)} T${mir.a.t}`, affixValue(mir.a, mir.part.ilvl));
  for (const gen of GENERATORS) {
    const n = g.s.gens[gen.id] || 0;
    if (gen.bonus && n) add(gen.bonus.stat, `${gen.name} ×${n}`, +(gen.bonus.value * n).toFixed(1));
  }
  for (const act of ACTS) {
    const t = act.boss.thrall;
    if (g.s.bosses[act.boss.id]?.thrall) add(t.stat, `${t.name} aura`, t.value);
  }
  return m;
}

/** work out an Abomination's stats. `swap` previews a different part; `ignoreBuffs` leaves out Blood Moon. */
export function calc(g: Game, opts: { abom?: number; swap?: Part; ignoreBuffs?: boolean } = {}): Stats {
  const abom = opts.abom ?? 0;
  const s = g.s;
  const eq = wornParts(g, abom, opts.swap);
  const t: Record<StatId, number> = { flat: TUNE.baseHit, dmgPct: 0, cc: TUNE.baseCrit, cm: TUNE.baseCritMulti, as: 0, poison: 0, hpFlat: TUNE.baseHp, hpPct: 0, ess: 0, drop: 0, splash: 0 };
  for (const p of eq) {
    for (const [st, v] of implicits(p)) t[st] += v;
    for (const a of p.affixes) t[AFFIX[a.k].stat] += affixValue(a, p.ilvl);
  }
  const mir = mirroredAffix(g, abom, eq);
  if (mir) t[AFFIX[mir.a.k].stat] += affixValue(mir.a, mir.part.ilvl);
  const has = (e: string) => eq.some((p) => BASES[p.base].unique?.effect === e);
  for (const gen of GENERATORS) if (gen.bonus) t[gen.bonus.stat] += gen.bonus.value * (s.gens[gen.id] || 0);
  for (const act of ACTS) if (s.bosses[act.boss.id]?.thrall) t[act.boss.thrall.stat] += act.boss.thrall.value;

  const { total, cap } = integrityCap(eq);
  const lvl = Math.min(s.squad[abom].infusion, cap);
  const inf = Math.pow(TUNE.infuseMult, lvl - 1);
  const moon = !opts.ignoreBuffs && s.rit.moon.until > s.clock ? 1 + RITUAL_TUNE.moonPower * s.rit.moon.power : 1;
  const wind = !opts.ignoreBuffs && s.rit.wind.until > s.clock ? 1 + RITUAL_TUNE.windPower * s.rit.wind.power : 1;
  const plague = has("plague") ? TUNE.uniqueFx.plague : 1;
  const altar = altarBonus(s.altar);
  const mult = (1 + t.dmgPct / 100) * inf * (1 + altar) * moon;
  const cc = Math.min(100, t.cc);
  const hit = t.flat * mult;
  const aps = TUNE.baseAps * (1 + t.as / 100);
  const poisonDps = t.poison * inf * (1 + altar) * moon * wind * plague;
  const maxHp = t.hpFlat * inf * (1 + t.hpPct / 100);
  const dps = hit * aps * (1 + ((cc / 100) * t.cm) / 100) + poisonDps;
  const main = eq.find((p) => BASES[p.base].slot === "main");
  const core = eq.find((p) => BASES[p.base].slot === "core");
  const abilities = [main && BASES[main.base].ab, core && BASES[core.base].ab].filter(Boolean) as AbilityId[];
  const leech = has("leech") ? TUNE.uniqueFx.leech : 0;
  const reapAt = has("execute") ? TUNE.uniqueFx.execute : ABILITY_TUNE.reap.below;
  return { ...t, cc, hit, aps, poisonDps, maxHp, dps, lvl, cap, integrity: total, inf, altar, moon, wind, leech, reapAt, plague, abilities };
}

/** how much better wearing `p` on Abomination `abom` would be: % DPS change plus half the % HP change */
export function partGain(g: Game, p: Part, base0?: Stats, abom = 0): number {
  if (g.isWorn(p)) return 0;
  base0 ??= calc(g, { abom, ignoreBuffs: true });
  const c = calc(g, { abom, swap: p, ignoreBuffs: true });
  return (c.dps - base0.dps) / base0.dps + (0.5 * (c.maxHp - base0.maxHp)) / base0.maxHp;
}

/** the part of a stat that every squad member gets alike (generators, Thrall auras), so it isn't counted twice */
export function sharedBonus(g: Game, st: StatId) {
  let v = 0;
  for (const gen of GENERATORS) if (gen.bonus?.stat === st) v += gen.bonus.value * (g.s.gens[gen.id] || 0);
  for (const act of ACTS) if (act.boss.thrall.stat === st && g.s.bosses[act.boss.id]?.thrall) v += act.boss.thrall.value;
  return v;
}

/** Soul Essence and drop bonuses add up across the squad: the Vanguard's full bonus plus what the others' parts give */
export function squadBonus(g: Game, st: "ess" | "drop", cs: Stats[] = g.cs) {
  const shared = sharedBonus(g, st);
  return cs.reduce((sum, c, i) => sum + (i === 0 ? c[st] : c[st] - shared), 0);
}

/** the squad's damage adds up */
export const squadDps = (cs: Stats[]) => cs.reduce((sum, c) => sum + c.dps, 0);

export const hasCounterFor = (abilities: AbilityId[], type: BossMoveType) =>
  abilities.some((a) => ABILITY[a].counters === type);
