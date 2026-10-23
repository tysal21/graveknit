import { ABILITY, ABILITY_TUNE, type AbilityId, type BossMoveType } from "../content/abilities";
import { actForStage, isBossStage, LAST_STAGE } from "../content/acts";
import { DEATH_LINES } from "../content/act1";
import { TUNE } from "../content/tune";
import { TUT_RUNNING_FROM } from "../content/tutorial";
import type { ActDef, AddsDef, BossDef, BossMoveDef, GuardianDef } from "../content/types";
import type { Stats } from "./stats";
import { fmt, pct } from "./format";
import type { Game } from "./game";
import { autoRituals, cmRate } from "./economy";
import { dropPart } from "./stash";
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

/** a summoned minion. While any live, its master takes 75% less damage and soaks no direct hits. */
export interface Add {
  name: string;
  hp: number;
  max: number;
  dmg: number;
  atk: number;
}

export interface Foe {
  kind: "trash" | "boss" | "guardian";
  /** a tougher normal enemy that pays more and drops a signature part */
  elite?: boolean;
  key?: string;
  bossId?: string;
  /** seconds left before it reaches you; nobody fights until then */
  walk?: number;
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
  /** summoned minions; empty for most fights */
  adds: Add[];
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
  /** how many times the Vanguard has struck this fight, so the screen can show each hit */
  swings: number;
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
  g.pl = { hp: g.c.maxHp, atk: g.s.squad.map(() => 0), hasteUntil: 0, wardUntil: 0, ward: 0, phaseUntil: 0, cd: {}, swings: 0 };
}

/** the stage you fall back to after a loss: one lower, stepping over boss stages (they have no normal enemies) */
export function stageBelow(stage: number) {
  let s = Math.max(1, stage - 1);
  while (s > 1 && isBossStage(s)) s--;
  return s;
}

/** a stage you can farm: never a boss stage, never past the furthest you've reached */
export const safeStage = (stage: number) => (isBossStage(stage) ? stageBelow(stage) : Math.max(1, stage));

export function spawnTrash(g: Game) {
  // a boss stage has no normal enemies; this once crashed the game after dying on Stage 11
  if (isBossStage(g.s.stage)) g.s.stage = stageBelow(g.s.stage);
  const s = g.s.stage;
  // the stage's last kill, the first time through, is its guardian
  const st = g.s;
  if (!g.inTut() && guardianFor(s) && !st.seen["g" + s] && s === st.maxStage && st.kills === TUNE.killsPerStage - 1) return startGuardian(g, s);
  const act = actForStage(s);
  const k = pickWeighted(g.rng, act.stageFoes[s]);
  const f = act.foes[k];
  const elite = rollElite(g, s);
  const hp = trashHp(s) * f.hp * (elite ? TUNE.eliteHp : 1);
  const name = elite ? `${act.elitePrefixes![Math.floor(g.rng() * act.elitePrefixes!.length)]} ${f.name}` : f.name;
  g.foe = { kind: "trash", elite, key: k, name, hp, max: hp, dmg: enemyHit(s) * f.dmg * (elite ? TUNE.eliteDmg : 1), int: f.int, atk: 0, t: 0, ev: [], cur: null, weakUntil: -1, stunUntil: -1, healed: 0, countered: 0, adds: [], walk: TUNE.walkIn };
}

/** Dust and Marrow fade by 15% for each stage past the first 2 below your best, down to a tenth */
export const reagentRate = (stage: number, maxStage: number) =>
  Math.max(TUNE.reagentFloor, Math.pow(TUNE.reagentFade, Math.max(0, maxStage - stage - TUNE.reagentNear)));

