import type { ActDef } from "./types";

// Act 3: the plague town, Stages 21 to 30. Poison, crowds, and a rival who raises the dead badly.
export const ACT3: ActDef = {
  n: 3,
  name: "Act III",
  setting: "The plague town",
  stages: [21, 30],

  bases: {
    beakSkull: { slot: "skull", name: "Beaked Skull", imp: [["cm", () => 15], ["poison", (l) => Math.round(3 + 0.8 * l)]], lean: ["pestilent", "precision"], flavor: "The beak was stuffed with herbs against the plague. The herbs lost." },
    rioterArm: { slot: "off", name: "Rioter's Arm", imp: [["as", (l) => Math.round(6 + 0.3 * l)]], lean: ["sweeping", "frenzy"], flavor: "Still shaking a fist at somebody. You've stopped asking who." },
    ratCore: { slot: "core", name: "Rat King Core", imp: [["as", () => 10], ["drop", (l) => Math.round(5 + l / 5)]], lean: ["ghoul", "gluttony"], ab: "haste", flavor: "A knot of rat hearts, all beating in different directions. It finds things." },
    boneScythe: { slot: "main", name: "Bone Scythe", imp: [["flat", (l) => Math.round(20 + 3.6 * l)]], lean: ["mutilating", "brutal"], ab: "reap", flavor: "The Corpse Collector's tool of the trade. The trade is going very well." },
    rivalCore: { slot: "core", name: "Rival's Core", trophy: true, mirror: true, imp: [["cc", () => 6], ["ess", () => 10]], lean: ["precision", "gluttony"], ab: "bury", flavor: "He spent his life copying your work. Now it copies your friends'." },

    // named uniques: no random affixes, one effect nothing else gives, and they stay at the item level they dropped at
    plagueMask: { slot: "skull", name: "The Plague Mask", unique: { effect: "plague", text: "Poison deals ×1.5 damage" }, imp: [["cm", () => 25], ["poison", (l) => Math.round(6 + 1.4 * l)]], lean: [], flavor: "Saint Ague wore it through the first outbreak. It's the only part of him that's still contagious." },
    lastTorch: { slot: "off", name: "The Last Torch", unique: { effect: "leech", text: "The Vanguard heals for 1.5% of all damage the squad deals, even in boss fights" }, imp: [["as", (l) => Math.round(8 + 0.4 * l)], ["hpPct", () => 8]], lean: [], flavor: "The mob burned the doctors' quarter with it. It never went out. It just got hungry." },
    hangmanScythe: { slot: "main", name: "The Hangman's Scythe", unique: { effect: "execute", text: "Reap finishes off anything under 40% HP instead of 25%" }, imp: [["flat", (l) => Math.round(24 + 4 * l)], ["cc", () => 5]], lean: [], ab: "reap", flavor: "The town hanged its last executioner with his own rope. He kept the scythe for after." },
  },

  foes: {
    // a step above the catacombs again
    rats: { name: "Rat Swarm", hp: 1.2, dmg: 1.2, int: 0.7, drop: "ratCore" },
    doctor: { name: "Plague Doctor", hp: 1.5, dmg: 1.3, int: 1.6, drop: "beakSkull" },
    mob: { name: "Fevered Mob", hp: 1.8, dmg: 1.5, int: 1.2, drop: "rioterArm" },
    collector: { name: "Corpse Collector", hp: 2.6, dmg: 2, int: 2.2, drop: "boneScythe", cm: 3 },
  },

  stageFoes: {
    21: { rats: 60, doctor: 40 },
    22: { doctor: 50, rats: 30, mob: 20 },
    23: { mob: 60, doctor: 40 },
    24: { mob: 40, rats: 30, doctor: 30 },
    25: { collector: 40, mob: 40, rats: 20 },
    26: { collector: 50, doctor: 50 },
    27: { collector: 40, mob: 30, rats: 30 },
    28: { collector: 60, doctor: 40 },
    29: { collector: 40, mob: 30, doctor: 30 },
  },

  elitePrefixes: ["Festering", "Bloated", "Feverish", "Ravenous", "Weeping"],

  story: {
    21: "Chapter III. The plague bells led you into town. Someone here is raising the dead, and doing it badly: they wander the streets in the wrong shoes.",
    22: "The plague doctors go door to door with their beaks and their candles. They are not curing anyone. They are taking notes.",
    23: "A fevered mob fills the market square. They want someone to blame. You are standing right there.",
    25: "Corpse Collectors drag carts through the streets, calling for the dead. You've been told to bring out yours. You have several.",
    27: "Every corpse in town has the same stitches as yours. Sloppier, but the same. Somebody has been reading your notes.",
    29: "The town hall bell rings thirteen. Your old apprentice is waiting on the steps, wearing your coat.",
    30: "The Arch-Necromancer spreads his arms. \"I learned from the best,\" he says, \"and then I got better.\" He did not.",
  },

  // the last kill of Stages 22 to 24, the first time: each one previews an Arch-Necromancer move
  guardians: {
    22: {
      name: "The Rat Mother", foe: "rats", hp: 6.5, dmg: 1.4, int: 0.9, drop: "ratCore",
      move: { type: "summon", short: "Calls her brood (adds shield her)", tele: "The Rat Mother shrieks. The gutters start to move…", hit: "Her brood swarms out. She takes 75% less damage until they die.", first: 4, every: 14, adds: { n: 3, name: "Brood Rat", hp: 0.6, dmg: 0.3 } },
      intro: "The swarm parts for something the size of a pig, with far more teeth.",
      defeat: "The Rat Mother's brood carries your Abomination down the drain.",
      idle: "The Rat Mother sniffs the air. Kill her brood fast when she calls them.",
    },
    23: {
      name: "The Ringleader", foe: "mob", hp: 8, dmg: 1.7, int: 1.2, drop: "rioterArm",
      move: { type: "heal", short: "Rallies the crowd (heals 15%)", tele: "The Ringleader climbs a barrel and starts a speech…", hit: "The crowd cheers. The Ringleader mends {n} HP. Bury would have shut him up.", countered: "Bury! The speech ends in a mouthful of dirt.", first: 5, every: 8 },
      intro: "A man with a torch and a very loud voice climbs onto the fountain.",
      defeat: "The Ringleader gets the whole square to stamp on your Abomination. Democracy.",
      idle: "The Ringleader is clearing his throat. Interrupt the speech.",
    },
    24: {
      name: "The Head Physician", foe: "doctor", hp: 8, dmg: 1.8, int: 1.6, drop: "beakSkull",
      move: { type: "blast", short: "Throws a flask of miasma (big hit)", tele: "The Head Physician uncorks a flask of green smoke…", hit: "The miasma burns for {n}. Ward or Phase would have saved that.", first: 6, every: 9 },
      intro: "A plague doctor in a gilded beak bows, and asks where it hurts. Everywhere, soon.",
      defeat: "The Head Physician declares your Abomination dead. He is, for once, correct.",
      idle: "The Head Physician measures you up. Block or dodge the flask.",
    },
  },

  boss: {
    id: "rival",
    name: "The Arch-Necromancer",
    stage: 30,
    // a rival necromancer with a bodyguard: more HP than the Colossus, and he hides behind his summons
    hpMult: 45,
    trophy: "rivalCore",
    script: [
      { move: "raise", at: 2, jitter: 0.5 },
      { move: "bolt", at: 9, jitter: 1 },
      { move: "drain", at: 13, jitter: 0.5 },
      { move: "raise", at: 17, jitter: 0.5 },
      { move: "slip", at: 22, jitter: 0.5 },
      { move: "bolt", at: 25.5, jitter: 0.5 },
    ],
    moves: {
      raise: { type: "summon", short: "Raises a bodyguard (adds shield him)", tele: "The Arch-Necromancer sketches a circle in the dirt…", hit: "Three plague corpses claw out of the ground. He takes 75% less damage until they die.", adds: { n: 3, name: "Plague Corpse", hp: 1.5, dmg: 0.25 } },
      bolt: { type: "blast", short: "Hurls a grave bolt (big hit)", tele: "Green fire gathers in his hands…", hit: "The grave bolt hits for {n}." },
      drain: { type: "heal", short: "Drains a corpse (heals 15%)", tele: "He reaches into a corpse and starts to drink…", hit: "He drains {n} HP out of the dead.", countered: "Bury! The corpse stays buried and he chokes on dirt." },
      slip: { type: "weak", short: "Fumbles a spell (takes +50%)", tele: "His spell fizzles. He was never as good as you. He takes +50% damage.", hit: "The spell fizzles. Strike now." },
    },
    lootPool: ["beakSkull", "rioterArm", "ratCore", "boneScythe", "boneScythe", "knightArm"],
    thrall: { name: "Your Former Rival", stat: "ess", value: 15, text: "+15% Soul Essence" },
    them: "him",
    lesson: {
      intro: "Kill him within 30 seconds. Your old apprentice fights dirty: he hides behind summoned corpses. Each move has a right answer:",
      moves: [
        "**He sketches a circle:** three plague corpses rise. While any of them stand, he takes **75% less damage**, and your squad's hits go to the corpses first. Kill them fast: **Sweeping** (an Off Arm affix) splashes every hit onto the others, poison hits all of them at once, and **Plague Wind** triples poison.",
        "**He gathers green fire:** a big hit. Block with **Ward** or dodge with **Phase**.",
        "**He drains a corpse:** interrupt with **Bury**, or he heals 15%.",
        "**His spell fizzles:** he takes +50% damage. Fire **Cleave**, **Haste** and **Reap** now.",
      ],
      outro: "Reap (Bone Scythe, from Corpse Collectors) hits much harder once he's under 25% HP. Save a Plague Wind for this fight.",
    },
    intro: "The Arch-Necromancer steps down from the town hall. Behind him, the graves of the town start to open.",
    idle: "The Arch-Necromancer circles, muttering. Wait for his next move.",
    stagger: "The Arch-Necromancer staggers, spitting dirt (+50% damage taken).",
    firstClear: [
      "Trophy: the Rival's Core is yours. It copies the best affix your other Abominations are wearing, and it brings Bury.",
      "Chapter III closes. The town is quiet, and very well stitched. Your former rival kneels in the square. Beyond the hills, the capital's walls catch the morning light.",
    ],
    defeat: "The Arch-Necromancer takes your Abomination apart and writes down how he did it.",
    enraged: "The Arch-Necromancer stops showing off and buries your squad under the whole town cemetery.",
  },
};
