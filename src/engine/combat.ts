import { ABILITY, ABILITY_TUNE, type AbilityId, type BossMoveType } from "../content/abilities";
import { actForStage, isBossStage, LAST_STAGE } from "../content/acts";
import { DEATH_LINES } from "../content/act1";
import { TUNE } from "../content/tune";
import { TUT_RUNNING_FROM } from "../content/tutorial";
import type { BossDef } from "../content/types";
import { fmt, pct } from "./format";
import type { Game } from "./game";
import { autoRituals, cmRate } from "./economy";
import { dropPart } from "./stash";
import { tutEvent, tutKill } from "./tutorial";
import { pickWeighted } from "./rng";
import { bossById } from "../content/acts";
import { makePart } from "./parts";

export interface BossEvent {
  move: string;
  type: BossMoveType;
  at: number;
  end: number;
  started?: boolean;
  done?: boolean;
  countered?: boolean;
}

export interface Foe {
  kind: "trash" | "boss";
  key?: string;
  bossId?: string;
  name: string;
  hp: number;
  max: number;
  dmg: number;
  /** seconds between attacks */
  int: number;
  atk: number;
  // boss fights only
  t: number;
  ev: BossEvent[];
  cur: BossEvent | null;
  weakUntil: number;
  stunUntil: number;
  healed: number;
  countered: number;
}

export interface Player {
  hp: number;
  atk: number;
  hasteUntil: number;
  wardUntil: number;
  ward: number;
  phaseUntil: number;
  cd: Partial<Record<AbilityId, number>>;
}

// ---- enemy numbers by stage ----
export const trashHp = (stage: number) => TUNE.hpBase * Math.pow(TUNE.hpGrow, stage - 1) + TUNE.hpPerStage * stage;
export const enemyHit = (stage: number) => TUNE.dmgBase * Math.pow(TUNE.dmgGrow, stage - 1);
export const essPerKill = (stage: number) => TUNE.essBase * Math.pow(TUNE.essGrow, stage - 1);
export const bossHp = (b: BossDef) => trashHp(b.stage) * TUNE.bossHpMult;

export function newPlayer(g: Game) {
  g.refresh();
  g.pl = { hp: g.c.maxHp, atk: 0, hasteUntil: 0, wardUntil: 0, ward: 0, phaseUntil: 0, cd: {} };
}

export function spawnTrash(g: Game) {
  const s = g.s.stage;
  const act = actForStage(s);
  const k = pickWeighted(g.rng, act.stageFoes[s]);
  const f = act.foes[k];
  const hp = trashHp(s) * f.hp;
  g.foe = { kind: "trash", key: k, name: f.name, hp, max: hp, dmg: enemyHit(s) * f.dmg, int: f.int, atk: 0, t: 0, ev: [], cur: null, weakUntil: -1, stunUntil: -1, healed: 0, countered: 0 };
}

export function startBoss(g: Game) {
  const b = g.act().boss;
  const jit = () => (g.rng() - 0.5) * 2;
  const ev: BossEvent[] = b.script.map((e) => ({ move: e.move, type: b.moves[e.move].type, at: e.at + jit() * e.jitter, end: 0 }));
  const hp = bossHp(b);
  g.foe = { kind: "boss", bossId: b.id, name: b.name, hp, max: hp, dmg: enemyHit(b.stage) * TUNE.bossHitMult, int: TUNE.bossAtkInt, atk: 0, t: 0, ev, cur: null, weakUntil: -1, stunUntil: -1, healed: 0, countered: 0 };
  newPlayer(g);
  g.s.kills = 0;
  g.ticker = [];
  g.log(b.intro, "story");
}

/** damage multiplier on a boss while it is exposed or staggered */
function vulnerability(g: Game) {
  const f = g.foe!;
  if (f.kind !== "boss") return 1;
  let m = 1;
  if (f.t < f.weakUntil) m += TUNE.weakBonus;
  if (f.t < f.stunUntil) m += TUNE.stunBonus;
  return m;
}

function dealHit(g: Game, mult: number, label?: string) {
  const c = g.c;
  const crit = g.rng() < c.cc / 100;
  const d = c.hit * mult * (crit ? 1 + c.cm / 100 : 1) * vulnerability(g);
  g.foe!.hp -= d;
  if (label || crit) g.tick(`${label ? label + " " : ""}${crit ? "Crit " : ""}${fmt(d)}`, crit ? "crit" : undefined);
  return d;
}

function hitPlayer(g: Game, d: number, big: boolean) {
  const p = g.pl!, f = g.foe!, s = g.s;
  if (p.phaseUntil > s.clock) {
    p.phaseUntil = 0;
    g.tick(big ? "Phase! The blast passes through you." : "Phase: the hit passes through.", big ? "crit" : undefined);
    if (big) f.countered++;
    return;
  }
  if (p.ward > 0 && p.wardUntil > s.clock) {
    const a = Math.min(p.ward, d);
    p.ward -= a;
    d -= a;
    if (big && d <= 0) {
      g.tick("Ward holds! The blast breaks on the shield.", "crit");
      f.countered++;
    }
  }
  p.hp -= d;
  if (big && d > 0) {
    const mv = f.cur ? bossById(f.bossId!).moves[f.cur.move] : null;
    g.tick((mv?.hit ?? "The blast hits for {n}.").replace("{n}", fmt(d)));
  }
}

