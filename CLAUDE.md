# Graveknit

A browser idle/ARPG necromancy game. You stitch undead Abominations from the parts of what you kill, then chase perfect rolls. Built solo by Tyler, who is new to coding: **explain changes in plain language and give step-by-step instructions** whenever Tyler has to do something.

Design sources (in the Graveknit Claude project): *Graveknit Design Doc v2*, *Graveknit: open questions answered* (Thrall auras, the 48-node skill web), Balance Bench v2, and the Act 1 prototype. Phase 3 plan: Acts 1 to 5 + Death + skill web + Veil Depths, saves in the browser. Phase 4 (later) adds accounts and server-side rolls with Supabase.

## Commands

- `npm install` once, after cloning.
- `npm run dev` starts the game at http://localhost:5173 and reloads on every change.
- `npm test` runs every automatic check (engine rules, saves, balance bots). Run it before every commit.
- `npm run bots` runs only the balance bots and prints how long the first boss kill takes.
- `npm run build` type-checks and builds the site into `dist/`.

Pushing to `main` publishes the game to GitHub Pages automatically (`.github/workflows/deploy.yml`). Every push and pull request runs the checks (`.github/workflows/ci.yml`).

## How the code is organised

- `src/content/` is the game's data: balance numbers (`tune.ts`), affixes, abilities, generators, Rituals, the tutorial, and one file per act (`act1.ts`, `act2.ts`...). Register new acts in `acts.ts`. **Every balance number lives in exactly one place.**
- `src/engine/` is the game rules, with no screen code. Everything takes a `Game` (`game.ts`) holding the saved `GameState` (`state.ts`) plus the live fight. Randomness goes through `g.rng` so tests can use a seed, and so the rules can move to a server in Phase 4.
- `src/ui/` is the screen (React). `runtime.ts` runs the game loop and saves; `uiStore.ts` holds what's selected and open; `panels/` has Squad, Crypt, Stitchery and Graveyard; `common/Tips.tsx` has every info blip.
- `tests/` has engine checks and `tests/bots/` the balance bots.

## Saves

Saved to localStorage under `graveknit-save` every 5 seconds and when the tab closes. Players can Export/Import their save as text (`GK1:...`). **When you change the shape of `GameState`, bump `SAVE_VERSION` in `state.ts` and add a migration step in `save.ts`.** Never break old saves. `repair()` fixes broken data on load.

## Tyler's decisions (fixed rules, don't undo without asking)

