import { actForStage, BASES, STARTING_PARTS } from "../content/acts";
import { RITUALS } from "../content/rituals";
import { TUNE } from "../content/tune";
import { TUT_DONE } from "../content/tutorial";
import type { AbilityId } from "../content/abilities";
import { stepCombat, type Foe, type Player } from "./combat";
import { makePart } from "./parts";
import type { Rng } from "./rng";
import { SAVE_VERSION, type GameState, type LogEntry, type Part } from "./state";
import { calc, squadBonus, squadDps, type Stats } from "./stats";
import type { OfflineReport } from "./offline";

export interface TickerLine {
  text: string;
  cls?: string;
}

/** a damage number that floats up over someone's head: "foe" is the enemy, "me" the Vanguard */
export interface Pop {
  id: number;
  side: "foe" | "me";
  /** the amount; 0 for a pop that is only a word (Dodged) */
  n: number;
  kind: "hit" | "crit" | "skill" | "poison" | "heal" | "hurt" | "blast" | "block" | "dodge";
  /** game clock when it happened, so the screen can let it fade */
  at: number;
}

/** things the screen may want to react to */
export type GameEvent =
  | { type: "bossReady" }
  | { type: "tutPartDropped"; id: number }
  | { type: "tutStep"; step: number }
  | { type: "offline"; report: OfflineReport }
  | { type: "bossWin"; win: BossWin }
  | { type: "rareDrop"; id: number };

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
  /** the Vanguard's stats, cached for the current step */
  c!: Stats;
  /** every squad member's stats (cs[0] is the Vanguard, same as c) */
  cs: Stats[] = [];
  ticker: TickerLine[] = [];
  /** recent damage numbers for the fight picture; never saved */
  pops: Pop[] = [];
  private popId = 0;
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
    return this.wornBy(p) >= 0;
  }
  /** which squad slot is wearing this part, or -1 if it's loose in the stash */
  wornBy(p: Part) {
    return this.s.squad.findIndex((a) => a.eq[BASES[p.base].slot] === p.id);
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
    this.cs = this.s.squad.map((_, i) => calc(this, { abom: i }));
    this.c = this.cs[0];
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
  /** show a damage number over someone's head; only the latest few are kept, so fast squads can't flood the screen */
  pop(side: Pop["side"], n: number, kind: Pop["kind"]) {
    this.pops.push({ id: ++this.popId, side, n, kind, at: this.s.clock });
    if (this.pops.length > 12) this.pops.shift();
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

  /** every ability in the squad, with who owns it (cooldowns are per Abomination) */
  abilities(): { abom: number; id: AbilityId }[] {
    return this.cs.flatMap((c, abom) => c.abilities.map((id) => ({ abom, id })));
  }
  /** the whole squad's damage per second */
  dps() {
    return squadDps(this.cs);
  }
  /** Soul Essence or drop bonus, added up over the squad */
  bonus(st: "ess" | "drop") {
    return squadBonus(this, st);
  }
}
