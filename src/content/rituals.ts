export type RitualId = "raise" | "hunger" | "moon";

export interface RitualDef {
  id: RitualId;
  name: string;
  short: string;
  /** cooldown, seconds */
  cd: number;
  /** how long it lasts, seconds */
  dur?: number;
}

export const RITUALS: RitualDef[] = [
  { id: "raise", name: "Raise the Fallen", short: "2× drops, 10 min", cd: 1200, dur: 600 },
  { id: "hunger", name: "Grave Hunger", short: "Corpse Mass burst", cd: 300 },
  { id: "moon", name: "Blood Moon", short: "+50% damage, 20s", cd: 180, dur: 20 },
];

export const RITUAL_TUNE = {
  hungerSecs: 120, hungerMin: 50,
  moonPower: 0.5,
};
