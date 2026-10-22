// The stats a part or affix can add to.
export type StatId =
  | "flat"     // flat hit damage
  | "dmgPct"   // % damage
  | "cc"       // crit chance %
  | "cm"       // crit multiplier %
  | "as"       // attack speed %
  | "poison"   // poison per second
  | "hpFlat"   // max HP
  | "hpPct"    // % max HP
  | "ess"      // % Soul Essence
  | "drop"     // % part drop chance
  | "splash";  // % of each hit that also lands on every other enemy (area damage)

// How a built-in (implicit) stat reads on a part
export const IMPLICIT_TEXT: Record<StatId, (v: number) => string> = {
  flat: (v) => `${v} base hit damage`,
  dmgPct: (v) => `+${v}% damage`,
  cc: (v) => `+${v}% crit chance`,
  cm: (v) => `+${v}% crit multiplier`,
  as: (v) => `+${v}% attack speed`,
  poison: (v) => `+${v} poison per second`,
  hpFlat: (v) => `+${v} max HP`,
  hpPct: (v) => `+${v}% max HP`,
  ess: (v) => `+${v}% Soul Essence`,
  drop: (v) => `+${v}% part drop chance`,
  splash: (v) => `${v}% of each hit splashes onto other enemies`,
};
