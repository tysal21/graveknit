import { actForStage, BASES, STARTING_PARTS } from "../content/acts";
import { RITUALS } from "../content/rituals";
import { TUNE } from "../content/tune";
import { TUT_DONE } from "../content/tutorial";
import type { AbilityId } from "../content/abilities";
import { stepCombat, type Foe, type Player } from "./combat";
import { makePart } from "./parts";
import type { Rng } from "./rng";
import { SAVE_VERSION, type GameState, type LogEntry, type Part } from "./state";
import { calc, type Stats } from "./stats";
import type { OfflineReport } from "./offline";

export interface TickerLine {
  text: string;
  cls?: string;
}

/** things the screen may want to react to */
export type GameEvent =
  | { type: "bossReady" }
  | { type: "tutPartDropped"; id: number }
  | { type: "tutStep"; step: number }
  | { type: "offline"; report: OfflineReport }
  | { type: "bossWin"; win: BossWin };

/** what one boss kill gave you, for the victory pop-up */
export interface BossWin {
  bossId: string;
  /** the first time you beat this boss */
  first: boolean;
  /** how long the fight took, in seconds */
  secs: number;
  ess: number;
  cm: number;
  marrow: number;
  dust: number;
  thread: boolean;
  /** ids of the parts that dropped (some may be rendered later) */
  parts: number[];
  /** the boss rose as your Thrall this time */
  thrall: boolean;
}

/**
 * The running game: the saved state plus what only exists while playing
 * (the current fight, the ticker). The screen reads from it and calls actions on it.
 */
export class Game {
  s: GameState;
  rng: Rng;
  /** the enemy being fought */
  foe: Foe | null = null;
  /** the Vanguard's fight state: HP, cooldowns, buffs */
  pl: Player | null = null;
  /** stats cached for the current step */
  c!: Stats;
  ticker: TickerLine[] = [];
  /** full-stash clean-up, summarised in the log at most once a minute */
  trim = { n: 0, cm: 0, lost: 0, at: 0 };
  private listeners: ((e: GameEvent) => void)[] = [];

  constructor(state: GameState | null, rng: Rng = Math.random) {
    this.rng = rng;
    if (state) {
      this.s = state;
    } else {
      this.s = Game.emptyState();
      for (const b of STARTING_PARTS) {
        const p = makePart(this, b, 1, "common");
        p.isNew = false;
        this.s.squad[0].eq[BASES[b].slot] = p.id;
      }
    }
    this.refresh();
  }

  static emptyState(): GameState {
    const rit = {} as GameState["rit"];
    for (const r of RITUALS) rit[r.id] = { ready: 0, until: 0, power: 1 };
    return {
      v: SAVE_VERSION, clock: 0, stage: 1, maxStage: 1, kills: 0,
      cm: TUNE.start.cm, ess: 0, lifeEss: 0, marrow: TUNE.start.marrow, dust: TUNE.start.dust, thread: TUNE.start.thread,
      gens: {}, altar: 0,
      squad: [{ name: "The First Stitch", eq: {}, infusion: 1 }],
      parts: [], nextId: 1, bosses: {}, rit,
      opt: { push: false, auto: false, boss: false, rit: false, sound: false, sort: "new", bossPop: false },
      tut: 0, tutKills: 0, tutPart: null, hint: null,
      seen: {}, log: [], lastSave: Date.now(), bossRetryAt: 0, stats: { kills: 0, rolls: 0 },
    };
  }

  // ---- events ----
  on(fn: (e: GameEvent) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  }
  emit(e: GameEvent) {
    for (const f of this.listeners) f(e);
  }

  // ---- lookups ----
  partById(id: number | null | undefined): Part | undefined {
    return id == null ? undefined : this.s.parts.find((p) => p.id === id);
  }
  isWorn(p: Part) {
    return this.s.squad.some((a) => a.eq[BASES[p.base].slot] === p.id);
  }
  /** parts in the stash (worn parts don't count) */
  looseCount() {
    return this.s.parts.filter((p) => !this.isWorn(p)).length;
  }
  stashFull() {
    return this.looseCount() >= TUNE.stashMax;
  }
  inTut() {
    return this.s.tut < TUT_DONE;
  }
  act() {
    return actForStage(this.s.stage);
  }
  bossReady() {
    const b = this.act().boss;
    return this.s.maxStage >= b.stage && this.foe?.kind !== "boss";
  }
  bossCleared(id = this.act().boss.id) {
    return (this.s.bosses[id]?.kills ?? 0) > 0;
  }
  /** recompute cached stats after anything that changes them */
  refresh() {
    this.c = calc(this);
    if (this.pl && this.pl.hp > this.c.maxHp) this.pl.hp = this.c.maxHp;
  }

  // ---- messages ----
  log(text: string, cls: LogEntry["cls"] = "") {
    this.s.log.unshift({ t: Date.now(), text, cls });
    if (this.s.log.length > 80) this.s.log.length = 80;
  }
  /** a story line the first time you reach a stage */
  story(stage: number) {
    if (this.s.seen["s" + stage]) return;
    this.s.seen["s" + stage] = 1;
    const line = actForStage(stage).story[stage];
    if (line) this.log(line, "story");
  }
  tick(text: string, cls?: string) {
    this.ticker.unshift({ text, cls });
    if (this.ticker.length > 3) this.ticker.length = 3;
  }

  /** advance the game by `dt` seconds of play */
  step(dt: number) {
    stepCombat(this, dt);
  }

  /** run many small steps; the screen calls this with real elapsed time */
  advance(seconds: number) {
    while (seconds > 0) {
      const d = Math.min(0.1, seconds);
      this.step(d);
      seconds -= d;
    }
  }

  abilities(): AbilityId[] {
    return this.c.abilities;
  }
}
