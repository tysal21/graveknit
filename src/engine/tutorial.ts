import { HINTS, TUT_DONE, TUT_KILLS, TUTORIAL, type HintId, type TutWait } from "../content/tutorial";
import type { Game } from "./game";
import { makePart, partName } from "./parts";
import { newPlayer, spawnTrash } from "./combat";
import { canGraft } from "./crafting";
import { canInfuse } from "./economy";

export const currentStep = (g: Game) => TUTORIAL[g.s.tut];

export function tutGo(g: Game, i: number) {
  g.s.tut = i;
  const st = currentStep(g);
  if (st.id === "kill") g.s.tutKills = 0;
  if (st.id === "squad") g.story(1);
  if (st.id === "done") {
    tutFinish(g, false);
    return;
  }
  g.emit({ type: "tutStep", step: i });
}

/** the coach box's button: Next, or Got it on a tip */
export function tutNext(g: Game) {
  if (!g.inTut()) {
    g.s.hint = null;
    return;
  }
  const st = currentStep(g);
  if (st.id === "intro" || st.next || killsDone(g)) tutGo(g, g.s.tut + 1);
}

/** the "Kill 3 rats" step waits for a click once the rats are dead, so there's time to read it */
export const killsDone = (g: Game) => currentStep(g).wait === "kills" && g.s.tutKills >= TUT_KILLS;

/** the player did something the current step is waiting for */
export function tutEvent(g: Game, kind: TutWait, arg?: number) {
  if (!g.inTut()) return;
  const st = currentStep(g);
  if (st.wait !== kind) return;
  if (kind === "select" && arg !== g.s.tutPart) return;
  tutGo(g, g.s.tut + 1);
}

/** during the tutorial the third rat always drops a Magic hand */
export function tutKill(g: Game) {
  g.s.tutKills++;
  if (currentStep(g).id === "kill" && g.s.tutKills === TUT_KILLS) {
    const p = makePart(g, "gnawedHand", 1, "magic");
    p.affixes = [
      { k: "mutilating", t: 5, roll: 0.6, locked: false },
      { k: "frenzy", t: 5, roll: 0.6, locked: false },
    ];
    g.s.tutPart = p.id;
    g.tick(`${partName(p)} dropped.`, "tc-magic");
    g.log("Your first body part: a hand the rats didn't finish.", "brag");
    g.emit({ type: "tutPartDropped", id: p.id });
  }
}

export function tutFinish(g: Game, skipped: boolean) {
  g.s.tut = TUT_DONE;
  g.s.opt.push = true;
  g.s.opt.auto = true;
  if (skipped) g.story(1);
  g.log(skipped ? "Tutorial skipped. Your Abomination fights, pushes and uses abilities on its own." : "Your Abomination goes to work on its own. Check back when the top bar lights up.", "story");
  if (!g.foe || !g.pl) {
    newPlayer(g);
    spawnTrash(g);
  }
  g.emit({ type: "tutStep", step: TUT_DONE });
}

/** one-time tips after the tutorial */
export function checkHints(g: Game) {
  const s = g.s;
  if (g.inTut() || s.hint) return;
  if (!s.seen.hInfuse && canInfuse(g)) {
    s.seen.hInfuse = 1;
    s.hint = "infuse";
  } else if (!s.seen.hGens && s.maxStage >= 3) {
    s.seen.hGens = 1;
    s.hint = "gens";
  } else if (!s.seen.hDig && s.maxStage >= 11) {
    s.seen.hDig = 1;
    s.hint = "dig";
  } else if (!s.seen.hAct3 && s.maxStage >= 21) {
    s.seen.hAct3 = 1;
    s.hint = "act3";
  } else if (!s.seen.hGrind && s.maxStage >= 21) {
    s.seen.hGrind = 1;
    s.hint = "grind";
  } else if (!s.seen.hRestitch && wornLagging(g)) {
    s.seen.hRestitch = 1;
    s.hint = "restitch";
  } else if (!s.seen.hGraft && wornCanGraft(g)) {
    s.seen.hGraft = 1;
    s.hint = "graft";
  } else if (!s.seen.hSquad2 && s.squad.length >= 2) {
    s.seen.hSquad2 = 1;
    s.hint = "squad2";
  } else if (g.bossReady() && !g.bossCleared()) {
    // one tip per boss
    const id = g.act().boss.id;
    const key = bossHintKey(id);
    if (!s.seen[key]) {
      s.seen[key] = 1;
      s.hint = BOSS_HINT[id] ?? "boss";
    }
  }
}

const BOSS_HINT: Record<string, HintId> = { warden: "boss", colossus: "boss2", rival: "boss3" };

/** a worn part has fallen a few item levels behind, so Re-stitch is worth a mention */
const wornLagging = (g: Game) => g.s.parts.some((p) => g.isWorn(p) && p.rarity !== "common" && p.ilvl <= g.s.maxStage - 3);

/** a worn part could take a graft right now: a spare part fits it and the reagents are there */
const wornCanGraft = (g: Game) => g.s.parts.some((p) => g.isWorn(p) && canGraft(g, p));

export const currentHint = (g: Game) => (g.s.hint ? HINTS[g.s.hint] : null);

/** the "seen" flag for a boss's ready tip */
export const bossHintKey = (bossId: string) => (bossId === "warden" ? "hBoss" : "hBoss_" + bossId);

/** the "seen" flag for a boss's lesson; the Warden's keeps its old name so old saves don't see it twice */
export const lessonKey = (bossId: string) => (bossId === "warden" ? "bossLesson" : "lesson_" + bossId);
