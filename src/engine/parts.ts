import { AFFIX } from "../content/affixes";
import { BASES } from "../content/acts";
import { RARITY_INTEGRITY, RENDER_CM_PER_ILVL, TUNE } from "../content/tune";
import type { Game } from "./game";
import type { Affix, Part, Rarity } from "./state";
import { pickWeighted, type Rng } from "./rng";

// ---- affix tiers ----

/** tiers this item level can roll, worst first */
export const allowedTiers = (ilvl: number) => [5, 4, 3, 2, 1].filter((t) => ilvl >= TUNE.tierIlvl[t]);

export function tierOdds(ilvl: number): Record<number, number> {
  const ts = allowedTiers(ilvl);
  const tot = ts.reduce((a, t) => a + TUNE.tierW[t], 0);
  const o: Record<number, number> = {};
  for (const t of ts) o[t] = TUNE.tierW[t] / tot;
  return o;
}

export const rollTier = (rng: Rng, ilvl: number) => +pickWeighted(rng, tierOdds(ilvl));

const ilvlScale = (ilvl: number) => 0.5 + ilvl / 20;

/** a tier's range after stretching it around its middle (see TUNE.tierSpread) */
export function tierRange(k: string, t: number): [number, number] {
  const [lo, hi] = AFFIX[k].r[t - 1];
  const mid = (lo + hi) / 2, half = ((hi - lo) / 2) * TUNE.tierSpread;
  // never let the bottom of a range reach zero
  return [Math.max(mid - half, lo / 3), mid + half];
}

/** where a roll lands in its range, 0 to 1: the average of two dice, so the middle is common and the ends are rare */
export const rollRoll = (rng: Rng) => (rng() + rng()) / 2;

/** a word for how good a roll is within its tier */
export function rollQuality(roll: number): { label: string; cls: string } {
  if (roll >= 0.9) return { label: "Perfect", cls: "q-perfect" };
  if (roll >= 0.75) return { label: "Pristine", cls: "q-pristine" };
  if (roll >= 0.4) return { label: "Fine", cls: "q-fine" };
  if (roll >= 0.1) return { label: "Fair", cls: "q-fair" };
  return { label: "Botched", cls: "q-botched" };
}

export function affixValue(a: Affix, ilvl: number): number {
  const A = AFFIX[a.k];
  const [lo, hi] = tierRange(a.k, a.t);
  let v = lo + (hi - lo) * a.roll;
  if (A.scale) v *= ilvlScale(ilvl);
  return A.dec ? Math.round(v * 10) / 10 : Math.round(v);
}

export function affixRange(a: Affix, ilvl: number): string {
  const A = AFFIX[a.k];
  const r = tierRange(a.k, a.t);
  const m = A.scale ? ilvlScale(ilvl) : 1;
  const f = (x: number) => (A.dec ? Math.round(x * m * 10) / 10 : Math.round(x * m));
  return `${f(r[0])}–${f(r[1])}`;
}

/** affixes per kind (prefix/suffix) for a rarity */
const slotsFor = (r: Rarity) => (r === "rare" ? 2 : r === "common" ? 0 : 1);

function pickAffixType(rng: Rng, part: Part, kind: "pre" | "suf", exclude: string[]): string {
  const lean = BASES[part.base].lean;
  const w: Record<string, number> = {};
  for (const k in AFFIX) {
    if (AFFIX[k].kind !== kind || exclude.includes(k)) continue;
    w[k] = lean.includes(k) ? 30 : 10;
  }
  return pickWeighted(rng, w);
}

/** reroll every unlocked affix; locked ones stay */
export function rollAffixes(rng: Rng, p: Part) {
  const out = p.affixes.filter((a) => a.locked);
  const n = slotsFor(p.rarity);
  for (const kind of ["pre", "suf"] as const) {
    let have = out.filter((a) => AFFIX[a.k].kind === kind).length;
    while (have < n) {
      const k = pickAffixType(rng, p, kind, out.map((a) => a.k));
      out.push({ k, t: rollTier(rng, p.ilvl), roll: rollRoll(rng), locked: false });
      have++;
    }
  }
  const ord = (a: Affix) => (AFFIX[a.k].kind === "pre" ? 0 : 1);
  out.sort((a, b) => ord(a) - ord(b));
  p.affixes = out;
}

/** make a new part and put it in the stash */
export function makePart(g: Game, base: string, ilvl: number, rarity: Rarity): Part {
  if (BASES[base].trophy && rarity !== "common") rarity = "rare";
  const p: Part = { id: g.s.nextId++, base, ilvl, rarity, affixes: [], residue: 0, isNew: true, born: Date.now() };
  rollAffixes(g.rng, p);
  g.s.parts.push(p);
  return p;
}

// ---- naming and labels ----

/** how good the rolls are: higher is better; used to judge rerolls */
export const partScore = (p: Part) => p.affixes.reduce((s, a) => s + affixScore(a), 0);
export const affixScore = (a: Pick<Affix, "t" | "roll">) => 6 - a.t + a.roll * 0.9;

export function partName(p: Part): string {
  const b = BASES[p.base];
  if (p.rarity !== "magic") return b.name;
  const pre = p.affixes.find((a) => AFFIX[a.k].kind === "pre");
  const suf = p.affixes.find((a) => AFFIX[a.k].kind === "suf");
  return `${pre ? AFFIX[pre.k].name + " " : ""}${b.name}${suf ? " " + AFFIX[suf.k].name : ""}`;
}

export type RarityClass = Rarity | "trophy";
export const rarityClass = (p: Part): RarityClass => (BASES[p.base].trophy ? "trophy" : p.rarity);
export const rarityLabel = (p: Part) => (BASES[p.base].trophy ? "Trophy" : p.rarity[0].toUpperCase() + p.rarity.slice(1));

export const partIntegrity = (p: Part) => p.ilvl * RARITY_INTEGRITY[rarityClass(p)];
/** Corpse Mass you get for rendering it */
export const partCM = (p: Part) => Math.round(RENDER_CM_PER_ILVL * p.ilvl * RARITY_INTEGRITY[rarityClass(p)]);
export const isTrophy = (p: Part) => !!BASES[p.base].trophy;
/** kept parts are safe from every kind of rendering; trophies always are */
export const isKept = (p: Part) => !!(p.kept || isTrophy(p));
