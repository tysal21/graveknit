import type { Game } from "../engine/game";
import type { Foe } from "../engine/combat";
import type { Abomination } from "../engine/state";

// Pixel art made with PixelLab lives in public/sprites. Anything without a
// picture yet (Acts 2 and 3) just shows its text, so the game never breaks
// when a file is missing.
const HAVE = new Set([
  "foe-rat", "foe-digger", "foe-hound", "foe-watch",
  "guard-ratKing", "guard-foreman", "guard-alpha", "boss-warden", "thrall-lantern",
  "minion-abom-cleaver", "minion-abom-shovel", "altar",
  "bg-cellar", "bg-graveyard", "bg-crypt",
  "icon-cm", "icon-ess", "icon-marrow", "icon-dust", "icon-thread",
  "ab-cleave", "ab-haste", "ab-bury", "ab-ward", "ab-phase",
  "gen-scav", "gen-harv", "gen-cart",
  "rit-raise", "rit-hunger", "rit-moon",
  ...["pauperSkull", "pauperRib", "cleaverArm", "pauperHand", "wispCore", "gnawedHand", "diggerArm", "houndSkull", "watchRib", "lanternCore", "wraithCore"].map((b) => "part-" + b),
]);

/** the file for a picture, or null if it hasn't been drawn yet. Relative, so it works on GitHub Pages. */
export const artUrl = (name: string) => (HAVE.has(name) ? `sprites/${name}.png` : null);

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

/** which picture to show for the enemy in front of you */
export function foeArt(f: Foe | null | undefined): string | null {
  if (!f) return null;
  if (f.kind === "boss") return artUrl("boss-" + f.bossId);
  if (f.kind === "guardian") return GUARDIAN_ART[f.gStage!] ? artUrl(GUARDIAN_ART[f.gStage!]) : null;
  return artUrl("foe-" + f.key);
}

/** Act 1's three places: the cellar, the graveyard, then the crypt and the Warden */
export function stageBackground(stage: number): string | null {
  if (stage <= 3) return artUrl("bg-cellar");
  if (stage <= 8) return artUrl("bg-graveyard");
  if (stage <= 10) return artUrl("bg-crypt");
  return null;
}

// the Main Arm picks the body; anything without its own sprite uses the cleaver one
const ARM_ART: Record<string, string> = { cleaverArm: "minion-abom-cleaver", diggerArm: "minion-abom-shovel" };
// the Soul Core picks the glow in its chest
const CORE_GLOW: Record<string, string> = { wispCore: "#7fdc5a", lanternCore: "#e0b85a", wraithCore: "#8fc6ff" };

export function abomArt(g: Game, a: Abomination) {
  const arm = g.partById(a.eq.main)?.base;
  const core = g.partById(a.eq.core)?.base;
  return {
    src: artUrl(ARM_ART[arm ?? ""] ?? "minion-abom-cleaver")!,
    glow: core ? CORE_GLOW[core] ?? "#7fdc5a" : null,
  };
}

/** a part's picture. In lists, a part without art gets an empty square so the rows still line up. */
export function PartIcon({ base, size = 32, blank = false }: { base: string; size?: number; blank?: boolean }) {
  if (!artUrl("part-" + base)) return blank ? <span className="px-icon blank" style={{ width: size, height: size }} /> : null;
  return <Icon name={"part-" + base} size={size} className="part-icon" />;
}
