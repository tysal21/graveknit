import { ACT1 } from "./act1";
import { ACT2 } from "./act2";
import { ACT3 } from "./act3";
import type { ActDef, BaseDef } from "./types";

// Every act that is built so far. Acts 4 and 5 are added here as they are built.
export const ACTS: ActDef[] = [ACT1, ACT2, ACT3];

/** the highest stage that is built, whether or not the playtest lets you reach it */
export const BUILT_LAST_STAGE = ACTS[ACTS.length - 1].stages[1];

// The friends' playtest ends at the Ossuary Colossus (Stage 20). Links ending in ?dev still reach every act,
// and so do the tests and bots (they don't run in a browser). Set this to null when the playtest is over:
// anyone who beat the Colossus is let into Act 3 the next time they load.
export const PLAYTEST_END: number | null = 20;

/** the last stage you can reach: the playtest's end in a normal browser link, every built stage otherwise */
export const lastStageFor = (search: string | null) =>
  PLAYTEST_END !== null && search !== null && !new URLSearchParams(search).has("dev") ? Math.min(PLAYTEST_END, BUILT_LAST_STAGE) : BUILT_LAST_STAGE;

/** the highest stage you can reach right now */
export const LAST_STAGE = lastStageFor(typeof location === "undefined" ? null : location.search);

/** true when the game stops early for the playtest, so the end can say so */
export const PLAYTEST_CAPPED = LAST_STAGE < BUILT_LAST_STAGE;

/** every body part in the game, from every act */
export const BASES: Record<string, BaseDef> = Object.assign({}, ...ACTS.map((a) => a.bases));

/** the parts your first Abomination starts with */
export const STARTING_PARTS = ["pauperSkull", "pauperRib", "cleaverArm", "pauperHand", "wispCore"];

export const actForStage = (stage: number): ActDef =>
  ACTS.find((a) => stage >= a.stages[0] && stage <= a.stages[1]) ?? ACTS[ACTS.length - 1];

export const isBossStage = (stage: number) => ACTS.some((a) => a.boss.stage === stage);

export const bossById = (id: string) => ACTS.find((a) => a.boss.id === id)!.boss;
