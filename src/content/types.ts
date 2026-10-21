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
  /** one line for the "How to beat" list, like "Tolls the bell (heals 15%)" */
  short: string;
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
  /** HP as a multiple of the stage's normal enemy HP (default TUNE.bossHpMult, 20×) */
  hpMult?: number;
  trophy: string;
  /** moves in order; `at` is seconds into the fight, ± jitter */
  script: { move: string; at: number; jitter: number }[];
  moves: Record<string, BossMoveDef>;
  /** extra parts on each kill, drawn from this pool */
  lootPool: string[];
  /** sometimes the pool gets extra copies of a part */
  lootBonus?: { chance: number; base: string; copies: number };
  thrall: { name: string; stat: StatId; value: number; text: string };
  /** "him" or "it", for lines like "Kill him within 30 seconds" */
  them: string;
  /** the lesson shown before the first fight; **text** is bold */
  lesson: { intro: string; moves: string[]; outro: string };
  intro: string;
  idle: string;
  stagger: string;
  /** log lines on the first kill */
  firstClear: string[];
  defeat: string;
  enraged: string;
}

/**
 * A stage guardian: a named mini-boss that is the last kill of a stage the first time you clear it.
 * Each one previews one boss move, and is tuned so you need an upgrade or two to beat it.
 */
export interface GuardianDef {
  name: string;
  /** which of the act's enemies it is a bigger version of (its Corpse Mass) */
  foe: string;
  /** multipliers on the stage's normal enemy HP and damage */
  hp: number;
  dmg: number;
  /** seconds between attacks */
  int: number;
  /** its one boss move, first used at `first` seconds and then every `every` seconds */
  move?: BossMoveDef & { first: number; every: number };
  /** the part it always drops, always Magic */
  drop: string;
  /** log line when it shows up */
  intro: string;
  /** log line when it beats you */
  defeat: string;
  /** shown while it isn't using its move */
  idle: string;
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
  /** mini-bosses at the end of some early stages, by stage */
  guardians?: Record<number, GuardianDef>;
  boss: BossDef;
}
