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

  // stage guardians: their big hit is this many of their normal hits; they pay this many kills' worth of Essence
  guardianBlastMult: 2.5, guardianEssMult: 10,

  // Soul Essence per kill = essBase × essGrow^(stage-1)
  essBase: 2, essGrow: 1.15, bossEssMult: 15, bossCm: 200,

  // Infusion
  infuseBase: 20, infuseGrow: 1.28, infuseMult: 1.12,

  // drops
  partChance: 0.04,
  rarityW: { common: 65, magic: 28, rare: 7 },
  // Rare luck: a Rare part is about 1 kill in 360, so after half that many kills without one the Rare weight
  // doubles, and again every this-many kills after (7 → 14 → 28 …) up to the cap (a Rare is about half of all
  // drops). A Rare resets it.
  rareDoubleKills: 180, rareCapW: 93,
  // only kills this close to your furthest stage build Rare luck, so farming Stage 1 doesn't
  rareLuckStages: 2,
  bossRarityW: { common: 15, magic: 50, rare: 35 },
  dustChance: 0.12, marrowChance: 0.03,
  bossLoot: { parts: 2, marrow: 2, dust: 4, threadChance: 0.3 },

  // affix tiers: roll weights, and the item level each tier unlocks at
  tierW: { 5: 45, 4: 30, 3: 15, 2: 7, 1: 3 } as Record<number, number>,
  tierIlvl: { 5: 1, 4: 3, 3: 8, 2: 20, 1: 35 } as Record<number, number>,

  // affix rolls: each tier's range is stretched this much around its middle, so neighbouring tiers overlap a little.
  // Rolls follow a bell curve (the average of two dice), so the top or bottom 10% of a range is about 1 roll in 50.
  tierSpread: 1.8,

  // crafting and the stash
  residueMax: 8, graftMarrow: 3, graftDust: 5, stashMax: 60,
  // Re-stitch lifts a part to your best stage's item level. Cost per level gained, × the part's rarity weight
  // (Common 0.5, Magic 1, Rare/Trophy 1.5): Grave Dust, plus this many kills' worth of Soul Essence at the new level
  restitchDust: 3, restitchEssKills: 50,
  // pressing Grave Dust into a Marrow Shard
  dustPerMarrow: 20,

  // Thralls: base chance per boss kill, plus this much per kill without one
  thrallBase: 0.03, thrallPity: 0.005,

  // offline: 55% of the active rate, capped at 12 hours
  offlineRate: 0.55, offlineCapH: 12, offlineMaxParts: 25,

  // Graveyard
  costGrow: 1.15, altarK: 0.25, altarScale: 500, altarMinCm: 20, cmPerKill: 0.5,
  autoRitualPower: 0.6,

  // the stage you must reach to open each squad slot (slot 1 is yours from the start)
  squadSlots: [1, 20, 40],

  // starting reagents
  start: { cm: 15, marrow: 5, dust: 10, thread: 1 },
} as const;

// Vessel Integrity per item level, by rarity
export const RARITY_INTEGRITY = { common: 0.5, magic: 1, rare: 1.5, trophy: 1.5 } as const;
// Corpse Mass from rendering a part = 5 × item level × this
export const RENDER_CM_PER_ILVL = 5;
