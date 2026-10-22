import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ABILITY, COUNTER_TEXT, type AbilityId } from "../../content/abilities";
import { ACTS, BASES } from "../../content/acts";
import { TUNE } from "../../content/tune";
import { cdKey, reagentRate, chooseStage, foeScript, guardianFor, isSpecial, liveAdds, startBoss, useAbility, type Foe } from "../../engine/combat";
import { lessonKey } from "../../engine/tutorial";
import { fmt, pct } from "../../engine/format";
import { hasCounterFor } from "../../engine/stats";
import { Bar } from "../common/Bar";
import { foeTier } from "../common/tier";
import { arrivalCue } from "../sound";
import { Info } from "../common/Info";
import { abomArt, foeArt, Icon, stageBackground } from "../art";
import { Panel } from "../common/Panel";
import { act, getGame, useGame } from "../runtime";
import { openModal, SLAIN_MS, ui } from "../uiStore";

export function challengeBoss() {
  act((g) => {
    if (!g.bossReady()) return;
    if (g.s.seen[lessonKey(g.act().boss.id)]) startBoss(g);
    else openModal({ kind: "bossLesson" });
  });
}

const useAb = (id: AbilityId, abom: number) => act((g) => useAbility(g, id, true, abom));

/** keys 1 to 4 fire the squad's abilities, in the order the buttons show */
function useAbilityKeys() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      const a = getGame().abilities()[+e.key - 1];
      if (a) useAb(a.id, a.abom);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
}

/** the fight as a picture: your Vanguard on the left, the enemy on the right, the place behind them.
 *  Stages without art (Acts 2 and 3 for now) keep the text-only look. */
function Scene() {
  const g = useGame();
  const f = g.foe;
  const foe = foeArt(f);
  const bg = stageBackground(f?.kind === "boss" ? g.act().boss.stage : g.s.stage);
  if (!foe && !bg) return null;
  const me = abomArt(g, g.s.squad[0]);
  return (
    <div className="scene" style={bg ? { backgroundImage: `url(${bg})` } : undefined}>
      <div className="me">
        <img src={me.src} alt="" />
        {me.glow && <i className="core-glow" style={{ "--glow": me.glow } as CSSProperties} />}
      </div>
      {foe && <img className="foe-sprite" src={foe} alt="" />}
    </div>
  );
}

const ARRIVAL_MS = 1800;

/** a banner that sweeps across the fight when a guardian, Elite or boss shows up */
function Arrival() {
  const g = useGame();
  const f = g.foe;
  const last = useRef<Foe | null>(f);
  const [shown, setShown] = useState<{ line: string; name: string; tier: string; at: number } | null>(null);
  useEffect(() => {
    if (f === last.current) return;
    last.current = f;
    const t = foeTier(f);
    if (!f || !t.arrival) return;
    setShown({ line: t.arrival, name: f.name, tier: t.id, at: Date.now() });
    if (g.s.opt.sound) arrivalCue(t.id);
  });
  if (!shown || Date.now() - shown.at > ARRIVAL_MS) return null;
  return (
    <div className={`arrival a-${shown.tier}`} aria-live="polite">
      <small>{shown.line}</small>
      <b>{shown.name}</b>
    </div>
  );
}

