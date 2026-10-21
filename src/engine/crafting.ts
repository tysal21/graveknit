import { AFFIX, affixShortName } from "../content/affixes";
import { BASES } from "../content/acts";
import { TUNE } from "../content/tune";
import type { Game } from "./game";
import { affixScore, allowedTiers, partScore, rollAffixes } from "./parts";
import type { Affix, Part } from "./state";
import { tutEvent } from "./tutorial";

/** which affixes got better or worse after a roll, so the screen can flash them */
export type Flash = Record<number, "up" | "down" | "">;

function flashes(p: Part, before: Affix[]): Flash {
  const f: Flash = {};
  p.affixes.forEach((a, i) => {
    if (a.locked) return;
    const b = before.find((x) => x.k === a.k);
    const sb = b ? affixScore(b) : -1, sa = affixScore(a);
    f[i] = sa > sb + 0.001 ? "up" : sa < sb - 0.001 ? "down" : "";
  });
  return f;
}

function bragRoll(g: Game, p: Part, before: Affix[]) {
  for (const a of p.affixes) {
    if (a.locked) continue;
    if (a.t <= 3 && !before.some((b) => b.k === a.k && b.t <= a.t)) g.log(`You rolled a Tier ${a.t} ${affixShortName(a.k)} on a ${BASES[p.base].name}!`, "brag");
  }
}

export const canCraft = (p: Part) => p.rarity !== "common";

/** Marrow Shard: reroll every unlocked affix. Bad rolls fill Residue; a full bar guarantees a better tier. */
export function marrow(g: Game, p: Part): Flash | null {
  const s = g.s;
  if (s.marrow < 1 || !canCraft(p)) return null;
  s.marrow--;
  s.stats.rolls++;
  const before = p.affixes.map((a) => ({ ...a }));
  const oldScore = partScore(p);
  const guarantee = p.residue >= TUNE.residueMax;
  const oldBest = Math.min(...p.affixes.filter((a) => !a.locked).map((a) => a.t), 6);
  rollAffixes(g.rng, p);
  if (guarantee) {
    const free = p.affixes.filter((a) => !a.locked);
    const a = free[Math.floor(g.rng() * free.length)];
    const capT = Math.min(...allowedTiers(p.ilvl));
    a.t = Math.max(capT, Math.min(a.t, oldBest - 1));
    p.residue = 0;
    g.log(`Residue spent: ${affixShortName(a.k)} landed at Tier ${a.t}.`, "brag");
  } else if (partScore(p) <= oldScore) {
    p.residue = Math.min(TUNE.residueMax, p.residue + 1);
  }
  bragRoll(g, p, before);
  g.refresh();
  tutEvent(g, "marrow");
  return flashes(p, before);
}

/** Grave Dust: keep the tiers, reroll the numbers inside them */
export function dust(g: Game, p: Part): Flash | null {
  if (g.s.dust < 1 || !canCraft(p)) return null;
  g.s.dust--;
  const before = p.affixes.map((a) => ({ ...a }));
  for (const a of p.affixes) if (!a.locked) a.roll = g.rng();
  g.refresh();
  return flashes(p, before);
}

/** Spectral Thread: lock one affix (only one at a time). Unlocking is free; the Thread is used up. */
export function toggleLock(g: Game, p: Part, i: number) {
  const a = p.affixes[i];
  if (!a) return;
  if (a.locked) {
    a.locked = false;
    return;
  }
  if (g.s.thread < 1) return;
  for (const b of p.affixes) b.locked = false;
  g.s.thread--;
  a.locked = true;
}

export function equip(g: Game, p: Part, abom = 0) {
  const slot = BASES[p.base].slot;
  // a part can only be worn by one Abomination: take it off whoever had it
  for (const a of g.s.squad) if (a.eq[slot] === p.id) delete a.eq[slot];
  g.s.squad[abom].eq[slot] = p.id;
  p.isNew = false;
  g.refresh();
  tutEvent(g, "equip");
}

// ---- grafting: sacrifice a donor to move one affix onto a part of the same slot ----

export function donors(g: Game, p: Part) {
  return g.s.parts.filter((x) => x !== p && !g.isWorn(x) && BASES[x.base].slot === BASES[p.base].slot && x.affixes.length);
}

export const canGraft = (g: Game, p: Part) =>
  canCraft(p) && g.s.marrow >= TUNE.graftMarrow && g.s.dust >= TUNE.graftDust && donors(g, p).length > 0;

/** which of the target's affixes a donor affix may replace: same kind, and the same affix if the target already has it */
export function graftSlots(t: Part, a: Affix) {
  const kind = AFFIX[a.k].kind;
  const dupe = t.affixes.findIndex((x) => x.k === a.k);
  return t.affixes.map((_, i) => i).filter((i) => AFFIX[t.affixes[i].k].kind === kind && (dupe < 0 || dupe === i));
}

/** a copy of the target with affix `i` replaced, for previews */
export function graftResult(t: Part, a: Affix, i: number): Part {
  const c = { ...t, affixes: t.affixes.map((x) => ({ ...x })) };
  c.affixes[i] = { k: a.k, t: a.t, roll: a.roll, locked: false };
  return c;
}

export const graftIsBetter = (old: Affix, nw: Affix) => affixScore(nw) >= affixScore(old);

export function graft(g: Game, target: Part, donor: Part, donorAffix: number, targetAffix: number) {
  const s = g.s;
  if (s.marrow < TUNE.graftMarrow || s.dust < TUNE.graftDust) return false;
  const a = donor.affixes[donorAffix];
  if (!a || !graftSlots(target, a).includes(targetAffix)) return false;
  s.marrow -= TUNE.graftMarrow;
  s.dust -= TUNE.graftDust;
  target.affixes[targetAffix] = { k: a.k, t: a.t, roll: a.roll, locked: false };
  s.parts = s.parts.filter((x) => x !== donor);
  g.log(`Grafted Tier ${a.t} ${affixShortName(a.k)} onto ${BASES[target.base].name}.`, "brag");
  g.refresh();
  return true;
}
