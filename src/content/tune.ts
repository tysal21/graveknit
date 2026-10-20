// Every balance number lives here. Change a number, and the whole game follows.
// These match the Act 1 prototype and Balance Bench v2.
export const TUNE = {
  // your Abomination before any parts
  baseHit: 12, baseAps: 1, baseCrit: 5, baseCritMulti: 50, baseHp: 100,

  // normal enemies ("trash"): HP = hpBase × hpGrow^(stage-1) + hpPerStage × stage
  hpBase: 60, hpGrow: 1.17, hpPerStage: 15,
  // enemy hit = dmgBase × dmgGrow^(stage-1)
  dmgBase: 7, dmgGrow: 1.17,
  killsPerStage: 10, healOnKill: 0.08, regenPerSec: 0.01,

  // bosses: 20× trash HP (v1 said 12×, raised after playtesting), hits at 0.5× every 2 seconds
  bossHpMult: 20, enrage: 30, bossHitMult: 0.5, bossAtkInt: 2,
  blastMult: 3.5, healPct: 0.15, weakBonus: 0.5, stunBonus: 0.5,
  telegraphSecs: 3, weakSecs: 4, bossRetryWin: 5, bossRetryLoss: 120,

  // Soul Essence per kill = essBase × essGrow^(stage-1)
  essBase: 2, essGrow: 1.15, bossEssMult: 15, bossCm: 200,

  // Infusion
  infuseBase: 20, infuseGrow: 1.28, infuseMult: 1.12,

  // drops
  partChance: 0.06,
  rarityW: { common: 55, magic: 35, rare: 10 },
  bossRarityW: { common: 15, magic: 50, rare: 35 },
  dustChance: 0.12, marrowChance: 0.03,
  bossLoot: { parts: 2, marrow: 2, dust: 4, threadChance: 0.3 },

  // affix tiers: roll weights, and the item level each tier unlocks at
  tierW: { 5: 45, 4: 30, 3: 15, 2: 7, 1: 3 } as Record<number, number>,
  tierIlvl: { 5: 1, 4: 3, 3: 8, 2: 20, 1: 35 } as Record<number, number>,

  // crafting and the stash
  residueMax: 8, graftMarrow: 3, graftDust: 5, stashMax: 60,

  // Thralls: base chance per boss kill, plus this much per kill without one
  thrallBase: 0.03, thrallPity: 0.005,

  // offline: 55% of the active rate, capped at 12 hours
  offlineRate: 0.55, offlineCapH: 12, offlineMaxParts: 25,

  // Graveyard
  costGrow: 1.15, altarK: 0.25, altarScale: 500, altarMinCm: 20, cmPerKill: 0.5,
  autoRitualPower: 0.6,

  // starting reagents
  start: { cm: 15, marrow: 5, dust: 10, thread: 1 },
} as const;

// Vessel Integrity per item level, by rarity
export const RARITY_INTEGRITY = { common: 0.5, magic: 1, rare: 1.5, trophy: 1.5 } as const;
// Corpse Mass from rendering a part = 5 × item level × this
export const RENDER_CM_PER_ILVL = 5;
