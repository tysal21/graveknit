import type { Game } from "../engine/game";
import type { Foe } from "../engine/combat";
import type { Abomination } from "../engine/state";

// Pixel art made with PixelLab lives in public/sprites. Anything without a
// picture yet (Act 3 on) just shows its text, so the game never breaks
// when a file is missing.
const HAVE = new Set([
  "foe-rat", "foe-digger", "foe-hound", "foe-watch",
  "guard-ratKing", "guard-foreman", "guard-alpha", "boss-warden", "thrall-lantern",
  "foe-acolyte", "foe-mite", "foe-cultist",
  "guard-choirmaster", "guard-miteQueen", "guard-knightCaptain", "boss-colossus", "thrall-heap",
  "abom-body", "abom-hand", "abom-arm-cleaver", "abom-core-wisp", "abom-core-lantern", "abom-core-wraith",
  "altar",
  "bg-cellar", "bg-graveyard", "bg-crypt", "bg-catacombs", "bg-ossuary", "bg-deep",
  "icon-cm", "icon-ess", "icon-marrow", "icon-dust", "icon-thread",
  "ab-cleave", "ab-haste", "ab-bury", "ab-ward", "ab-phase",
  "gen-scav", "gen-harv", "gen-cart", "gen-dig",
  "rit-raise", "rit-hunger", "rit-moon",
  ...["pauperSkull", "pauperRib", "cleaverArm", "pauperHand", "wispCore", "gnawedHand", "diggerArm", "houndSkull", "watchRib", "lanternCore", "wraithCore",
    "acolyteRib", "miteSkull", "knightArm", "colossusRib"].map((b) => "part-" + b),
]);

/** the file for a picture, or null if it hasn't been drawn yet. Relative, so it works on GitHub Pages.
 *  The ?v= stamp changes with every build, so a redrawn picture never shows up as the old one. */
export const artUrl = (name: string) => (HAVE.has(name) ? `sprites/${name}.png?v=${__BUILD__}` : null);

/** a small pixel-art icon; renders nothing if the art doesn't exist */
export function Icon({ name, size = 32, className = "" }: { name: string; size?: number; className?: string }) {
  const src = artUrl(name);
  if (!src) return null;
  return <img className={`px-icon ${className}`} src={src} width={size} height={size} alt="" aria-hidden="true" />;
}

// each boss's Thrall: boss id -> thrall-<name>.png
export const THRALL_ART: Record<string, string> = { warden: "lantern", colossus: "heap" };

// guardians are keyed by the stage they guard
const GUARDIAN_ART: Record<number, string> = {
  2: "guard-ratKing", 3: "guard-foreman", 4: "guard-alpha",
  12: "guard-choirmaster", 13: "guard-miteQueen", 14: "guard-knightCaptain",
};

// small beasts are drawn filling their canvas, so shrink them to sit right beside people
const FOE_SCALE: Record<string, number> = { "foe-rat": 0.6, "foe-hound": 0.8, "guard-ratKing": 0.8, "guard-alpha": 0.95, "foe-mite": 0.7 };
const spriteName = (src: string | null) => src?.replace(/^sprites\/|\.png.*$/g, "") ?? "";
export const foeScale = (src: string | null) => FOE_SCALE[spriteName(src)] ?? 1;

// idle loops (PixelLab, 64x64 frames side by side in idle-<name>.png).
// Each plays forward then back, so it never jumps; frames that drifted off-model were left out.
const IDLE_FRAMES: Record<string, number> = {
  "foe-rat": 8, "foe-hound": 8, "foe-digger": 4, "foe-watch": 6,
  "guard-ratKing": 8, "guard-alpha": 8, "guard-foreman": 8, "boss-warden": 8,
  "foe-acolyte": 8, "foe-mite": 8, "foe-cultist": 8,
  "guard-choirmaster": 8, "guard-miteQueen": 8, "guard-knightCaptain": 8, "boss-colossus": 8,
};

// attack clips (PixelLab, 9 frames, played once each time it hits you). Only guardians and bosses get one (Tyler's pick).
const ATTACK_FRAMES: Record<string, number> = { "guard-ratKing": 9, "guard-alpha": 9, "guard-foreman": 9, "boss-warden": 9,
  "guard-choirmaster": 9, "guard-miteQueen": 9, "guard-knightCaptain": 9, "boss-colossus": 9,
};

