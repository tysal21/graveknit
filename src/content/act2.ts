import type { ActDef } from "./types";

// Act 2: the cathedral catacombs, Stages 11 to 20.
export const ACT2: ActDef = {
  n: 2,
  name: "Act II",
  setting: "The cathedral catacombs",
  stages: [11, 20],

  bases: {
    acolyteRib: { slot: "rib", name: "Acolyte Ribcage", imp: [["hpFlat", (l) => 20 + 5 * l], ["ess", (l) => Math.round(4 + l / 2)]], lean: ["gluttony", "sinewed"], flavor: "Took a vow of poverty. Kept it, too." },
    miteSkull: { slot: "skull", name: "Mite-Riddled Skull", imp: [["cm", () => 15], ["poison", (l) => Math.round(2 + 0.6 * l)]], lean: ["pestilent", "ruin"], flavor: "Something is still living in it. You've decided that's a feature." },
    knightArm: { slot: "main", name: "Knight's Arm", imp: [["flat", (l) => Math.round(18 + 3.4 * l)]], lean: ["brutal", "mutilating"], ab: "cleave", flavor: "Sworn to defend the cathedral. Technically, it still is." },
    colossusRib: { slot: "rib", name: "Colossus Ribcage", trophy: true, imp: [["hpFlat", (l) => 60 + 12 * l], ["hpPct", () => 10]], lean: ["sinewed", "brutal"], flavor: "Built from four hundred ribcages. You can hear some of them arguing." },
  },

  foes: {
    // the catacombs hit harder than the graveyard did: these multipliers start above Act 1's
    rat: { name: "Catacomb Rat", hp: 1.1, dmg: 1.1, int: 1.2, drop: "gnawedHand" },
    acolyte: { name: "Tomb Acolyte", hp: 1.6, dmg: 1.4, int: 1.6, drop: "acolyteRib" },
    mite: { name: "Bone Mites", hp: 1, dmg: 0.8, int: 0.6, drop: "miteSkull" },
    knight: { name: "Crypt Knight", hp: 2.4, dmg: 1.9, int: 2.2, drop: "knightArm", cm: 3 },
  },

  stageFoes: {
    11: { acolyte: 60, rat: 40 },
    12: { acolyte: 50, mite: 30, rat: 20 },
    13: { mite: 60, acolyte: 40 },
    14: { mite: 40, acolyte: 30, rat: 30 },
    15: { knight: 40, acolyte: 40, mite: 20 },
    16: { knight: 50, mite: 50 },
    17: { knight: 40, acolyte: 30, rat: 30 },
    18: { knight: 60, mite: 40 },
    19: { knight: 40, acolyte: 30, mite: 30 },
  },

  story: {
    11: "Chapter II. The cathedral bell led you up the hill and down again. Under the nave, the dead are stacked to the ceiling, and somebody is still praying over them.",
    12: "The acolytes chant to keep the dead asleep. You find this rude.",
    13: "The walls move. On closer inspection, the walls are mites. On even closer inspection, so is the floor.",
    15: "Crypt Knights stand guard in full plate. They swore an oath to the dead and intend to keep it, at length.",
    17: "Every skull in the ossuary is turned the same way. Toward the deep end. Toward something large.",
    19: "Something below is breathing. It has four hundred ribcages and no reason to stop.",
    20: "The Ossuary Colossus rises. The acolytes didn't build it to keep the dead asleep. They built it to keep you out.",
  },

  // the last kill of Stages 12 to 14, the first time: each one previews a Colossus move
  guardians: {
    12: {
      name: "The Choirmaster", foe: "acolyte", hp: 9.5, dmg: 2, int: 1.6, drop: "acolyteRib",
      move: { type: "heal", short: "Leads a hymn (heals 15%)", tele: "The Choirmaster raises his hands and the acolytes draw breath…", hit: "The hymn mends {n} HP. Interrupt it with Bury.", countered: "Bury! The hymn ends in a cough.", first: 5, every: 8 },
      intro: "The chanting stops. The Choirmaster steps out of the dark, tuning fork in hand.",
      defeat: "The Choirmaster sings your Abomination back to sleep. Permanently.",
      idle: "The Choirmaster hums. Interrupt the hymn when it comes.",
    },
    13: {
      name: "The Mite Queen", foe: "mite", hp: 7.25, dmg: 1.1, int: 0.6, drop: "miteSkull",
      move: { type: "weak", short: "Lays eggs (takes +50%)", tele: "The Mite Queen settles down to lay. She takes +50% damage.", hit: "The Queen is busy laying. Cleave and Haste now.", first: 5, every: 9 },
      intro: "The walls stop crawling. They all crawl the same way now, toward something the size of a cart.",
      defeat: "The mites strip your Abomination to the stitches. Then the stitches.",
      idle: "The Queen skitters. Strike hard when she settles.",
    },
    14: {
      name: "The Knight-Captain", foe: "knight", hp: 8, dmg: 1.8, int: 2.2, drop: "knightArm",
      move: { type: "blast", short: "Heavy overhead swing (big hit)", tele: "The Knight-Captain lifts his greatsword overhead…", hit: "The greatsword comes down for {n}. Ward or Phase would have saved that.", first: 6, every: 9 },
      intro: "A Crypt Knight in a captain's plume salutes the dead, then you. Only one of those was respectful.",
      defeat: "The Knight-Captain cleaves your Abomination neatly in two and salutes the halves.",
      idle: "The Knight-Captain waits in guard. Block or dodge the overhead swing.",
    },
  },

  boss: {
    id: "colossus",
    name: "The Ossuary Colossus",
    stage: 20,
    // a heap of four hundred ribcages takes more killing than the Warden did
    hpMult: 40,
    trophy: "colossusRib",
    script: [
      { move: "gather", at: 4, jitter: 1 },
      { move: "slam", at: 8.5, jitter: 1 },
      { move: "crack", at: 12.5, jitter: 0.5 },
      { move: "gather", at: 16.5, jitter: 0.5 },
      { move: "slam", at: 20, jitter: 0.5 },
      { move: "slam", at: 24, jitter: 0.5 },
      { move: "crack", at: 27, jitter: 0 },
    ],
    moves: {
      gather: { type: "heal", short: "Gathers loose bones (heals 15%)", tele: "The Colossus scoops up the bones around it…", hit: "Bones snap into place. The Colossus mends {n} HP.", countered: "Bury! The bones scatter and the Colossus stumbles." },
      slam: { type: "blast", short: "Raises both fists (big slam)", tele: "The Colossus raises both fists…", hit: "The slam lands for {n}." },
      crack: { type: "weak", short: "Its ribs crack open (takes +50%)", tele: "Its ribcage cracks open. The Colossus takes +50% damage.", hit: "The ribs crack open. Strike now." },
    },
    lootPool: ["acolyteRib", "miteSkull", "knightArm", "knightArm", "gnawedHand", "wispCore"],
    thrall: { name: "The Heap", stat: "hpPct", value: 10, text: "+10% squad max HP" },
    them: "it",
    lesson: {
      intro: "Kill it within 30 seconds. The Colossus is slow, but it slams twice near the end of the fight. Each move has a right answer:",
      moves: [
        "**It gathers loose bones:** interrupt with **Bury**, or it heals 15%.",
        "**It raises both fists:** block with **Ward** (Lantern Core) or dodge with **Phase** (Wraith Core). It does this three times, twice in a row at the end.",
        "**Its ribs crack open:** it takes +50% damage. Fire **Cleave** and **Haste** now.",
      ],
      outro: "Your second Abomination fights behind the Vanguard and brings two more abilities. Between the two of you, cover the slam and the heal.",
    },
    intro: "The floor of the ossuary heaves. Four hundred ribcages stand up at once.",
    idle: "The Colossus shifts its weight. Wait for its next move.",
    stagger: "The Colossus stumbles over its own bones (+50% damage taken).",
    firstClear: [
      "Trophy: the Colossus Ribcage is yours. It holds a frankly unreasonable amount of HP.",
      "Chapter II closes. The catacombs fall quiet. Above you, the plague bells start ringing in the town, and someone else is raising the dead there. Badly.",
    ],
    defeat: "The Colossus brings both fists down and your Vanguard comes apart.",
    enraged: "The Colossus stops pretending to be slow. Your squad is buried under four hundred ribs.",
  },
};
