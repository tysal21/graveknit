// The guided start. The game stays paused until step 3 and teaches one panel at a time.
// `target` is the element that glows. `wait` is what the player must do; `next` is a button instead.
export type PanelId = "squad" | "crypt" | "stitch" | "yard";
export type TutWait = "ability" | "kills" | "select" | "equip" | "marrow" | "buy" | "ritual";

export interface TutStep {
  id: string;
  panel?: PanelId;
  title?: string;
  text?: string;
  target?: string;
  wait?: TutWait;
  next?: string;
}

export const TUTORIAL: TutStep[] = [
  { id: "intro" },
  { id: "squad", panel: "squad", title: "This is your Abomination", text: "It is stitched from five body parts: a skull, a ribcage, two arms and a soul core. Every part adds stats. Right now they are all scraps from paupers' graves.", target: "#slots", next: "Next" },
  { id: "fight", panel: "crypt", title: "Into the cellar", text: "The Crypt is where your Abomination fights. It attacks on its own. Your first stop is Stage 1, where the grave rats live.", target: "#coachBtn", next: "Start fighting" },
  { id: "ability", panel: "crypt", title: "Use an ability", text: "Abilities come from parts. Your Cleaver Arm gives Cleave, one big hit. Press it now, or press 1 on your keyboard.", target: "#ab-cleave", wait: "ability" },
  { id: "kill", panel: "crypt", title: "Kills pay out", text: "Every kill gives Soul Essence and Corpse Mass (shown at the top), and sometimes reagents for crafting. Kill 3 rats.", target: "#res", wait: "kills" },
  { id: "loot", panel: "stitch", title: "Your first body part", text: "A rat dropped a hand. The Stitchery holds every part you find. Click the new part to look at it.", target: "#tutItem", wait: "select" },
  { id: "equip", panel: "stitch", title: "Compare, then stitch it on", text: "Green numbers mean it beats what you're wearing. Blue names are Magic parts with 2 random stats; yellow ones are Rare with 4. Stitch it on.", target: "[data-act='equip']", wait: "equip" },
  { id: "reroll", panel: "stitch", title: "Reroll the stats", text: "The random stats are called affixes. Each has a tier: T1 is the best, T5 the worst. A Marrow Shard rerolls them all. Try one and watch what changes.", target: "[data-act='marrow']", wait: "marrow" },
  { id: "craft", panel: "stitch", title: "More ways to craft", text: "Grave Dust keeps the tiers but rerolls the numbers. A Spectral Thread locks one affix so rerolls skip it. Bad Marrow rolls fill the Residue bar, and a full bar guarantees a better roll next time.", target: ".afx", next: "Got it" },
  { id: "gen", panel: "yard", title: "The Graveyard", text: "Corpse Mass buys generators. They make more Corpse Mass on their own and give small combat bonuses. Buy a Shovel Scavenger.", target: "#buy-scav", wait: "buy" },
  { id: "ritual", panel: "yard", title: "Rituals", text: "Rituals are spells on long cooldowns. Grave Hunger gives you a burst of Corpse Mass. Cast it.", target: "#rit-hunger", wait: "ritual" },
  { id: "push", panel: "crypt", title: "You're ready", text: "From now on your Abomination pushes to the next stage after every 10 kills, and uses its abilities for you. If it dies, it drops back one stage. Better parts and Infusion carry you deeper. The Crypt Warden waits at Stage 10.", target: "#optPush", next: "Let it loose" },
  { id: "done" },
];

/** the last real step number shown as "step X of N" */
export const TUT_STEPS = TUTORIAL.length - 2;
export const TUT_DONE = TUTORIAL.length - 1;
/** the step at which the game starts running */
export const TUT_RUNNING_FROM = 3;
export const TUT_KILLS = 3;

/** a panel opens once the tutorial reaches this step */
export const PANEL_OPENS_AT: Record<PanelId, number> = { squad: 1, crypt: 2, stitch: 5, yard: 9 };

export const PANEL_LOCKED_TEXT: Record<PanelId, string> = {
  squad: "Your Abomination will stand here.",
  crypt: "The cellar is quiet for now. You'll go down here soon.",
  stitch: "Opens when your first body part drops.",
  yard: "Opens once you've stitched your first part.",
};

