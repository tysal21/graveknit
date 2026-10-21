import { ABILITY, ABILITY_TUNE, type AbilityId, type BossMoveType } from "../content/abilities";
import { actForStage, isBossStage, LAST_STAGE } from "../content/acts";
import { DEATH_LINES } from "../content/act1";
import { TUNE } from "../content/tune";
import { TUT_RUNNING_FROM } from "../content/tutorial";
import type { BossDef, BossMoveDef, GuardianDef } from "../content/types";
import type { Stats } from "./stats";
import { fmt, pct } from "./format";
import type { Game } from "./game";
import { autoRituals, cmRate } from "./economy";
import { countRareLuck, dropPart, trashWeights } from "./stash";
import { tutEvent, tutKill } from "./tutorial";
import { pickWeighted } from "./rng";
import { bossById } from "../content/acts";
import { makePart } from "./parts";
import { BASES } from "../content/acts";

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
  kind: "trash" | "boss" | "guardian";
  key?: string;
  bossId?: string;
  /** a guardian's stage */
  gStage?: number;
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

/** the squad in a fight. HP, shields and dodges belong to the Vanguard, who takes every hit. */
export interface Player {
  hp: number;
  /** each squad member's attack timer */
  atk: number[];
  hasteUntil: number;
  wardUntil: number;
  ward: number;
  phaseUntil: number;
  /** when each ability is ready again, keyed by cdKey */
  cd: Record<string, number>;
}

/** cooldowns are per Abomination, so two Cleaves in a squad tick separately */
export const cdKey = (abom: number, id: AbilityId) => `${abom}:${id}`;

// ---- enemy numbers by stage ----
export const trashHp = (stage: number) => TUNE.hpBase * Math.pow(TUNE.hpGrow, stage - 1) + TUNE.hpPerStage * stage;
export const enemyHit = (stage: number) => TUNE.dmgBase * Math.pow(TUNE.dmgGrow, stage - 1);
export const essPerKill = (stage: number) => TUNE.essBase * Math.pow(TUNE.essGrow, stage - 1);
export const bossHp = (b: BossDef) => trashHp(b.stage) * (b.hpMult ?? TUNE.bossHpMult);

export function newPlayer(g: Game) {
  g.refresh();
  g.pl = { hp: g.c.maxHp, atk: g.s.squad.map(() => 0), hasteUntil: 0, wardUntil: 0, ward: 0, phaseUntil: 0, cd: {} };
}

export function spawnTrash(g: Game) {
  const s = g.s.stage;
  // the stage's last kill, the first time through, is its guardian
  const st = g.s;
  if (!g.inTut() && guardianFor(s) && !st.seen["g" + s] && s === st.maxStage && st.kills === TUNE.killsPerStage - 1) return startGuardian(g, s);
  const act = actForStage(s);
  const k = pickWeighted(g.rng, act.stageFoes[s]);
  const f = act.foes[k];
  const hp = trashHp(s) * f.hp;
  g.foe = { kind: "trash", key: k, name: f.name, hp, max: hp, dmg: enemyHit(s) * f.dmg, int: f.int, atk: 0, t: 0, ev: [], cur: null, weakUntil: -1, stunUntil: -1, healed: 0, countered: 0 };
}

/** the guardian that ends a stage the first time you clear it, if there is one */
export const guardianFor = (stage: number): GuardianDef | undefined => actForStage(stage).guardians?.[stage];

/** a boss's or guardian's moves and lines, for telegraphs and the log */
export function foeScript(f: Foe): { moves: Record<string, BossMoveDef>; idle: string; stagger: string } {
  if (f.kind === "guardian") {
    const gd = guardianFor(f.gStage!)!;
    return { moves: gd.move ? { move: gd.move } : {}, idle: gd.idle, stagger: `${gd.name} reels (+50% damage taken).` };
  }
  const b = bossById(f.bossId!);
  return { moves: b.moves, idle: b.idle, stagger: b.stagger };
}

/** guardians and bosses telegraph moves and can be staggered or exposed; trash can't */
export const isSpecial = (f: Foe) => f.kind !== "trash";

export function startGuardian(g: Game, stage: number) {
  const gd = guardianFor(stage)!;
  const f = actForStage(stage).foes[gd.foe];
  const ev: BossEvent[] = [];
  // the move repeats on a fixed rhythm so it's learnable
  if (gd.move) for (let at = gd.move.first; at < 120; at += gd.move.every) ev.push({ move: "move", type: gd.move.type, at, end: 0 });
  const hp = trashHp(stage) * gd.hp;
  g.foe = { kind: "guardian", key: gd.foe, gStage: stage, name: gd.name, hp, max: hp, dmg: enemyHit(stage) * gd.dmg, int: gd.int ?? f.int, atk: 0, t: 0, ev, cur: null, weakUntil: -1, stunUntil: -1, healed: 0, countered: 0 };
  g.log(gd.intro, "story");
  if (!g.s.seen.hGuardMeet && !g.s.hint) {
    g.s.seen.hGuardMeet = 1;
    g.s.hint = "guardMeet";
  }
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
  if (!isSpecial(f)) return 1;
  let m = 1;
  if (f.t < f.weakUntil) m += TUNE.weakBonus;
  if (f.t < f.stunUntil) m += TUNE.stunBonus;
  return m;
}