function Telegraph() {
  const g = useGame();
  const f = g.foe!;
  const b = foeScript(f);
  const e = f.cur;
  const left = (until: number, span: number) => <Bar kind={e?.type === "weak" ? "" : "enrage"} value={(until - f.t) / span} />;
  if (e && e.type === "heal")
    return <div className="tele live"><span className="ct">Counter: {COUNTER_TEXT.heal}</span><span>{b.moves[e.move].tele}</span>{left(e.end, TUNE.telegraphSecs)}</div>;
  if (e && e.type === "blast") {
    const noCounter = !hasCounterFor(g.abilities().map((a) => a.id), "blast");
    return (
      <div className="tele live">
        <span className="ct">Counter: {COUNTER_TEXT.blast}</span>
        <span>
          {b.moves[e.move].tele}
          {noCounter && <b> You can't block this yet. Brace for the hit and make sure your Max HP can take it.</b>}
        </span>
        {left(e.end, TUNE.telegraphSecs)}
      </div>
    );
  }
  if (e && e.type === "summon")
    return <div className="tele live"><span className="ct">Counter: {COUNTER_TEXT.summon}</span><span>{b.moves[e.move].tele}</span>{left(e.end, TUNE.telegraphSecs)}</div>;
  if (e && e.type === "weak")
    return <div className="tele window"><span className="ct" style={{ color: "var(--good)" }}>Opening: {COUNTER_TEXT.weak}</span><span>{b.moves[e.move].tele}</span>{left(f.weakUntil, TUNE.weakSecs)}</div>;
  if (f.t < f.stunUntil) return <div className="tele window"><span className="ct" style={{ color: "var(--good)" }}>Staggered</span><span>{b.stagger}</span></div>;
  return <div className="tele"><span className="faint">{b.idle}</span></div>;
}

/** summoned adds under the enemy's bar: each one's HP, and the shield they give their master */
function Adds() {
  const f = useGame().foe!;
  const adds = liveAdds(f);
  if (!adds.length) return null;
  return (
    <div className="adds" id="adds">
      <span className="shieldnote">Shielded by {adds.length} {adds[0].name}{adds.length > 1 ? "s" : ""}: takes {Math.round(TUNE.addShield * 100)}% less damage, and your hits go to them first.</span>
      {adds.map((a, i) => (
        <div key={i}>
          <div className="row"><span>{a.name}</span><span className="num muted">{fmt(Math.max(0, a.hp))} HP</span></div>
          <Bar kind="enemy" value={a.hp / a.max} />
        </div>
      ))}
    </div>
  );
}

/** "How to beat" rows for a boss or guardian, built from its moves */
function MoveList() {
  const g = useGame();
  const f = g.foe!;
  const sc = foeScript(f);
  const timed = f.kind === "boss";
  const them = f.kind === "boss" ? g.act().boss.them : "it";
  return (
    <>
      <p style={{ margin: 0 }}>{timed ? `Kill ${them} within ${TUNE.enrage} seconds. Watch for ${them === "him" ? "his" : "its"} moves:` : Object.keys(sc.moves).length ? "No time limit, but watch for its move:" : "No time limit and no tricks. It just has a lot of HP and hits hard."}</p>
      {Object.values(sc.moves).map((m, i) => (
        <div className="row" key={i}><span>{m.short}</span><span>{COUNTER_TEXT[m.type]}</span></div>
      ))}
      <p className="faint" style={{ margin: 0 }}>Keys 1 to {Math.max(2, g.abilities().length)} use your abilities.</p>
    </>
  );
}

export function CryptPanel() {
  useAbilityKeys();
  const g = useGame();
  const s = g.s, f = g.foe, p = g.pl;
  const actDef = g.act();
  const boss = f?.kind === "boss";
  const special = !!f && isSpecial(f);
  const tier = foeTier(f);
  const bdef = actDef.boss;
  // which act's stages the picker shows; follows the current act unless you browse
  const [viewN, setViewN] = useState<number | null>(null);
  const shown = ACTS.find((a) => a.n === viewN) ?? actDef;
  const openActs = ACTS.filter((a) => s.maxStage >= a.stages[0]);
  const stages: number[] = [];
  for (let n = shown.stages[0]; n < shown.boss.stage; n++) stages.push(n);
  const abilities = g.abilities();
  const many = s.squad.length > 1;
  const w = actDef.stageFoes[s.stage] || {};
  const tot = Object.values(w).reduce((a, b) => a + b, 0);
  const setOpt = (k: "push" | "auto" | "boss" | "bossPop", v: boolean) => act((g) => (g.s.opt[k] = v));
  const shortName = bdef.name.replace(/^The /, "");

  return (
    <Panel id="crypt" title="Crypt" small={boss ? `Stage ${bdef.stage} · Boss` : `Stage ${s.stage} · kill ${s.kills + 1} of ${TUNE.killsPerStage}`}>
      <div className="block">
        {openActs.length > 1 && (
          <div className="actpick">
            {openActs.map((a) => (
              <button key={a.n} className={a === shown ? "on" : ""} onClick={() => setViewN(a.n)}>{a.name}</button>
            ))}
          </div>
        )}
        <div className="stages" id="stages">
          {stages.map((n) => {
            const lock = n > s.maxStage;
            return (
              <button key={n} className={`stg ${n === s.stage && !boss ? "cur" : ""} ${lock ? "lock" : ""}`} disabled={lock} aria-label={`Stage ${n}`} title={guardianFor(n) && !s.seen["g" + n] ? `${guardianFor(n)!.name} guards the end of this stage` : undefined} onClick={() => { act((g) => chooseStage(g, n)); setViewN(null); }}>
                {n}
                {guardianFor(n) && !s.seen["g" + n] && !lock && <i className="stg-mark" aria-hidden="true">☠</i>}
              </button>
            );
          })}
          {shown === actDef ? (
            <button className={`stg boss ${boss ? "cur" : ""} ${s.maxStage < bdef.stage ? "lock" : ""}`} disabled={s.maxStage < bdef.stage} onClick={challengeBoss}>
              <span className="crown" aria-hidden="true">♛</span> {bdef.stage} · {shortName.split(" ").pop()}
            </button>
          ) : (
            <button className="stg boss lock" disabled title="Go to one of this act's stages to fight its boss">
              {shown.boss.stage} · {shown.boss.name.replace(/^The /, "").split(" ").pop()}
            </button>
          )}
        </div>
        <div className="toggles">
          <label><input type="checkbox" id="optPush" checked={s.opt.push} onChange={(e) => setOpt("push", e.target.checked)} /> Push to next stage</label>
          <label><input type="checkbox" checked={s.opt.auto} onChange={(e) => setOpt("auto", e.target.checked)} /> Auto abilities</label>
          <label><input type="checkbox" checked={s.opt.boss} onChange={(e) => setOpt("boss", e.target.checked)} /> Auto-challenge {shortName.split(" ").pop()}</label>
          {g.bossCleared() && <label title="First kills and new Thralls always show it. Otherwise repeat kills get a small note in the corner."><input type="checkbox" checked={s.opt.bossPop} onChange={(e) => setOpt("bossPop", e.target.checked)} /> Victory pop-up every kill</label>}
        </div>
      </div>
      <div className={`fight tier-${tier.id} ${special ? "bossfight" : ""}`} id="fight">
        {tier.label && <div className={`rank r-${tier.id}`}>{tier.label}</div>}
        <div className="foe">
          <b>{f?.name ?? "…"}</b>
          <span className="num muted">{f ? `${fmt(Math.max(0, f.hp))} HP` : ""}</span>
        </div>
        <Scene />
        <Bar tall kind={`enemy ${tier.id}`} value={f ? f.hp / f.max : 1} />
        {f && <Adds />}
        {f?.elite && <div className="faint" style={{ fontSize: ".78rem" }}>Elite · pays {TUNE.elitePay}× and drops a signature part</div>}
        {special && f && (
          <div className="block">
            {boss && (
              <>
                <div className="row" style={{ fontSize: ".78rem" }}>
                  <span className="muted">Enrage</span>
                  <span className="num muted">{(TUNE.enrage - f.t).toFixed(1)}s</span>
                </div>
                <Bar kind="enrage" value={(TUNE.enrage - f.t) / TUNE.enrage} />
              </>
            )}
            {!boss && <div className="faint" style={{ fontSize: ".78rem" }}>Stage guardian · drops a Magic part</div>}
            <Telegraph />
          </div>
        )}
        <div className="abil" id="abil">
          {abilities.map(({ abom, id: a }, i) => {
            const left = p ? (p.cd[cdKey(abom, a)] || 0) - s.clock : 0;
            const right = special && f?.cur && ABILITY[a].counters === f.cur.type && !f.cur.done;
            return (
              <button key={abom + a} className={`btn iconed ${right && left <= 0 ? "right" : ""}`} id={abom ? `ab-${a}-${abom + 1}` : "ab-" + a} disabled={left > 0} onClick={() => useAb(a, abom)}>
                <Icon name={"ab-" + a} />
                <b>{i + 1} · {ABILITY[a].name}{many && <span className="who">#{abom + 1}</span>}</b>
                <span className="sub">{ABILITY[a].type}</span>
                <i className="cdfill" style={{ width: left > 0 ? (left / ABILITY[a].cd) * 100 + "%" : 0 }} />
              </button>
            );
          })}
        </div>
        <Arrival />
        {ui.slain && Date.now() - ui.slain.at < SLAIN_MS + 400 && <div className="slain" aria-hidden="true">Slain</div>}
        <div className="ticker">
          {g.ticker.map((t, i) => (
            <div key={i} className={t.cls}>{t.text}</div>
          ))}
        </div>
      </div>
      {g.bossReady() && (
        <button className="btn primary" id="bossBtn" onClick={challengeBoss}>
          {g.bossCleared() ? `Fight ${bdef.name.replace(/^The /, "the ")} again` : `Challenge ${bdef.name.replace(/^The /, "the ")}`}
        </button>
      )}
      <div className="block">
        <h3>{special ? `How to beat ${f!.name.replace(/^The /, "the ")}` : "Who lives here"}</h3>
        <div className="foes">
          {special ? (
            <MoveList />
          ) : (
            <>
              {Object.keys(w).map((k) => {
                const foe = actDef.foes[k];
                return (
                  <div className="row" key={k}>
                    <span>{foe.name} <span className="faint">{Math.round((w[k] / tot) * 100)}%</span></span>
                    <span>{BASES[foe.drop].name}{foe.cm ? ", Corpse Mass" : ""}</span>
                  </div>
                );
              })}
              <p className="faint" style={{ margin: 0 }}>
                Each kill: {pct(TUNE.partChance)} part, {pct(TUNE.dustChance * reagentRate(s.stage, s.maxStage))} Grave Dust, {pct(TUNE.marrowChance * reagentRate(s.stage, s.maxStage))} Marrow Shard
                {reagentRate(s.stage, s.maxStage) < 1 && <span className="down"> (×{reagentRate(s.stage, s.maxStage).toFixed(2)}: {s.maxStage - s.stage} below your best)</span>}. Parts drop at item level {s.stage}.{" "}
                <span data-tip="x-rare" tabIndex={0}>Rare: <b className="tc-rare">{pct(TUNE.rarityW.rare / (TUNE.rarityW.common + TUNE.rarityW.magic + TUNE.rarityW.rare))}</b> of parts<Info /></span>
                {actDef.elitePrefixes && <> <span data-tip="x-elite" tabIndex={0}>Elites: <b className="tc-elite">1 in {Math.round(1 / TUNE.eliteChance)}</b> kills<Info /></span></>}
              </p>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