export function useAbility(g: Game, id: AbilityId, manual: boolean) {
  const f = g.foe, p = g.pl, s = g.s;
  if (!f || !p) return;
  if (!g.c.abilities.includes(id)) return;
  if ((p.cd[id] || 0) > s.clock) return;
  p.cd[id] = s.clock + ABILITY[id].cd;
  if (manual) tutEvent(g, "ability");
  const boss = f.kind === "boss";
  const A = ABILITY_TUNE;
  if (id === "cleave") {
    const weak = boss && f.t < f.weakUntil;
    dealHit(g, A.cleave.mult * (weak ? A.cleave.weakMult : 1), weak ? "Cleave into the opening!" : "Cleave");
  }
  if (id === "haste") {
    p.hasteUntil = s.clock + A.haste.dur;
    g.tick("Haste.");
  }
  if (id === "ward") {
    p.ward = g.c.maxHp * A.ward.shield;
    p.wardUntil = s.clock + A.ward.dur;
    g.tick("Ward raised.");
  }
  if (id === "phase") {
    p.phaseUntil = s.clock + A.phase.dur;
    g.tick("Phase.");
  }
  if (id === "bury") {
    dealHit(g, A.bury.mult, "Bury");
    if (boss && f.cur && !f.cur.done && f.cur.type === "heal") {
      f.cur.done = true;
      f.cur.countered = true;
      f.stunUntil = f.t + A.bury.stun;
      f.countered++;
      g.tick(bossById(f.bossId!).moves[f.cur.move].countered ?? "Interrupted!", "crit");
    } else if (boss && f.cur && !f.cur.done && f.cur.type === "blast" && manual) {
      g.tick("Bury can't stop this. Shield or dodge it.");
    }
  }
}

function onTrashKill(g: Game) {
  const s = g.s, f = g.foe!, stage = s.stage;
  const foe = actForStage(stage).foes[f.key!];
  s.stats.kills++;
  const ess = essPerKill(stage) * (1 + g.c.ess / 100);
  s.ess += ess;
  s.lifeEss += ess;
  s.cm += stage * TUNE.cmPerKill * (foe.cm || 1);
  const raise = s.rit.raise.until > s.clock ? 1 + s.rit.raise.power : 1;
  if (!g.inTut() && g.rng() < TUNE.partChance * raise * (1 + g.c.drop / 100)) dropPart(g, foe.drop, stage, TUNE.rarityW);
  if (g.inTut()) tutKill(g);
  if (g.rng() < TUNE.dustChance * raise) s.dust++;
  if (g.rng() < TUNE.marrowChance * raise) {
    s.marrow++;
    g.tick("A Marrow Shard!");
  }
  g.pl!.hp = Math.min(g.c.maxHp, g.pl!.hp + g.c.maxHp * TUNE.healOnKill);
  s.kills++;
  if (s.kills >= TUNE.killsPerStage) {
    s.kills = 0;
    const next = stage + 1;
    if (stage === s.maxStage && next <= LAST_STAGE) {
      s.maxStage = next;
      g.story(next);
      if (isBossStage(next)) g.emit({ type: "bossReady" });
    }
    if (s.opt.push && stage < s.maxStage && !isBossStage(next)) s.stage = next;
    const boss = g.act().boss;
    if (s.opt.boss && s.maxStage >= boss.stage && s.stage === boss.stage - 1 && s.clock >= s.bossRetryAt) {
      startBoss(g);
      return;
    }
  }
  spawnTrash(g);
}

function onBossKill(g: Game) {
  const s = g.s, f = g.foe!;
  const b = bossById(f.bossId!);
  const rec = (s.bosses[b.id] ||= { kills: 0, thrall: false, tries: 0 });
  const first = rec.kills === 0;
  rec.kills++;
  const ess = essPerKill(b.stage) * TUNE.bossEssMult * (1 + g.c.ess / 100);
  s.ess += ess;
  s.lifeEss += ess;
  s.cm += TUNE.bossCm;
  const L = TUNE.bossLoot;
  s.marrow += L.marrow;
  s.dust += L.dust;
  const thread = g.rng() < L.threadChance;
  if (thread) s.thread++;
  g.log(`${b.name} falls in ${f.t.toFixed(1)} seconds. You collect ${L.marrow} Marrow Shards, ${L.dust} Grave Dust${thread ? " and a Spectral Thread" : ""}.`);
  if (first) {
    makePart(g, b.trophy, b.stage, "rare");
    g.log(b.firstClear[0], "brag");
    for (const line of b.firstClear.slice(1)) g.log(line, "story");
    if (b.stage + 1 <= LAST_STAGE) {
      s.maxStage = Math.max(s.maxStage, b.stage + 1);
      g.story(b.stage + 1);
    } else {
      g.log("The next act isn't built yet. Keep farming, and check back after the next update.", "story");
    }
  }
  for (let i = 0; i < L.parts; i++) {
    const pool = [...b.lootPool];
    if (b.lootBonus && g.rng() < b.lootBonus.chance) for (let k = 0; k < b.lootBonus.copies; k++) pool.push(b.lootBonus.base);
    dropPart(g, pool[Math.floor(g.rng() * pool.length)], b.stage, TUNE.bossRarityW);
  }
  if (!rec.thrall) {
    const ch = TUNE.thrallBase + TUNE.thrallPity * rec.tries;
    if (g.rng() < ch) {
      rec.thrall = true;
      g.log(`${b.name} rises again, bound to you. Thrall aura: ${b.thrall.text}. (${pct(ch)} chance)`, "brag");
    } else rec.tries++;
  }
  s.stage = b.stage - 1;
  s.kills = 0;
  s.bossRetryAt = s.clock + TUNE.bossRetryWin;
  newPlayer(g);
  spawnTrash(g);
}