/** one hit from a squad member (the Vanguard unless `c` says otherwise) */
function dealHit(g: Game, mult: number, label?: string, c: Stats = g.c) {
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
    const mv = f.cur ? foeScript(f).moves[f.cur.move] : null;
    g.tick((mv?.hit ?? "The blast hits for {n}.").replace("{n}", fmt(d)));
  }
}

export function useAbility(g: Game, id: AbilityId, manual: boolean, abom = 0) {
  const f = g.foe, p = g.pl, s = g.s;
  const c = g.cs[abom];
  if (!f || !p || !c) return;
  if (!c.abilities.includes(id)) return;
  const key = cdKey(abom, id);
  if ((p.cd[key] || 0) > s.clock) return;
  p.cd[key] = s.clock + ABILITY[id].cd;
  if (manual) tutEvent(g, "ability");
  const boss = isSpecial(f);
  const A = ABILITY_TUNE;
  if (id === "cleave") {
    const weak = boss && f.t < f.weakUntil;
    dealHit(g, A.cleave.mult * (weak ? A.cleave.weakMult : 1), weak ? "Cleave into the opening!" : "Cleave", c);
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
    dealHit(g, A.bury.mult, "Bury", c);
    if (boss && f.cur && !f.cur.done && f.cur.type === "heal") {
      f.cur.done = true;
      f.cur.countered = true;
      f.stunUntil = f.t + A.bury.stun;
      f.countered++;
      g.tick(foeScript(f).moves[f.cur.move].countered ?? "Interrupted!", "crit");
    } else if (boss && f.cur && !f.cur.done && f.cur.type === "blast" && manual) {
      g.tick("Bury can't stop this. Shield or dodge it.");
    }
  }
}

/** a guardian pays out a guaranteed Magic part and a fat purse of Essence */
function onGuardianKill(g: Game) {
  const s = g.s, stage = g.foe!.gStage!;
  const gd = guardianFor(stage)!;
  s.seen["g" + stage] = 1;
  const ess = essPerKill(stage) * TUNE.guardianEssMult * (1 + g.bonus("ess") / 100);
  s.ess += ess;
  s.lifeEss += ess;
  s.marrow++;
  const p = dropPart(g, gd.drop, stage, { common: 0, magic: 1, rare: 0 });
  g.log(`${gd.name} falls. You collect ${fmt(ess)} Soul Essence, a Marrow Shard${p ? ` and a Magic ${BASES[gd.drop].name}` : ""}.`, "brag");
}

