// Boss abilities come from parts: one from the Main Arm, one from the Soul Core.
// "counters" says which boss move each ability answers.
export type AbilityId = "cleave" | "bury" | "haste" | "ward" | "phase" | "reap";
export type BossMoveType = "heal" | "blast" | "weak" | "summon";

export interface AbilityDef {
  name: string;
  type: string;
  desc: string;
  cd: number;
  counters?: BossMoveType;
  /** fires on trash only when HP is below 60% in auto mode */
  defensive?: boolean;
}

export const ABILITY: Record<AbilityId, AbilityDef> = {
  cleave: { name: "Cleave", type: "Burst", desc: "One huge hit. Double strength while the boss is exposed.", cd: 8, counters: "weak" },
  bury: { name: "Bury", type: "Interrupt", desc: "Interrupts a boss's healing move and stuns it.", cd: 10, counters: "heal" },
  haste: { name: "Haste", type: "Damage window", desc: "Attack 60% faster for 5 seconds.", cd: 15, counters: "weak" },
  ward: { name: "Ward", type: "Shield", desc: "Shield the Vanguard for 40% of max HP, 4 seconds.", cd: 12, counters: "blast", defensive: true },
  phase: { name: "Phase", type: "Dodge", desc: "The next hit within 4 seconds misses.", cd: 14, counters: "blast", defensive: true },
  reap: { name: "Reap", type: "Finisher", desc: "A heavy swing. Deals 2.5× more to a target under 25% HP.", cd: 10 },
};

// numbers for each ability
export const ABILITY_TUNE = {
  cleave: { mult: 3, weakMult: 2 },
  bury: { mult: 1.5, stun: 3 },
  haste: { dur: 5, aps: 0.6 },
  ward: { dur: 4, shield: 0.4 },
  phase: { dur: 4 },
  // Reap: a 2× hit, and 2.5× that on a target under `below` of its HP
  reap: { mult: 2, finishMult: 2.5, below: 0.25 },
  autoDefensiveBelow: 0.6,
};

/** how each kind of boss move is answered, for telegraphs and the "How to beat" list */
export const COUNTER_TEXT: Record<BossMoveType, string> = {
  heal: "Interrupt: Bury",
  blast: "Shield or Dodge: Ward, Phase",
  weak: "Burst: Cleave, Haste",
  summon: "Area damage: Sweeping, poison, Plague Wind",
};