function onDefeat(g: Game, enraged: boolean) {
  const s = g.s, f = g.foe!;
  if (f.kind === "boss") {
    const b = bossById(f.bossId!);
    s.stage = b.stage - 1;
    g.log(`${enraged ? b.enraged : b.defeat} Back to Stage ${s.stage}.`, "bad");
    s.bossRetryAt = s.clock + TUNE.bossRetryLoss;
  } else {
    const line = DEATH_LINES[Math.floor(g.rng() * DEATH_LINES.length)];
    g.log(line + (s.stage > 1 ? ` Back to Stage ${s.stage - 1}.` : ""), "bad");
    s.stage = Math.max(1, s.stage - 1);
  }
  s.kills = 0;
  newPlayer(g);
  spawnTrash(g);
}

function bossEvents(g: Game) {
  const f = g.foe!;
  const b = bossById(f.bossId!);
  for (const e of f.ev) {
    if (e.type === "weak") {
      if (!e.started && f.t >= e.at) {
        e.started = true;
        f.weakUntil = e.at + TUNE.weakSecs;
        f.cur = e;
        g.tick(b.moves[e.move].hit ?? "An opening!");
      }
      continue;
    }
    if (!e.started && f.t >= e.at) {
      e.started = true;
      f.cur = e;
      e.end = e.at + TUNE.telegraphSecs;
    }
    if (e.started && !e.done && f.t >= e.end) {
      e.done = true;
      if (e.type === "heal") {
        const h = f.max * TUNE.healPct;
        f.hp = Math.min(f.max, f.hp + h);
        f.healed += h;
        g.tick((b.moves[e.move].hit ?? "It heals {n} HP.").replace("{n}", fmt(h)));
      }
      if (e.type === "blast") hitPlayer(g, enemyHit(b.stage) * TUNE.blastMult, true);
    }
  }
  if (f.cur && (f.cur.type === "weak" ? f.t >= f.weakUntil : f.cur.done)) f.cur = null;
}

export function stepCombat(g: Game, dt: number) {
  const s = g.s;
  if (g.inTut() && s.tut < TUT_RUNNING_FROM) return;
  s.clock += dt;
  s.cm += cmRate(g) * dt;
  if (s.opt.rit) autoRituals(g);
  if (!g.foe) spawnTrash(g);
  if (!g.pl) newPlayer(g);
  g.refresh();
  const f = g.foe!, p = g.pl!, c = g.c;
  const boss = f.kind === "boss";
  if (boss) f.t += dt;
  if (s.opt.auto) {
    for (const a of c.abilities) {
      // on trash, shields and dodges wait until HP drops below 60% so they aren't wasted
      if (boss || !ABILITY[a].defensive || p.hp < c.maxHp * ABILITY_TUNE.autoDefensiveBelow) useAbility(g, a, false);
    }
  }
  const aps = c.aps * (p.hasteUntil > s.clock ? 1 + ABILITY_TUNE.haste.aps : 1);
  p.atk += dt;
  const iv = 1 / aps;
  while (p.atk >= iv) {
    p.atk -= iv;
    dealHit(g, 1);
  }
  f.hp -= c.poisonDps * dt * vulnerability(g);
  if (f.hp <= 0) {
    if (boss) onBossKill(g);
    else onTrashKill(g);
    return;
  }
  if (boss) {
    bossEvents(g);
    if (f.t >= TUNE.enrage) {
      onDefeat(g, true);
      return;
    }
  }
  const stunned = boss && f.t < f.stunUntil;
  if (!stunned) {
    f.atk += dt;
    if (f.atk >= f.int) {
      f.atk = 0;
      hitPlayer(g, f.dmg, false);
    }
  }
  if (!boss) p.hp = Math.min(c.maxHp, p.hp + c.maxHp * TUNE.regenPerSec * dt);
  if (p.hp <= 0) onDefeat(g, false);
}

/** pick a stage to fight on */
export function chooseStage(g: Game, stage: number) {
  if (stage > g.s.maxStage || isBossStage(stage)) return;
  g.s.stage = stage;
  g.s.kills = 0;
  newPlayer(g);
  spawnTrash(g);
}