- **Tutorial:** the game starts paused. 11 steps teach one panel at a time; untaught panels stay greyed out; Skip is always visible; later systems get one-time tip cards (Infusion, new generators, first boss). Every new system in later acts gets a tip card too.
- **Info blips:** every currency, Squad stat, Infusion, the Bone Altar and the stash count has an ⓘ showing where its number comes from, source by source, updating live. New numbers in later acts get one too.
- **Crypt Warden:** 20× trash HP (not 12×), hits at 0.5× a trash hit every 2 s, 30 s enrage.
- **Warden option B:** the lantern blast can't be blocked on the first fight. Ward (Lantern Core trophy) and Phase (Wraith Core) drop only from the Warden. The lesson and the live warning tell you to bring enough Max HP. **No Wraith Core from Town Watchmen.**
- **Auto abilities:** fire when ready; on trash, Ward and Phase only fire below 60% HP.
- **Stash:** 60 unworn parts (worn don't count). When full, the **oldest** unkept part is rendered into Corpse Mass, logged at most once a minute. If everything is kept, the new drop is left behind. Trophies are always kept and always get in.
- **Stitchery tools:** Keep, Render Commons, Render all (follows filters, confirm box), slot filters that combine (no Upgrades filter, Tyler removed it), Sort (Newest, Upgrades first, Item level, Best rolls), the list fills the panel and clicking a part opens the **Workbench pop-up** (full details, crafting, ◂ ▸ to step through parts), hover stat cards (desktop), Select mode (Keep/Unkeep/Render many), upgrade value on each row, graft preview in green/red. **No auto-render loot filter.** Smarter clean-up and a bigger stash may come later as skill web unlocks.
- **Bone Altar:** bonus = 25% × log10(1 + given ÷ 500); the button sacrifices half your Corpse Mass. Show the before/after preview under the button and DPS before/after in the log. **No in-fight Altar chip.** Don't make it stronger.
- **Affix tiers:** T5 at item level 1, T4 at 3, T3 at 8, T2 at 20, T1 at 35. Roll odds 45/30/15/7/3.
- **Affix rolls:** each tier's range is stretched 1.8× around its middle (`tierSpread`), so a great T2 can beat a poor T1. Rolls follow a bell curve (average of two dice): the top or bottom 10% is about 1 roll in 50. Each affix shows a quality word: Botched (bottom 10%), Fair, Fine, Pristine, Exquisite (top 10%) and **Perfect, only for the exact highest number** the tier can roll at that item level (Tyler's pick). Exquisite and Perfect rolls get a log brag.
- **Re-stitch:** on the Workbench, lifts a part to your furthest stage's item level and keeps every roll. Costs Grave Dust and Soul Essence per level gained, scaled by rarity (raised once already because Tyler found it too strong). It exists so crafted parts aren't outclassed by the next drop. **Press Marrow** trades 20 Dust for 1 Marrow Shard.
- **Infusion price:** each level costs its old price (20 × 1.28^level) plus 60 kills' worth of Soul Essence at your best stage, so Essence keeps mattering as kills pay more (Tyler's pick).
- **AFK:** offline play earns 55% of the active pace for up to 12 hours, but parts, Grave Dust and Marrow come in at a quarter of that, so crafting rewards playing (Tyler's pick).
- **Notoriety:** each level ×1.25 enemy HP and damage (stacking), +10% drops, +2 item level.
- **Stage guardians:** the last kill of Stages 2-4 and 12-14 (first clear only) is a named mini-boss with one boss move and a guaranteed Magic drop. Tuned so the untouched tutorial kit loses and one ~20% upgrade wins. No enrage; losing drops you a stage. Each new act gets guardians on its 2nd-4th stages.
- **Ossuary Colossus (Act 2):** 40× trash HP (more than the Warden's 20×), 30 s enrage, slams three times (twice in a row at the end). Its second heal became **Bone Swarm** (two mites shield it), a preview of Act 3's summons. Bots: about 20-45 minutes after the Warden.
- **Act 3 (Plague town, Stages 21-30):** the Arch-Necromancer (45× trash HP, 30 s enrage) summons adds; while any add lives the boss takes 75% less damage and hits go to the adds first. Answers: **Sweeping** (Off Arm affix, item level 11+, splashes each hit), poison (hits every add), **Plague Wind** (Ritual, poison ×3 for 15 s, auto-cast in boss fights only). Also Reap (Bone Scythe), Ossuary Grinders, Rival's Core trophy (copies the best affix another squad member wears), Thrall +15% Soul Essence. Bots: about 2 hours to the Arch-Necromancer.
- **Elites (Act 3 on):** about 1 kill in 150 within 2 stages of your best. ×4 HP, ×1.5 damage, pays 5×, always drops a signature part (75% Magic / 25% Rare, built-in stats ×1.5), 4% Spectral Thread, 3% unique.
- **Uniques:** named parts with no random affixes and one special effect. Can't be rerolled, grafted onto or Re-stitched; they stay at the item level they dropped at. Drop from bosses (12%) and Elites (3%). Colour: bile green.
- **Squad:** slot 2 opens at Stage 20, slot 3 at 40. New Abominations start empty. Only the Vanguard (slot 1) takes hits; everyone's damage and abilities add up. Soul Essence and drop bonuses from parts add up across the squad; generator and Thrall bonuses count once.
- **Boss victory:** a SLAIN stamp, then a loot pop-up (parts open on the Workbench, Thrall banner) on first kills and new Thralls. Repeat kills get a corner toast unless "Victory pop-up every kill" is on. Every future boss uses this.
- **Spectral Threads:** each boss gives one on its **first kill only**; repeat kills give none (Tyler's pick, so farming an old boss can't pile them up). Elites have a small chance.
- **Loot:** 4% of kills drop a part; rarity 65 / 28 / 7 (Common / Magic / Rare), so about 1 part in 14 is Rare. **No Rare luck or pity of any kind** (Tyler's pick, so nothing can be cheesed; tried and removed). A Rare drop gets a gold toast that opens it on the Workbench, plus a chime if sounds are on. Bosses and guardians keep their own odds.
- **Reagents on old stages:** Grave Dust and Marrow drop at full rate up to 2 stages below your best, then fade by 15% for each further stage (×0.85 per stage, never below a tenth), active and AFK, so camping an easy stage isn't the best way to farm crafting reagents (Tyler's pick).
- Drop rates don't get stingier over time.
- **Later, with the art:** a short walk-in (about 0.5 s) between enemies, which also caps kills per second so parking on your best stage can't multiply reagents. Tyler wants it when enemy art is added, not before.

## Style

- Plain, dry, darkly funny flavor text; grim when the story moves.
- Desktop-first (second monitor), phone-friendly (panels become bottom tabs at 760px and below).
- No images needed: dark grimoire look, rarity colours (Common grey, Magic blue, Rare yellow, Trophy orange).
- Keep code readable for a beginner: small functions, short comments that say *why*.
