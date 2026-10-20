import type { ActDef } from "./types";

// Act 1: the cellar and village graveyard, Stages 1 to 10.
export const ACT1: ActDef = {
  n: 1,
  name: "Act I",
  setting: "The cellar and village graveyard",
  stages: [1, 10],

  bases: {
    pauperSkull: { slot: "skull", name: "Pauper's Skull", imp: [["cm", () => 15]], lean: [], flavor: "Unclaimed. Unmourned. Unremarkable." },
    houndSkull: { slot: "skull", name: "Hound Skull", imp: [["cm", () => 15], ["as", (l) => Math.round(5 + l * 0.4)]], lean: ["frenzy", "precision"], flavor: "Still hungry. You've checked." },
    pauperRib: { slot: "rib", name: "Pauper's Ribcage", imp: [["hpFlat", (l) => 15 + 4 * l]], lean: [], flavor: "Unclaimed. Unmourned. Unremarkable." },
    watchRib: { slot: "rib", name: "Watchman's Ribcage", imp: [["hpFlat", (l) => 30 + 7 * l]], lean: ["sinewed", "brutal"], flavor: "Regulation issue. The badge is still pinned on." },
    cleaverArm: { slot: "main", name: "Cleaver Arm", imp: [["flat", (l) => 15 + 3 * l]], lean: ["mutilating", "brutal"], ab: "cleave", flavor: "Came with the butcher. The butcher did not come quietly." },
    diggerArm: { slot: "main", name: "Gravedigger's Arm", imp: [["flat", (l) => 15 + 3 * l]], lean: ["brutal", "sinewed"], ab: "bury", flavor: "Still clutching the shovel. Still smells of ale." },
    pauperHand: { slot: "off", name: "Pauper's Hand", imp: [["ess", () => 5]], lean: [], flavor: "Unclaimed. Unmourned. Unremarkable." },
    gnawedHand: { slot: "off", name: "Gnawed Hand", imp: [["ess", (l) => 8 + l]], lean: ["gluttony", "ghoul"], flavor: "The rats left the useful fingers." },
    wispCore: { slot: "core", name: "Wisp Core", imp: [["as", () => 10]], lean: ["frenzy"], ab: "haste", flavor: "A will-o'-the-wisp in a jar of ribs. It wants to go somewhere. Fast." },
    lanternCore: { slot: "core", name: "Lantern Core", trophy: true, imp: [["as", () => 10], ["drop", () => 10]], lean: ["sinewed", "ghoul"], ab: "ward", flavor: "It has not gone out in forty years. It will not go out for you either." },
    wraithCore: { slot: "core", name: "Wraith Core", imp: [["as", () => 10], ["cc", () => 4]], lean: ["precision", "ruin"], ab: "phase", flavor: "Cold to the touch, and occasionally not there at all." },
  },

  foes: {
    rat: { name: "Grave Rat", hp: 0.7, dmg: 0.7, int: 1.2, drop: "gnawedHand" },
    digger: { name: "Drunk Gravedigger", hp: 1, dmg: 1, int: 1.6, drop: "diggerArm", cm: 5 },
    hound: { name: "Starving Hound", hp: 0.85, dmg: 0.6, int: 0.8, drop: "houndSkull" },
    watch: { name: "Town Watchman", hp: 1.4, dmg: 1.2, int: 2, drop: "watchRib" },
  },

  stageFoes: {
    1: { rat: 100 },
    2: { rat: 60, digger: 40 },
    3: { rat: 30, digger: 70 },
    4: { digger: 50, hound: 50 },
    5: { hound: 70, rat: 30 },
    6: { hound: 50, watch: 30, digger: 20 },
    7: { watch: 60, hound: 40 },
    8: { watch: 50, digger: 25, hound: 25 },
    9: { watch: 40, hound: 30, digger: 30 },
  },

  story: {
    1: "You raise your first corpse. It immediately falls over. You raise it again. Progress.",
    2: "The rats were here first. They are not happy about the competition.",
    3: "A gravedigger stumbles in, sees you, and decides he's had enough to drink. He is wrong.",
    4: "The village priest has started locking the cemetery gates. Adorable.",
    5: "Something has been eating the dead before you can stitch them. The hounds look thin. Not for long.",
    7: "The Town Watch has noticed the empty graves. They brought torches and a strongly worded notice.",
    9: "Beneath the chapel, a lantern burns that no one has refilled in forty years.",
    10: "The Crypt Warden waits below. He has kept the dead in their graves for longer than you've been alive.",
  },

  boss: {
    id: "warden",
    name: "The Crypt Warden",
    stage: 10,
    trophy: "lanternCore",
    script: [
      { move: "bell", at: 5, jitter: 1 },
      { move: "lantern", at: 10.5, jitter: 1 },
      { move: "gutter", at: 15.5, jitter: 0.5 },
      { move: "bell", at: 19.5, jitter: 0.5 },
      { move: "lantern", at: 23, jitter: 0.5 },
      { move: "gutter", at: 26.5, jitter: 0 },
    ],
    moves: {
      bell: { type: "heal", tele: "The Warden reaches for the crypt bell…", hit: "The bell tolls. The Warden mends {n} HP.", countered: "Bury! The bell falls silent and the Warden staggers." },
      lantern: { type: "blast", tele: "The Warden raises his lantern…", hit: "The lantern blast hits for {n}." },
      gutter: { type: "weak", tele: "The lantern gutters. The Warden is blind and takes +50% damage.", hit: "The lantern gutters. The Warden is blind." },
    },
    lootPool: ["gnawedHand", "diggerArm", "houndSkull", "watchRib", "cleaverArm", "cleaverArm"],
    lootBonus: { chance: 0.15, base: "wraithCore", copies: 6 },
    thrall: { name: "Lantern-Bound Thrall", stat: "drop", value: 15, text: "+15% part drop chance" },
    intro: "You descend beneath the chapel. The Warden raises his head.",
    idle: "The Warden watches you. Wait for his next move.",
    stagger: "The Warden reels from the interrupted bell (+50% damage taken).",
    firstClear: [
      "Trophy: the Warden's Lantern Core is yours. Stitch it in to gain Ward, a shield that blocks his lantern blast.",
      "Chapter I closes. The dead of the village answer to a new keeper now. Up the hill, a cathedral bell begins to ring.",
    ],
    defeat: "The Warden's lantern swings once more and your Abomination falls.",
    enraged: "The Warden's lantern flares white. Your Abomination is unmade.",
  },
};

export const DEATH_LINES = [
  "Your Abomination comes apart at the seams. You pick up the pieces. Most of them.",
  "Down it goes. You stitch it back together a little further from the trouble.",
  "Something important fell off. You find it, eventually.",
];
