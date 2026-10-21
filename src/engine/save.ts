import { BASES } from "../content/acts";
import type { Game } from "./game";
import { rollAffixes } from "./parts";
import { SAVE_VERSION, type GameState } from "./state";

export const SAVE_KEY = "graveknit-save";

/**
 * Upgrades for old saves. When the save shape changes, bump SAVE_VERSION in state.ts
 * and add a step here that turns version N into N+1. Never delete old steps.
 */
const MIGRATIONS: Record<number, (s: any) => any> = {
  // 1 → 2: the "victory pop-up every boss kill" setting (off by default)
  1: (s) => ({ ...s, opt: { ...s.opt, bossPop: false }, v: 2 }),
  // 2 → 3: Rare luck starts fresh
  2: (s) => ({ ...s, rareDry: 0, v: 3 }),
  // 3 → 4: Rare luck was removed (a flat Rare chance instead), so its counter goes
  3: ({ rareDry: _gone, ...s }) => ({ ...s, v: 4 }),
};

export function migrate(raw: any): GameState | null {
  if (!raw || typeof raw !== "object" || typeof raw.v !== "number") return null;
  let s = raw;
  while (s.v < SAVE_VERSION) {
    const step = MIGRATIONS[s.v];
    if (!step) return null;
    s = step(s);
  }
  if (s.v > SAVE_VERSION) return null;
  return s as GameState;
}

/** fix anything broken in a loaded save so it can't crash the game */
export function repair(g: Game) {
  const s = g.s;
  s.parts = s.parts.filter((p) => BASES[p.base]);
  for (const p of s.parts) {
    if (p.rarity !== "common" && p.rarity !== "magic" && p.rarity !== "rare") {
      p.rarity = "magic";
      p.affixes = [];
      rollAffixes(g.rng, p);
    }
    if (!Number.isFinite(p.ilvl) || p.ilvl < 1) p.ilvl = 1;
  }
  for (const a of s.squad) for (const slot in a.eq) if (!g.partById(a.eq[slot as keyof typeof a.eq])) delete a.eq[slot as keyof typeof a.eq];
  for (const k of ["cm", "ess", "marrow", "dust", "thread", "altar"] as const) if (!Number.isFinite(s[k])) s[k] = 0;
  g.refresh();
}

export function serialize(s: GameState) {
  return JSON.stringify(s);
}

export function deserialize(text: string): GameState | null {
  try {
    return migrate(JSON.parse(text));
  } catch {
    return null;
  }
}

// ---- Export / Import: the save as a block of text you can copy ----

export function exportSave(s: GameState): string {
  const json = serialize(s);
  return "GK1:" + btoa(unescape(encodeURIComponent(json)));
}

export function importSave(text: string): GameState | null {
  const t = text.trim();
  if (!t.startsWith("GK1:")) return null;
  try {
    return deserialize(decodeURIComponent(escape(atob(t.slice(4)))));
  } catch {
    return null;
  }
}

// ---- browser storage ----

export function loadFromBrowser(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    // a spare copy of the save as it was before this visit, in case an update goes wrong
    if (raw) localStorage.setItem(SAVE_KEY + "-backup", raw);
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
  }
}

export function saveToBrowser(s: GameState) {
  try {
    s.lastSave = Date.now();
    localStorage.setItem(SAVE_KEY, serialize(s));
    return true;
  } catch {
    return false;
  }
}

export function wipeBrowserSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage blocked: nothing to wipe */
  }
}
