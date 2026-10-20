// Boss abilities come from parts: one from the Main Arm, one from the Soul Core.
// "counters" says which boss move each ability answers.
export type AbilityId = "cleave" | "bury" | "haste" | "ward" | "phase";
export type BossMoveType = "heal" | "blast" | "weak";

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
};

// numbers for each ability
export const ABILITY_TUNE = {
  cleave: { mult: 3, weakMult: 2 },
  bury: { mult: 1.5, stun: 3 },
  haste: { dur: 5, aps: 0.6 },
  ward: { dur: 4, shield: 0.4 },
  phase: { dur: 4 },
  autoDefensiveBelow: 0.6,
};
