import type { StatId } from "./stats";

export interface GeneratorDef {
  id: string;
  name: string;
  cost: number;
  /** Corpse Mass per second, each */
  rate: number;
  /** combat bonus, each */
  bonus?: { stat: StatId; value: number };
  bonusText: string;
  /** opens once this stage is reached */
  unlock: number;
  /** not built yet: shown greyed out with this note */
  later?: string;
}

export const GENERATORS: GeneratorDef[] = [
  { id: "scav", name: "Shovel Scavengers", cost: 10, rate: 0.4, bonus: { stat: "hpFlat", value: 3 }, bonusText: "+3 max HP each", unlock: 1 },
  { id: "harv", name: "Bone Harvesters", cost: 150, rate: 3, bonus: { stat: "flat", value: 0.5 }, bonusText: "+0.5 hit damage each", unlock: 3 },
  { id: "cart", name: "Plague Carts", cost: 2000, rate: 25, bonus: { stat: "poison", value: 0.6 }, bonusText: "+0.6 poison per second each", unlock: 6 },
  { id: "dig", name: "Catacomb Diggers", cost: 30000, rate: 240, bonus: { stat: "as", value: 0.5 }, bonusText: "+0.5% attack speed each", unlock: 11 },
  { id: "grind", name: "Ossuary Grinders", cost: 0, rate: 0, bonusText: "+crit multiplier", unlock: 999, later: "Act 3 and later" },
  { id: "obel", name: "Soul Siphon Obelisks", cost: 0, rate: 0, bonusText: "+Soul Essence gain", unlock: 999, later: "Act 4 and later" },
];
