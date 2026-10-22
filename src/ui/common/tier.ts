import type { Foe } from "../../engine/combat";

/**
 * How dangerous the current enemy is, for the screen: a rank tag, a colour, a sprite size and an arrival banner.
 * Normal enemies get none of it, so anything tougher stands out at a glance.
 */
export interface Tier {
  id: "normal" | "elite" | "guardian" | "boss";
  /** the tag above the enemy's name; empty for normal enemies */
  label: string;
  /** the arrival banner's small line; empty means no banner */
  arrival: string;
}

const TIERS: Record<Tier["id"], Tier> = {
  normal: { id: "normal", label: "", arrival: "" },
  elite: { id: "elite", label: "Elite", arrival: "An Elite appears" },
  guardian: { id: "guardian", label: "Guardian", arrival: "A guardian blocks the way" },
  boss: { id: "boss", label: "Boss", arrival: "The boss rises" },
};

export function foeTier(f: Foe | null): Tier {
  if (!f) return TIERS.normal;
  if (f.kind === "trash") return f.elite ? TIERS.elite : TIERS.normal;
  return TIERS[f.kind as Tier["id"]] ?? TIERS.normal;
}
