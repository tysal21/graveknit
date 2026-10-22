import type { SlotId } from "./slots";
import type { StatId } from "./stats";

export interface AffixDef {
  kind: "pre" | "suf";
  name: string;
  stat: StatId;
  /** grows with item level: value × (0.5 + ilvl / 20) */
  scale?: boolean;
  /** show one decimal place */
  dec?: boolean;
  fmt: (v: number) => string;
  /** value range per tier, Tier 1 first */
  r: [number, number][];
  /** only rolls on this slot */
  slot?: SlotId;
  /** only rolls on parts of at least this item level */
  minIlvl?: number;
}

export const AFFIX: Record<string, AffixDef> = {
  mutilating: { kind: "pre", name: "Mutilating", stat: "dmgPct", fmt: (v) => `+${v}% damage`, r: [[75, 100], [45, 67], [25, 41], [13, 23], [5, 10]] },
  brutal: { kind: "pre", name: "Brutal", stat: "flat", scale: true, fmt: (v) => `+${v} hit damage`, r: [[23, 32], [15, 22], [9, 14], [5, 8], [2, 4]] },
  pestilent: { kind: "pre", name: "Pestilent", stat: "poison", scale: true, fmt: (v) => `+${v} poison per second`, r: [[21, 30], [13, 20], [8, 12], [4, 7], [1, 3]] },
  sinewed: { kind: "pre", name: "Sinewed", stat: "hpFlat", scale: true, fmt: (v) => `+${v} max HP`, r: [[71, 100], [46, 70], [29, 45], [16, 28], [8, 15]] },
  precision: { kind: "suf", name: "of Precision", stat: "cc", dec: true, fmt: (v) => `+${v}% crit chance`, r: [[9, 12], [6, 9], [4, 6], [2.5, 4], [1, 2.5]] },
  frenzy: { kind: "suf", name: "of Frenzy", stat: "as", fmt: (v) => `+${v}% attack speed`, r: [[23, 30], [16, 22], [10, 15], [6, 9], [3, 5]] },
  ruin: { kind: "suf", name: "of Ruin", stat: "cm", fmt: (v) => `+${v}% crit multiplier`, r: [[41, 55], [29, 40], [19, 28], [11, 18], [5, 10]] },
  gluttony: { kind: "suf", name: "of Gluttony", stat: "ess", fmt: (v) => `+${v}% Soul Essence`, r: [[27, 36], [19, 26], [12, 18], [7, 11], [3, 6]] },
  // area damage for fights with adds (Act 3's summons, the Colossus's mites): Off Arms only, from Act 2's item levels
  sweeping: { kind: "pre", name: "Sweeping", stat: "splash", slot: "off", minIlvl: 11, fmt: (v) => `${v}% of each hit splashes`, r: [[36, 45], [26, 34], [17, 24], [10, 15], [4, 8]] },
  ghoul: { kind: "suf", name: "of the Ghoul", stat: "drop", fmt: (v) => `+${v}% part drop chance`, r: [[20, 28], [14, 19], [9, 13], [5, 8], [2, 4]] },
};

/** "of Frenzy" → "Frenzy", for log lines like "a Tier 2 Frenzy roll" */
export const affixShortName = (k: string) => AFFIX[k].name.replace("of the ", "").replace("of ", "");
