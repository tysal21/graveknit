import { actForStage, isBossStage } from "../content/acts";
import { TUNE } from "../content/tune";
import { essPerKill, reagentRate, trashHp } from "./combat";
import { cmRate } from "./economy";
import type { Game } from "./game";
import { makePart } from "./parts";
import { pickWeighted } from "./rng";
import { makeRoom } from "./stash";
import { calc, squadBonus, squadDps } from "./stats";

export interface OfflineReport {
  sec: number;
  kills: number;
  ess: number;
  cm: number;
  parts: number;
  rare: number;
  dust: number;
  marrow: number;
  stage: number;
  capped: boolean;
  /** true when this was an open tab dozing, not a closed game */
  dozed?: boolean;
}

/** add up two payouts, for the dozing tab that is paid a minute at a time */
export function mergeReports(a: OfflineReport | null, b: OfflineReport): OfflineReport {
  if (!a) return b;
  return {
    sec: a.sec + b.sec, kills: a.kills + b.kills, ess: a.ess + b.ess, cm: a.cm + b.cm, parts: a.parts + b.parts,
    rare: a.rare + b.rare, dust: a.dust + b.dust, marrow: a.marrow + b.marrow, stage: b.stage, capped: a.capped || b.capped,
  };
}

/** 2.3 becomes 2 or 3 (3 with 30% odds), so short absences don't always round down to nothing */
function chanceRound(g: Game, n: number) {
  return Math.floor(n + g.rng());
}

/**
 * Progress while the game was closed: 50% of the active rate, capped at 12 hours.
 * Kills happen on your current stage at your current power.
 */
export function offlineProgress(g: Game, seconds: number): OfflineReport {
  const s = g.s;
  const capped = seconds >= TUNE.offlineCapH * 3600;
  const sec = Math.min(seconds, TUNE.offlineCapH * 3600);
  const rate = TUNE.offlineRate;
  const cs = g.s.squad.map((_, i) => calc(g, { abom: i, ignoreBuffs: true }));
  const dps = squadDps(cs);
  const stage = isBossStage(s.stage) ? s.stage - 1 : s.stage;
  const act = actForStage(stage);
  const w = act.stageFoes[stage];
  let avgHp = 0, tot = 0;
  for (const k in w) {
    avgHp += trashHp(stage) * act.foes[k].hp * w[k];
    tot += w[k];
  }
  avgHp /= tot;
  const kills = chanceRound(g, (sec / (avgHp / dps + TUNE.walkIn)) * rate);
  const ess = kills * essPerKill(stage) * (1 + squadBonus(g, "ess", cs) / 100);
  const cm = cmRate(g) * sec * rate + kills * stage * 1.5;
  const loot = kills * TUNE.offlineLoot;
  const partsRolled = Math.min(TUNE.offlineMaxParts, chanceRound(g, loot * TUNE.partChance * (1 + squadBonus(g, "drop", cs) / 100)));
  const rg = reagentRate(stage, s.maxStage);
  const dust = chanceRound(g, loot * TUNE.dustChance * rg);
  const marrow = chanceRound(g, loot * TUNE.marrowChance * rg);
  s.ess += ess;
  s.lifeEss += ess;
  s.cm += cm;
  s.dust += dust;
  s.marrow += marrow;
  s.clock += sec;
  let rare = 0, parts = 0;
  for (let i = 0; i < partsRolled; i++) {
    if (!makeRoom(g)) continue;
    const k = pickWeighted(g.rng, w);
    // every part gets a proper rarity (the prototype's NaN bug came from skipping this)
    const p = makePart(g, act.foes[k].drop, stage, pickWeighted(g.rng, TUNE.rarityW));
    parts++;
    if (p.rarity === "rare") rare++;
  }
  g.refresh();
  return { sec, kills, ess, cm, parts, rare, dust, marrow, stage, capped };
}
