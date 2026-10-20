import type { AbilityId, BossMoveType } from "./abilities";
import type { SlotId } from "./slots";
import type { StatId } from "./stats";

/** A kind of body part, like "Hound Skull". Every part in the game is one of these. */
export interface BaseDef {
  slot: SlotId;
  name: string;
  /** built-in stats; the function gets the part's item level */
  imp: [StatId, (ilvl: number) => number][];
  /** affixes this part rolls more often (3× as likely) */
  lean: string[];
  ab?: AbilityId;
  /** boss trophy: always Rare, always kept */
  trophy?: boolean;
  flavor: string;
}

export interface FoeDef {
  name: string;
  /** multipliers on the stage's normal enemy HP and damage */
  hp: number;
  dmg: number;
  /** seconds between attacks */
  int: number;
  /** the signature part it drops */
  drop: string;
  /** Corpse Mass multiplier per kill */
  cm?: number;
}

export interface BossMoveDef {
  type: BossMoveType;
  /** shown while the move winds up */
  tele: string;
  /** shown when it lands (heal and blast) or opens (weak) */
  hit?: string;
  /** shown when an ability answers it */
  countered?: string;
}

export interface BossDef {
  id: string;
  name: string;
  stage: number;
  trophy: string;
  /** moves in order; `at` is seconds into the fight, ± jitter */
  script: { move: string; at: number; jitter: number }[];
  moves: Record<string, BossMoveDef>;
  /** extra parts on each kill, drawn from this pool */
  lootPool: string[];
  /** sometimes the pool gets extra copies of a part */
  lootBonus?: { chance: number; base: string; copies: number };
  thrall: { name: string; stat: StatId; value: number; text: string };
  intro: string;
  idle: string;
  stagger: string;
  /** log lines on the first kill */
  firstClear: string[];
  defeat: string;
  enraged: string;
}

export interface ActDef {
  n: number;
  name: string;
  setting: string;
  /** first and last stage, boss stage included */
  stages: [number, number];
  foes: Record<string, FoeDef>;
  /** which enemies live on each trash stage, by weight */
  stageFoes: Record<number, Record<string, number>>;
  bases: Record<string, BaseDef>;
  /** log line the first time you reach a stage */
  story: Record<number, string>;
  boss: BossDef;
}