/** the attack clip for an enemy picture, or null if it just keeps idling */
export function foeAttack(src: string | null): { src: string; frames: number } | null {
  const name = spriteName(src);
  const frames = ATTACK_FRAMES[name];
  return frames ? { src: `sprites/attack-${name}.png?v=${__BUILD__}`, frames } : null;
}

/** the idle loop for an enemy picture, or null to show the still picture */
export function foeIdle(src: string | null): { src: string; frames: number } | null {
  const name = spriteName(src);
  const frames = IDLE_FRAMES[name];
  return frames ? { src: `sprites/idle-${name}.png?v=${__BUILD__}`, frames } : null;
}

// summoned adds borrow a trash enemy's picture, keyed by the add's name.
// An add without one (the Plague Corpse, for now) just keeps its HP bar under its master's.
const ADD_ART: Record<string, string> = { "Bone Mite": "foe-mite", "Brood Rat": "foe-rat" };

/** the picture for a summoned add, or null if it has none */
export const addArt = (name: string) => (ADD_ART[name] ? artUrl(ADD_ART[name]) : null);

/** which picture to show for the enemy in front of you */
export function foeArt(f: Foe | null | undefined): string | null {
  if (!f) return null;
  if (f.kind === "boss") return artUrl("boss-" + f.bossId);
  if (f.kind === "guardian") return GUARDIAN_ART[f.gStage!] ? artUrl(GUARDIAN_ART[f.gStage!]) : null;
  return artUrl("foe-" + f.key);
}

// where fighters stand, in the background's own pixels from the top (all are 384x216).
// The cellar and graveyard floors run to the bottom edge, so feet sit there; the crypt has a raised ledge.
// Act 2's floors sit above the bottom edge; the catacombs walkway is a raised slab.
const FLOORS: Record<string, number> = {
  "bg-cellar": 216, "bg-graveyard": 216, "bg-crypt": 188,
  "bg-catacombs": 174, "bg-ossuary": 203, "bg-deep": 205,
};

/** which background each stage uses, in order: Act 1's cellar, graveyard and crypt (the Warden),
 *  then Act 2's catacombs, ossuary and the deep end (the Colossus) */
const PLACES: [lastStage: number, name: string][] = [
  [3, "bg-cellar"], [8, "bg-graveyard"], [10, "bg-crypt"],
  [15, "bg-catacombs"], [19, "bg-ossuary"], [20, "bg-deep"],
];

/** the background for a stage.
 *  floorPad is how far the floor sits above the scene's bottom edge, as a share of the scene's width. */
export function stageBackground(stage: number): { src: string; floorPad: string } | null {
  const name = PLACES.find(([last]) => stage <= last)?.[1] ?? null;
  const src = name && artUrl(name);
  if (!name || !src) return null;
  // the picture is drawn at 150% of the scene's width (see .scene in styles.css), so scale its pixels to match
  return { src, floorPad: `${((216 - FLOORS[name]) / 384) * 150}%` };
}

// The Abomination is Tyler's hand-cleaned picture cut into see-through 64x64 layers,
// stacked in the same spot, back to front: the body (the near hand is always an empty fist),
// the Soul Core (the glow in the ribs and the eyes), the cleaver held upright in the far hand,
// then that hand's fingers, drawn over the handle.
// He always holds the cleaver, whatever Main Arm he wears (Tyler's pick: matching every new
// weapon to its enemy was too fiddly). Only the Soul Core changes how he looks;
// a core without its own picture (later acts) falls back to the wisp.
const CORE_ART: Record<string, string> = { wispCore: "wisp", lanternCore: "lantern", wraithCore: "wraith" };

/** the Abomination's pictures, back to front */
export function abomArt(g: Game, a: Abomination): string[] {
  const core = CORE_ART[g.partById(a.eq.core)?.base ?? ""] ?? "wisp";
  return ["abom-body", `abom-core-${core}`, "abom-arm-cleaver", "abom-hand"].map((n) => artUrl(n)!);
}

/** a part's picture. In lists, a part without art gets an empty square so the rows still line up. */
export function PartIcon({ base, size = 32, blank = false }: { base: string; size?: number; blank?: boolean }) {
  if (!artUrl("part-" + base)) return blank ? <span className="px-icon blank" style={{ width: size, height: size }} /> : null;
  return <Icon name={"part-" + base} size={size} className="part-icon" />;
}
