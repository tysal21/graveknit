import { ACT1 } from "./act1";
import { ACT2 } from "./act2";
import type { ActDef, BaseDef } from "./types";

// Every act that is built so far. Acts 2 to 5 are added here as they are built.
export const ACTS: ActDef[] = [ACT1, ACT2];

/** the highest stage that exists in the game right now */
export const LAST_STAGE = ACTS[ACTS.length - 1].stages[1];

/** every body part in the game, from every act */
export const BASES: Record<string, BaseDef> = Object.assign({}, ...ACTS.map((a) => a.bases));

/** the parts your first Abomination starts with */
export const STARTING_PARTS = ["pauperSkull", "pauperRib", "cleaverArm", "pauperHand", "wispCore"];

export const actForStage = (stage: number): ActDef =>
  ACTS.find((a) => stage >= a.stages[0] && stage <= a.stages[1]) ?? ACTS[ACTS.length - 1];

export const isBossStage = (stage: number) => ACTS.some((a) => a.boss.stage === stage);

export const bossById = (id: string) => ACTS.find((a) => a.boss.id === id)!.boss;