function onTrashKill(g: Game) {
  const s = g.s, f = g.foe!, stage = s.stage;
  const foe = actForStage(stage).foes[f.key!];
  if (f.kind === "guardian") onGuardianKill(g);
  s.stats.kills++;
  const ess = essPerKill(stage) * (1 + g.bonus("ess") / 100);
  s.ess += ess;
  s.lifeEss += ess;
  s.cm += stage * TUNE.cmPerKill * (foe.cm || 1);
  const raise = s.rit.raise.until > s.clock ? 1 + s.rit.raise.power : 1;
  if (!g.inTut() && g.rng() < TUNE.partChance * raise * (1 + g.bonus("drop") / 100)) countRareLuck(g, dropPart(g, foe.drop, stage, trashWeights(g)));
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
      openSquadSlots(g);
      if (isBossStage(next)) g.emit({ type: "bossReady" });
    }
    if (s.opt.push && stage < s.maxStage && !isBossStage(next)) s.stage = next;
    // a boss you've already beaten doesn't block pushing into the next act
    else if (s.opt.push && isBossStage(next) && s.maxStage > next && actForStage(next).boss.stage === next && g.bossCleared(actForStage(next).boss.id)) s.stage = next + 1;
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
  const ess = essPerKill(b.stage) * TUNE.bossEssMult * (1 + g.bonus("ess") / 100);
  s.ess += ess;
  s.lifeEss += ess;
  s.cm += TUNE.bossCm;
  const L = TUNE.bossLoot;
  s.marrow += L.marrow;
  s.dust += L.dust;
  const thread = g.rng() < L.threadChance;
  if (thread) s.thread++;
  const parts: number[] = [];
  g.log(`${b.name} falls in ${f.t.toFixed(1)} seconds. You collect ${L.marrow} Marrow Shards, ${L.dust} Grave Dust${thread ? " and a Spectral Thread" : ""}.`);
  if (first) {
    parts.push(makePart(g, b.trophy, b.stage, "rare").id);
    g.log(b.firstClear[0], "brag");
    for (const line of b.firstClear.slice(1)) g.log(line, "story");
    if (b.stage + 1 <= LAST_STAGE) {
      s.maxStage = Math.max(s.maxStage, b.stage + 1);
      g.story(b.stage + 1);
      openSquadSlots(g);
    } else {
      g.log("The next act isn't built yet. Keep farming, and check back after the next update.", "story");
    }
  }
  for (let i = 0; i < L.parts; i++) {
    const pool = [...b.lootPool];
    if (b.lootBonus && g.rng() < b.lootBonus.chance) for (let k = 0; k < b.lootBonus.copies; k++) pool.push(b.lootBonus.base);
    const p = dropPart(g, pool[Math.floor(g.rng() * pool.length)], b.stage, TUNE.bossRarityW);
    if (p) parts.push(p.id);
  }
  let bound = false;
  if (!rec.thrall) {
    const ch = TUNE.thrallBase + TUNE.thrallPity * rec.tries;
    if (g.rng() < ch) {
      rec.thrall = bound = true;
      g.log(`${b.name} rises again, bound to you. Thrall aura: ${b.thrall.text}. (${pct(ch)} chance)`, "brag");
    } else rec.tries++;
  }
  // the screen shows this as the victory pop-up (or a toast on repeat kills)
  g.emit({ type: "bossWin", win: { bossId: b.id, first, secs: f.t, ess, cm: TUNE.bossCm, marrow: L.marrow, dust: L.dust, thread, parts, thrall: bound } });
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
  } else if (f.kind === "guardian") {
    const gd = guardianFor(f.gStage!)!;
    g.log(`${gd.defeat} Back to Stage ${Math.max(1, s.stage - 1)}. Infuse, or stitch on a better part, then try again.`, "bad");
    s.stage = Math.max(1, s.stage - 1);
    if (!s.seen.hGuard && !s.hint) {
      s.seen.hGuard = 1;
      s.hint = "guard";
    }
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
  const b = foeScript(f);
  // a guardian's big hit scales off its own hits; a boss's off the stage
  const blast = f.kind === "boss" ? enemyHit(bossById(f.bossId!).stage) * TUNE.blastMult : f.dmg * TUNE.guardianBlastMult;
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
      if (e.type === "blast") hitPlayer(g, blast, true);
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
  const boss = isSpecial(f);
  if (boss) f.t += dt;
  if (s.opt.auto) {
    for (const { abom, id } of g.abilities()) {
      // on trash, shields and dodges wait until HP drops below 60% so they aren't wasted
      if (boss || !ABILITY[id].defensive || p.hp < c.maxHp * ABILITY_TUNE.autoDefensiveBelow) useAbility(g, id, false, abom);
    }
  }
  // every squad member attacks on its own timer; Haste speeds up the whole squad
  const haste = p.hasteUntil > s.clock ? 1 + ABILITY_TUNE.haste.aps : 1;
  g.cs.forEach((m, i) => {
    p.atk[i] = (p.atk[i] ?? 0) + dt;
    const iv = 1 / (m.aps * haste);
    while (p.atk[i] >= iv) {
      p.atk[i] -= iv;
      dealHit(g, 1, undefined, m);
    }
    f.hp -= m.poisonDps * dt * vulnerability(g);
  });
  if (f.hp <= 0) {
    if (f.kind === "boss") onBossKill(g);
    else onTrashKill(g);
    return;
  }
  if (boss) {
    bossEvents(g);
    if (f.kind === "boss" && f.t >= TUNE.enrage) {
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

/** open squad slots once you reach their stage; a new Abomination starts with no parts */
export function openSquadSlots(g: Game) {
  const s = g.s;
  const open = TUNE.squadSlots.filter((st) => s.maxStage >= st).length;
  let added = false;
  while (s.squad.length < open) {
    const n = s.squad.length + 1;
    s.squad.push({ name: SQUAD_NAMES[n - 1] ?? `Stitch No. ${n}`, eq: {}, infusion: 1 });
    g.log(`Squad slot ${n} opens. You lay out a fresh table and start on ${SQUAD_NAMES[n - 1] ?? "another one"}. It has no parts yet: stitch some on in the Squad panel.`, "brag");
    added = true;
  }
  if (added) {
    g.refresh();
    if (g.pl) g.pl.atk = s.squad.map((_, i) => g.pl!.atk[i] ?? 0);
  }
}

/** what each new squad member is called */
const SQUAD_NAMES = ["The First Stitch", "The Second Stitch", "The Third Stitch"];

/** put a squad member in front: the Vanguard takes every hit and gets Ward's shield */
export function makeVanguard(g: Game, abom: number) {
  const sq = g.s.squad;
  if (abom <= 0 || abom >= sq.length) return;
  const [a] = sq.splice(abom, 1);
  sq.unshift(a);
  g.log(`${a.name} steps to the front.`);
  newPlayer(g);
}

/** pick a stage to fight on */
export function chooseStage(g: Game, stage: number) {
  if (stage > g.s.maxStage || isBossStage(stage)) return;
  g.s.stage = stage;
  g.s.kills = 0;
  newPlayer(g);
  spawnTrash(g);
}
