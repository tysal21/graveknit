import { useSyncExternalStore } from "react";
import { Game } from "../engine/game";
import { newPlayer, spawnTrash } from "../engine/combat";
import { offlineProgress } from "../engine/offline";
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

export function boot() {
  if (started) return;
  started = true;
  startGame(loadFromBrowser());
  last = Date.now();
  // handy for testing from the browser console: GK.game().s.marrow = 99
  (window as unknown as { GK: object }).GK = { game: getGame, bump };
  // the game runs on real elapsed time, so a background tab the browser slows down still progresses
  setInterval(() => {
    const now = Date.now();
    const el = (now - last) / 1000;
    last = now;
    if (el > 60 && !game.inTut()) {
      const report = offlineProgress(game, el);
      newPlayer(game);
      spawnTrash(game);
      game.emit({ type: "offline", report });
    } else {
      game.advance(el * speed.value);
    }
    bump();
  }, 100);
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