// One-time tips after the tutorial
export type HintId = "infuse" | "gens" | "boss" | "boss2" | "guardMeet" | "guard" | "dig" | "squad2" | "restitch" | "act3" | "grind" | "adds" | "elite" | "unique" | "boss3";
export const HINTS: Record<HintId, TutStep> = {
  infuse: { id: "infuse", panel: "squad", title: "You can Infuse", text: "Soul Essence buys Infusion levels. Each level gives +12% damage and HP. Your parts limit how many levels you can hold, so better parts raise the cap.", target: "#infBtn" },
  gens: { id: "gens", panel: "yard", title: "New generator", text: "Bone Harvesters are open. They cost more but add hit damage as well as Corpse Mass.", target: "#buy-harv" },
  boss: { id: "boss", panel: "crypt", title: "The Crypt Warden is ready", text: "Stage 10 is a boss fight. Click Challenge when you're ready. You'll get a short lesson first.", target: "#bossBtn" },
  boss2: { id: "boss2", panel: "crypt", title: "The Ossuary Colossus is ready", text: "Stage 20 is Act II's boss. It slams three times, so bring Ward or Phase, and use both Abominations' abilities. You'll get a short lesson first.", target: "#bossBtn" },
  guardMeet: { id: "guardMeet", panel: "crypt", title: "A stage guardian", text: "The first time you clear some stages, the last enemy is a guardian: a tougher named enemy with one boss move. Beat it to move on. It always drops a Magic part.", target: "#fight" },
  guard: { id: "guard", panel: "squad", title: "Get stronger, then try again", text: "Guardians are built to need an upgrade. Infuse a level or two, or stitch on a better part, and your Abomination will push back up and fight it again.", target: "#infBtn" },
  dig: { id: "dig", panel: "yard", title: "New generator", text: "Catacomb Diggers are open. Each one adds attack speed for the whole squad as well as Corpse Mass.", target: "#buy-dig" },
  restitch: { id: "restitch", panel: "stitch", title: "Re-stitch old parts", text: "A part you like doesn't have to be left behind. Open it on the Workbench and Re-stitch it: Grave Dust and Soul Essence lift it to your best stage's item level, keeping every roll. Spare Dust can also be pressed into Marrow Shards there.", target: "#stash" },
  act3: { id: "act3", panel: "yard", title: "Plague Wind", text: "Act III opens a fourth Ritual. Plague Wind triples every squad member's poison for 15 seconds. It's best against bosses and their summons, so auto mode only casts it in boss fights.", target: "#rit-wind" },
  grind: { id: "grind", panel: "yard", title: "New generator", text: "Ossuary Grinders are open. Each one adds +1% crit multiplier for the whole squad as well as a lot of Corpse Mass.", target: "#buy-grind" },
  adds: { id: "adds", panel: "crypt", title: "Summons shield their master", text: "Some enemies call in adds. While any add lives, its master takes 75% less damage and your hits go to the adds first. Poison hits every add at once, and the Sweeping affix (Off Arms only) splashes each hit onto the others.", target: "#fight" },
  elite: { id: "elite", panel: "crypt", title: "An Elite", text: "From Act III on, about 1 enemy in 150 near your best stage is an Elite: tougher, with a name and a glow. It pays 5× Essence and Corpse Mass, and always drops a signature part: Magic or Rare, with built-in stats ×1.5. Sometimes it drops a Spectral Thread or a named unique too.", target: "#fight" },
  unique: { id: "unique", panel: "stitch", title: "A named unique", text: "Uniques have no random affixes. Instead each one has a special effect nothing else gives. They can't be rerolled or Re-stitched, so they stay at the item level they dropped at; later bosses drop higher-level copies.", target: "#stash" },
  boss3: { id: "boss3", panel: "crypt", title: "The Arch-Necromancer is ready", text: "Stage 30 is Act III's boss. He hides behind summoned corpses, so bring area damage (Sweeping, poison, Plague Wind) as well as Ward or Phase and Bury. You'll get a short lesson first.", target: "#bossBtn" },
  squad2: { id: "squad2", panel: "squad", title: "A second Abomination", text: "Squad slot 2 is open. Your second Abomination starts with no parts: pick it at the top of the Squad panel, then stitch parts onto it from the Stitchery. It fights behind the Vanguard, adds its damage and brings two more abilities.", target: "#squadTabs" },
};

export const INTRO_TEXT = "You were a grave-robber. The village caught you, and now you have nothing left but a cellar, a needle and the dead.";
