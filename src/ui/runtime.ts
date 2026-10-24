import { useSyncExternalStore } from "react";
import { Game } from "../engine/game";
import { newPlayer, spawnTrash } from "../engine/combat";
import { mergeReports, offlineProgress, type OfflineReport } from "../engine/offline";
import { TUNE } from "../content/tune";
import { loadFromBrowser, repair, saveToBrowser } from "../engine/save";
import type { GameState } from "../engine/state";

// The one running game, the loop that drives it, and the hook the screen uses to redraw.

let game: Game;
let version = 0;
const subs = new Set<() => void>();
/** tester speed: 1×, 3× or 10× */
export const speed = { value: 1 };

export function getGame() {
  return game;
}

/** tell the screen something changed so it redraws now (not just on the next tick) */
export function bump() {
  version++;
  for (const f of subs) f();
}

function subscribe(f: () => void) {
  subs.add(f);
  return () => subs.delete(f);
}

/** components call this to redraw whenever the game changes */
export function useGame(): Game {
  useSyncExternalStore(subscribe, () => version);
  return game;
}

type Listener = (g: Game) => void;
const onNewGame = new Set<Listener>();
/** the screen hooks game events here; runs again whenever the game is replaced (import, wipe) */
export function onGameCreated(f: Listener) {
  onNewGame.add(f);
  if (game) f(game);
}

/** start (or restart) with a save, applying offline progress if you were away over a minute */
export function startGame(state: GameState | null) {
  game = new Game(state);
  dozeOwed = 0;
  dozeTotal = null;
  lastInput = Date.now();
  if (state) repair(game);
  newPlayer(game);
  spawnTrash(game);
  for (const f of onNewGame) f(game);
  const away = state ? (Date.now() - state.lastSave) / 1000 : 0;
  if (away > 60 && !game.inTut()) {
    const report = offlineProgress(game, away);
    newPlayer(game);
    game.emit({ type: "offline", report });
  }
  bump();
}

let last = Date.now();
let started = false;

// ---- dozing: an open tab nobody touches pays AFK rates (TUNE.dozeAfter) ----
/** when someone last clicked, tapped, scrolled or pressed a key */
let lastInput = Date.now();
/** dozing seconds not paid yet; they're paid a minute at a time so small amounts don't round away */
let dozeOwed = 0;
/** everything dozing has paid since the last touch, shown when you wake */
let dozeTotal: OfflineReport | null = null;

/** the game is dozing: the fight is frozen and time is paid at AFK rates */
export function isDozing() {
  return !!game && !game.inTut() && Date.now() - lastInput > TUNE.dozeAfter * 1000;
}

function payDoze() {
  if (dozeOwed <= 0) return;
  dozeTotal = mergeReports(dozeTotal, offlineProgress(game, dozeOwed));
  dozeOwed = 0;
}

/** any touch wakes the game and shows what dozing earned */
function wake() {
  if (isDozing()) {
    payDoze();
    if (dozeTotal) game.emit({ type: "offline", report: { ...dozeTotal, dozed: true } });
    dozeTotal = null;
    bump();
  }
  lastInput = Date.now();
}

export function boot() {
  if (started) return;
  started = true;
  startGame(loadFromBrowser());
  last = Date.now();
  // handy for testing from the browser console: GK.game().s.marrow = 99
  (window as unknown as { GK: object }).GK = { game: getGame, bump };
  // the game runs on real elapsed time, so a background tab the browser slows down still progresses.
  // Short gaps (a background tab woken once a minute) are played out in full; only long ones
  // (the computer slept, the tab was frozen) are paid out as AFK time.
  setInterval(() => {
    const now = Date.now();
    const el = (now - last) / 1000;
    last = now;
    if (el > TUNE.playOutGap && !game.inTut()) {
      const report = offlineProgress(game, el);
      newPlayer(game);
      spawnTrash(game);
      game.emit({ type: "offline", report });
    } else if (isDozing()) {
      dozeOwed += el;
      if (dozeOwed >= 60) payDoze();
    } else {
      game.advance(el * speed.value);
    }
    bump();
  }, 100);
  for (const ev of ["pointerdown", "keydown", "wheel", "touchstart"]) window.addEventListener(ev, wake, { passive: true });
  setInterval(() => saveToBrowser(game.s), 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveToBrowser(game.s);
  });
  window.addEventListener("pagehide", () => saveToBrowser(game.s));
}

/** do something to the game, then redraw at once */
export function act(fn: (g: Game) => void) {
  fn(game);
  bump();
}
