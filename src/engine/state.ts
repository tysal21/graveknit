import type { RitualId } from "../content/rituals";
import type { SlotId } from "../content/slots";
import type { HintId } from "../content/tutorial";

export type Rarity = "common" | "magic" | "rare";
export type SortId = "new" | "upgrade" | "ilvl" | "tier";

export interface Affix {
  /** which affix, a key of AFFIX */
  k: string;
  /** tier 1 (best) to 5 */
  t: number;
  /** 0 to 1: where the value sits inside the tier's range */
  roll: number;
  /** locked with a Spectral Thread */
  locked: boolean;
}

export interface Part {
  id: number;
  base: string;
  ilvl: number;
  rarity: Rarity;
  affixes: Affix[];
  residue: number;
  isNew: boolean;
  born: number;
  kept?: boolean;
}

export interface Abomination {
  name: string;
  /** part id worn in each slot */
  eq: Partial<Record<SlotId, number>>;
  /** Infusion levels bought */
  infusion: number;
}

export interface BossRecord {
  kills: number;
  thrall: boolean;
  /** kills without raising a Thrall, for the pity chance */
  tries: number;
}

export interface LogEntry {
  t: number;
  text: string;
  cls: "" | "story" | "brag" | "bad";
}

export interface RitualState {
  ready: number;
  until: number;
  power: number;
}

/** Everything that gets saved. */
export interface GameState {
  v: number;
  /** game time in seconds; cooldowns and buffs are measured against it */
  clock: number;
  stage: number;
  maxStage: number;
  kills: number;
  cm: number;
  ess: number;
  lifeEss: number;
  marrow: number;
  dust: number;
  thread: number;
  gens: Record<string, number>;
  altar: number;
  squad: Abomination[];
  parts: Part[];
  nextId: number;
  bosses: Record<string, BossRecord>;
  rit: Record<RitualId, RitualState>;
  opt: { push: boolean; auto: boolean; boss: boolean; rit: boolean; sound: boolean; sort: SortId };
  tut: number;
  tutKills: number;
  tutPart: number | null;
  hint: HintId | null;
  seen: Record<string, 1>;
  log: LogEntry[];
  lastSave: number;
  bossRetryAt: number;
  stats: { kills: number; rolls: number };
}

/** the newest save version; see save.ts for how older saves are upgraded */
export const SAVE_VERSION = 1;