/** from Act 3 on, about 1 enemy in 150 near your best stage is an Elite */
function rollElite(g: Game, stage: number) {
  const s = g.s;
  if (g.inTut() || stage < TUNE.eliteFrom || stage < s.maxStage - TUNE.eliteNear || !actForStage(stage).elitePrefixes) return false;
  if (g.rng() >= TUNE.eliteChance) return false;
  if (!s.seen.hElite && !s.hint) {
    s.seen.hElite = 1;
    s.hint = "elite";
  }
  return true;
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
  g.foe = { kind: "guardian", key: gd.foe, gStage: stage, name: gd.name, hp, max: hp, dmg: enemyHit(stage) * gd.dmg, int: gd.int ?? f.int, atk: 0, t: 0, ev, cur: null, weakUntil: -1, stunUntil: -1, healed: 0, countered: 0, adds: [], walk: TUNE.walkIn };
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
  g.foe = { kind: "boss", bossId: b.id, name: b.name, hp, max: hp, dmg: enemyHit(b.stage) * TUNE.bossHitMult, int: TUNE.bossAtkInt, atk: 0, t: 0, ev, cur: null, weakUntil: -1, stunUntil: -1, healed: 0, countered: 0, adds: [] };
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

export const liveAdds = (f: Foe) => f.adds.filter((a) => a.hp > 0);

/** a master hiding behind living adds takes 75% less damage */
export const shielded = (f: Foe) => (f.adds.some((a) => a.hp > 0) ? 1 - TUNE.addShield : 1);

/** what a direct hit lands on: the first living add, or the enemy itself */
export const hitTarget = (f: Foe): { hp: number; max: number } => liveAdds(f)[0] ?? f;

/** The Last Torch: the Vanguard heals for a share of the squad's damage */
function leech(g: Game, d: number) {
  const share = Math.max(0, ...g.cs.map((c) => c.leech));
  if (share && g.pl) g.pl.hp = Math.min(g.c.maxHp, g.pl.hp + d * share);
}

/** one hit from a squad member (the Vanguard unless `c` says otherwise). Adds soak hits first; Sweeping splashes the rest */
function dealHit(g: Game, mult: number, label?: string, c: Stats = g.c) {
  const f = g.foe!;
  const crit = g.rng() < c.cc / 100;
  const raw = c.hit * mult * (crit ? 1 + c.cm / 100 : 1);
  const adds = liveAdds(f);
  let d: number;
  if (adds.length) {
    d = raw;
    adds[0].hp -= d;
    const splash = (raw * c.splash) / 100;
    if (splash > 0) {
      for (const a of adds.slice(1)) a.hp -= splash;
      f.hp -= splash * vulnerability(g) * shielded(f);
    }
    buryAdds(g);
  } else {
    d = raw * vulnerability(g);
    f.hp -= d;
  }
  leech(g, d);
  if (label || crit) g.tick(`${label ? label + " " : ""}${crit ? "Crit " : ""}${fmt(d)}`, crit ? "crit" : undefined);
  return d;
}

/** clear out dead adds, and say so when the last one falls */
function buryAdds(g: Game) {
  const f = g.foe!;
  if (!f.adds.length) return;
  const dead = f.adds.filter((a) => a.hp <= 0);
  if (!dead.length) return;
  f.adds = liveAdds(f);
  if (!f.adds.length) g.tick(`The last ${dead[0].name} falls. ${f.name} is exposed.`, "crit");
}

/** a summon move lands: its minions join the fight */
function summonAdds(g: Game, def: AddsDef) {
  const f = g.foe!;
  const stage = f.kind === "boss" ? bossById(f.bossId!).stage : f.gStage ?? g.s.stage;
  for (let i = 0; i < def.n; i++) {
    const hp = trashHp(stage) * def.hp;
    f.adds.push({ name: def.name, hp, max: hp, dmg: enemyHit(stage) * def.dmg, atk: i * 0.4 });
  }
  if (!g.s.seen.hAdds && !g.s.hint) {
    g.s.seen.hAdds = 1;
    g.s.hint = "adds";
  }
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
  if (id === "reap") {
    // a finisher: much stronger once the target (an add, or the enemy) is low
    const t = hitTarget(f);
    const low = t.hp / t.max < c.reapAt;
    dealHit(g, A.reap.mult * (low ? A.reap.finishMult : 1), low ? "Reap finishes it!" : "Reap", c);
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

/** an Elite pays 5× and always drops a signature part; sometimes a Thread or a unique too */
function onEliteKill(g: Game, base: string, stage: number) {
  const s = g.s, f = g.foe!;
  const p = dropPart(g, base, stage, TUNE.eliteRarityW, true);
  const thread = g.rng() < TUNE.eliteThread;
  if (thread) s.thread++;
  const extra = [p && `a signature ${p.rarity === "rare" ? "Rare" : "Magic"} ${BASES[base].name}`, thread && "a Spectral Thread"].filter(Boolean).join(" and ");
  g.log(`The ${f.name} falls${extra ? `, leaving ${extra}` : ""}.`, "brag");
  if (g.rng() < TUNE.uniqueElite) dropUnique(g, actForStage(stage), stage);
}

/** a named unique from this act, if it has any */
function dropUnique(g: Game, act: ActDef, ilvl: number) {
  const pool = Object.keys(act.bases).filter((k) => BASES[k].unique);
  if (!pool.length) return null;
  return dropPart(g, pool[Math.floor(g.rng() * pool.length)], ilvl, { common: 0, magic: 0, rare: 1 });
}

function onTrashKill(g: Game) {
  const s = g.s, f = g.foe!, stage = s.stage;
  const foe = actForStage(stage).foes[f.key!];
  if (f.kind === "guardian") onGuardianKill(g);
  s.stats.kills++;
  const pay = f.elite ? TUNE.elitePay : 1;
  const ess = essPerKill(stage) * (1 + g.bonus("ess") / 100) * pay;
  s.ess += ess;
  s.lifeEss += ess;
  s.cm += stage * TUNE.cmPerKill * (foe.cm || 1) * pay;
  if (f.elite) onEliteKill(g, foe.drop, stage);
  const raise = s.rit.raise.until > s.clock ? 1 + s.rit.raise.power : 1;
  if (!g.inTut() && g.rng() < TUNE.partChance * raise * (1 + g.bonus("drop") / 100)) dropPart(g, foe.drop, stage, TUNE.rarityW);
  if (g.inTut()) tutKill(g);
  const rg = raise * reagentRate(s.stage, s.maxStage);
  if (g.rng() < TUNE.dustChance * rg) s.dust++;
  if (g.rng() < TUNE.marrowChance * rg) {
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
  // Threads come from first kills only, so farming an old boss can't pile them up
  const thread = first;
  if (thread) s.thread += L.firstThreads;
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
  if (g.rng() < TUNE.uniqueBoss) {
    const u = dropUnique(g, actForStage(b.stage), b.stage);
    if (u) parts.push(u.id);
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
    s.stage = stageBelow(s.stage);
    g.log(`${gd.defeat} Back to Stage ${s.stage}. Infuse, or stitch on a better part, then try again.`, "bad");
    if (!s.seen.hGuard && !s.hint) {
      s.seen.hGuard = 1;
      s.hint = "guard";
    }
  } else {
    const line = DEATH_LINES[Math.floor(g.rng() * DEATH_LINES.length)];
    const back = stageBelow(s.stage);
    g.log(line + (back < s.stage ? ` Back to Stage ${back}.` : ""), "bad");
    s.stage = back;
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
      if (e.type === "summon") {
        summonAdds(g, b.moves[e.move].adds!);
        g.tick(b.moves[e.move].hit ?? "Minions rise.");
      }
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
  // the next enemy is still walking in: nobody swings, and the Vanguard gets its breath back
  if (f.walk) {
    f.walk = Math.max(0, f.walk - dt);
    p.hp = Math.min(c.maxHp, p.hp + c.maxHp * TUNE.regenPerSec * dt);
    return;
  }
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
      if (i === 0) p.swings++;
    }
    // poison spreads: it hits the enemy (less through a shield of adds) and every add at once
    f.hp -= m.poisonDps * dt * vulnerability(g) * shielded(f);
    for (const a of liveAdds(f)) a.hp -= m.poisonDps * dt;
    leech(g, m.poisonDps * dt);
  });
  buryAdds(g);
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
  // adds keep clawing at the Vanguard while their master is stunned
  for (const a of liveAdds(f)) {
    a.atk += dt;
    if (a.atk >= TUNE.addInt) {
      a.atk = 0;
      hitPlayer(g, a.dmg, false);
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
