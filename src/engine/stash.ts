import { affixShortName } from "../content/affixes";
import { BASES } from "../content/acts";
import { TUNE } from "../content/tune";
import { fmt } from "./format";
import type { Game } from "./game";
import { isKept, isUnique, makePart, partCM, partName, rarityClass } from "./parts";
import { pickWeighted } from "./rng";
import type { Part, Rarity } from "./state";

/**
 * A full stash renders its oldest unworn, unkept part to make room.
 * If everything is kept, the new drop is left behind.
 * The log mentions it at most once a minute so a full stash doesn't flood it.
 * Returns false when there's no room.
 */
export function makeRoom(g: Game): boolean {
  if (!g.stashFull()) return true;
  const L = g.trim;
  const oldest = g.s.parts.filter((p) => !g.isWorn(p) && !isKept(p)).sort((a, b) => a.id - b.id)[0];
  if (oldest) {
    L.n++;
    L.cm += partCM(oldest);
    removeParts(g, [oldest]);
  } else L.lost++;
  if (Date.now() - L.at > 60000) {
    let msg = `Stash full (${TUNE.stashMax}):`;
    if (L.n) msg += ` rendered your oldest ${L.n > 1 ? L.n + " parts" : "part"} into ${fmt(L.cm)} Corpse Mass to make room. Keep a part to protect it.`;
    if (L.lost) msg += ` ${L.lost} new ${L.lost > 1 ? "parts were" : "part was"} left behind because everything is kept.`;
    g.log(msg, "bad");
    L.n = L.cm = L.lost = 0;
    L.at = Date.now();
  }
  return !!oldest;
}

/** a part drops from a kill; trophies always get in. `sig` makes it an Elite's signature part */
export function dropPart(g: Game, base: string, ilvl: number, weights: Record<Rarity, number>, sig = false): Part | null {
  if (!BASES[base].trophy && !makeRoom(g)) return null;
  const p = makePart(g, base, ilvl, pickWeighted(g.rng, weights), sig);
  g.tick(`${partName(p)} dropped.`, "tc-" + rarityClass(p));
  if (isUnique(p)) {
    g.log(`A unique dropped: ${BASES[base].name} (item level ${ilvl}). ${BASES[base].unique!.text}.`, "perfect");
    g.emit({ type: "rareDrop", id: p.id });
    if (!g.s.seen.hUnique && !g.s.hint) {
      g.s.seen.hUnique = 1;
      g.s.hint = "unique";
    }
  } else if (p.rarity === "rare") {
    g.log(`A Rare ${sig ? "signature " : ""}${BASES[base].name} dropped (item level ${ilvl}).`, "brag");
    g.emit({ type: "rareDrop", id: p.id });
  }
  const best = p.affixes.reduce((m, a) => Math.min(m, a.t), 9);
  if (best <= 3) g.log(`It came with a Tier ${best} ${affixShortName(p.affixes.find((a) => a.t === best)!.k)} roll.`, "brag");
  return p;
}

/** take parts out of the stash and pay their Corpse Mass */
function removeParts(g: Game, list: Part[]) {
  let cm = 0;
  const ids = new Set(list.map((p) => p.id));
  for (const p of list) cm += partCM(p);
  g.s.parts = g.s.parts.filter((p) => !ids.has(p.id));
  g.s.cm += cm;
  return cm;
}

/** parts that can be rendered: not worn, not kept */
export const renderable = (g: Game, list: Part[]) => list.filter((p) => !g.isWorn(p) && !isKept(p));

export function renderPart(g: Game, p: Part) {
  if (g.isWorn(p) || isKept(p)) return;
  const cm = removeParts(g, [p]);
  g.log(`Rendered ${partName(p)} into ${cm} Corpse Mass.`);
}

export function renderCommons(g: Game) {
  const list = renderable(g, g.s.parts.filter((p) => p.rarity === "common"));
  const cm = removeParts(g, list);
  if (list.length) g.log(`Rendered ${list.length} Common parts into ${fmt(cm)} Corpse Mass.`);
  return list.length;
}

/** render a chosen list (Render all, or Select mode); worn and kept parts are skipped */
export function renderMany(g: Game, list: Part[], what = "parts") {
  const ok = renderable(g, list);
  const cm = removeParts(g, ok);
  if (ok.length) g.log(`Rendered ${ok.length} ${what} into ${fmt(cm)} Corpse Mass.`);
  return ok.length;
}

export function setKept(list: Part[], on: boolean) {
  let n = 0;
  for (const p of list) {
    if (BASES[p.base].trophy || !!p.kept === on) continue;
    p.kept = on;
    n++;
  }
  return n;
}

/** what a list of parts would render into, for confirm boxes */
export function renderSummary(g: Game, list: Part[]) {
  const ok = renderable(g, list);
  return {
    count: ok.length,
    cm: ok.reduce((a, p) => a + partCM(p), 0),
    rares: ok.filter((p) => p.rarity === "rare").length,
    skippedKept: list.filter((p) => !g.isWorn(p) && isKept(p)).length,
  };
}

