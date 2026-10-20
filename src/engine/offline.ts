import { actForStage, isBossStage } from "../content/acts";
import { TUNE } from "../content/tune";
import { essPerKill, trashHp } from "./combat";
import { cmRate } from "./economy";
import type { Game } from "./game";
import { makePart } from "./parts";
import { pickWeighted } from "./rng";
import { makeRoom } from "./stash";
import { calc } from "./stats";

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
}

/**
 * Progress while the game was closed: 55% of the active rate, capped at 12 hours.
 * Kills happen on your current stage at your current power.
 */
export function offlineProgress(g: Game, seconds: number): OfflineReport {
  const s = g.s;
  const capped = seconds >= TUNE.offlineCapH * 3600;
  const sec = Math.min(seconds, TUNE.offlineCapH * 3600);
  const rate = TUNE.offlineRate;
  const c = calc(g, { ignoreBuffs: true });
  const stage = isBossStage(s.stage) ? s.stage - 1 : s.stage;
  const act = actForStage(stage);
  const w = act.stageFoes[stage];
  let avgHp = 0, tot = 0;
  for (const k in w) {
    avgHp += trashHp(stage) * act.foes[k].hp * w[k];
    tot += w[k];
  }
  avgHp /= tot;
  const kills = Math.floor((sec / (avgHp / c.dps + 0.3)) * rate);
  const ess = kills * essPerKill(stage) * (1 + c.ess / 100);
  const cm = cmRate(g) * sec * rate + kills * stage * 1.5;
  const partsRolled = Math.min(TUNE.offlineMaxParts, Math.round(kills * TUNE.partChance * (1 + c.drop / 100)));
  const dust = Math.round(kills * TUNE.dustChance);
  const marrow = Math.round(kills * TUNE.marrowChance);
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
