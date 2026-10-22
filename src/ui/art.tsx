import type { Game } from "../engine/game";
import type { Foe } from "../engine/combat";
import type { Abomination } from "../engine/state";

// Pixel art made with PixelLab lives in public/sprites. Anything without a
// picture yet (Acts 2 and 3) just shows its text, so the game never breaks
// when a file is missing.
const HAVE = new Set([
  "foe-rat", "foe-digger", "foe-hound", "foe-watch",
  "guard-ratKing", "guard-foreman", "guard-alpha", "boss-warden", "thrall-lantern",
  "abom-body", "abom-weapon-cleaver", "abom-weapon-shovel", "abom-core-wisp", "abom-core-lantern", "abom-core-wraith",
  "altar",
  "bg-cellar", "bg-graveyard", "bg-crypt",
  "icon-cm", "icon-ess", "icon-marrow", "icon-dust", "icon-thread",
  "ab-cleave", "ab-haste", "ab-bury", "ab-ward", "ab-phase",
  "gen-scav", "gen-harv", "gen-cart",
  "rit-raise", "rit-hunger", "rit-moon",
  ...["pauperSkull", "pauperRib", "cleaverArm", "pauperHand", "wispCore", "gnawedHand", "diggerArm", "houndSkull", "watchRib", "lanternCore", "wraithCore"].map((b) => "part-" + b),
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
export const THRALL_ART: Record<string, string> = { warden: "lantern" };

// guardians are keyed by the stage they guard
const GUARDIAN_ART: Record<number, string> = { 2: "guard-ratKing", 3: "guard-foreman", 4: "guard-alpha" };

// small beasts are drawn filling their canvas, so shrink them to sit right beside people
const FOE_SCALE: Record<string, number> = { "foe-rat": 0.6, "foe-hound": 0.8, "guard-ratKing": 0.8, "guard-alpha": 0.95 };
export const foeScale = (src: string | null) => FOE_SCALE[src?.replace(/^sprites\/|\.png.*$/g, "") ?? ""] ?? 1;

/** which picture to show for the enemy in front of you */
export function foeArt(f: Foe | null | undefined): string | null {
  if (!f) return null;
  if (f.kind === "boss") return artUrl("boss-" + f.bossId);
  if (f.kind === "guardian") return GUARDIAN_ART[f.gStage!] ? artUrl(GUARDIAN_ART[f.gStage!]) : null;
  return artUrl("foe-" + f.key);
}

// where fighters stand, in the background's own pixels from the top (all are 384x216).
// The cellar and graveyard floors run to the bottom edge, so feet sit there; the crypt has a raised ledge.
const FLOORS: Record<string, number> = { "bg-cellar": 216, "bg-graveyard": 216, "bg-crypt": 188 };

/** Act 1's three places: the cellar, the graveyard, then the crypt and the Warden.
 *  floorPad is how far the floor sits above the scene's bottom edge, as a share of the scene's width. */
export function stageBackground(stage: number): { src: string; floorPad: string } | null {
  const name = stage <= 3 ? "bg-cellar" : stage <= 8 ? "bg-graveyard" : stage <= 10 ? "bg-crypt" : null;
  const src = name && artUrl(name);
  if (!name || !src) return null;
  // the picture is drawn at 150% of the scene's width (see .scene in styles.css), so scale its pixels to match
  return { src, floorPad: `${((216 - FLOORS[name]) / 384) * 150}%` };
}

// The Abomination is three see-through 64x64 pictures stacked in the same spot:
// the weapon (behind, so its handle vanishes into the cloak sleeve), the cloaked body,
// then the Soul Core (the thing in its chest plus the matching eye glow).
// Only the Main Arm and the Soul Core change how it looks.
// Anything without its own picture (later acts' parts) falls back to the cleaver and the wisp.
const ARM_ART: Record<string, string> = { cleaverArm: "cleaver", diggerArm: "shovel" };
const CORE_ART: Record<string, string> = { wispCore: "wisp", lanternCore: "lantern", wraithCore: "wraith" };

/** the Abomination's pictures, back to front */
export function abomArt(g: Game, a: Abomination): string[] {
  const arm = ARM_ART[g.partById(a.eq.main)?.base ?? ""] ?? "cleaver";
  const core = CORE_ART[g.partById(a.eq.core)?.base ?? ""] ?? "wisp";
  return [`abom-weapon-${arm}`, "abom-body", `abom-core-${core}`].map((n) => artUrl(n)!);
}

/** a part's picture. In lists, a part without art gets an empty square so the rows still line up. */
export function PartIcon({ base, size = 32, blank = false }: { base: string; size?: number; blank?: boolean }) {
  if (!artUrl("part-" + base)) return blank ? <span className="px-icon blank" style={{ width: size, height: size }} /> : null;
  return <Icon name={"part-" + base} size={size} className="part-icon" />;
}
