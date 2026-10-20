import { useEffect } from "react";
import { ABILITY, type AbilityId } from "../../content/abilities";
import { bossById } from "../../content/acts";
import { TUNE } from "../../content/tune";
import { chooseStage, startBoss, useAbility } from "../../engine/combat";
import { fmt, pct } from "../../engine/format";
import { hasCounterFor } from "../../engine/stats";
import { Bar } from "../common/Bar";
import { Panel } from "../common/Panel";
import { act, getGame, useGame } from "../runtime";
import { openModal } from "../uiStore";

export function challengeBoss() {
  act((g) => {
    if (!g.bossReady()) return;
    if (g.s.seen.bossLesson) startBoss(g);
    else openModal({ kind: "bossLesson" });
  });
}

const useAb = (id: AbilityId) => act((g) => useAbility(g, id, true));

/** keys 1 and 2 fire your two abilities */
function useAbilityKeys() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      const abs = getGame().c.abilities;
      if (e.key === "1" && abs[0]) useAb(abs[0]);
      if (e.key === "2" && abs[1]) useAb(abs[1]);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
}

function Telegraph() {
  const g = useGame();
  const f = g.foe!;
  const b = bossById(f.bossId!);
  const e = f.cur;
  const left = (until: number, span: number) => <Bar kind={e?.type === "weak" ? "" : "enrage"} value={(until - f.t) / span} />;
  if (e && e.type === "heal")
    return <div className="tele live"><span className="ct">Counter: Interrupt (Bury)</span><span>{b.moves[e.move].tele}</span>{left(e.end, TUNE.telegraphSecs)}</div>;
  if (e && e.type === "blast") {
    const noCounter = !hasCounterFor(g.c.abilities, "blast");
    return (
      <div className="tele live">
        <span className="ct">Counter: Shield (Ward) or Dodge (Phase)</span>
        <span>
          {b.moves[e.move].tele}
          {noCounter && <b> You can't block this yet. Brace for the hit and make sure your Max HP can take it.</b>}
        </span>
        {left(e.end, TUNE.telegraphSecs)}
      </div>
    );
  }
  if (e && e.type === "weak")
    return <div className="tele window"><span className="ct" style={{ color: "var(--good)" }}>Opening: Burst now (Cleave, Haste)</span><span>{b.moves[e.move].tele}</span>{left(f.weakUntil, TUNE.weakSecs)}</div>;
  if (f.t < f.stunUntil) return <div className="tele window"><span className="ct" style={{ color: "var(--good)" }}>Staggered</span><span>{b.stagger}</span></div>;
  return <div className="tele"><span className="faint">{b.idle}</span></div>;
}

export function CryptPanel() {
  useAbilityKeys();
  const g = useGame();
  const s = g.s, f = g.foe, p = g.pl, c = g.c;
  const actDef = g.act();
  const boss = f?.kind === "boss";
  const bdef = actDef.boss;
  const stages: number[] = [];
  for (let n = actDef.stages[0]; n < bdef.stage; n++) stages.push(n);
  const w = actDef.stageFoes[s.stage] || {};
  const tot = Object.values(w).reduce((a, b) => a + b, 0);
  const setOpt = (k: "push" | "auto" | "boss", v: boolean) => act((g) => (g.s.opt[k] = v));
  const shortName = bdef.name.replace(/^The /, "");

  return (
    <Panel id="crypt" title="Crypt" small={boss ? `Stage ${bdef.stage} · Boss` : `Stage ${s.stage} · kill ${s.kills + 1} of ${TUNE.killsPerStage}`}>
      <div className="block">
        <div className="stages" id="stages">
          {stages.map((n) => {
            const lock = n > s.maxStage;
            return (
              <button key={n} className={`stg ${n === s.stage && !boss ? "cur" : ""} ${lock ? "lock" : ""}`} disabled={lock} aria-label={`Stage ${n}`} onClick={() => act((g) => chooseStage(g, n))}>
                {n}
              </button>
            );
          })}
          <button className={`stg boss ${boss ? "cur" : ""} ${s.maxStage < bdef.stage ? "lock" : ""}`} disabled={s.maxStage < bdef.stage} onClick={challengeBoss}>
            {bdef.stage} · {shortName.split(" ").pop()}
          </button>
        </div>
        <div className="toggles">
          <label><input type="checkbox" id="optPush" checked={s.opt.push} onChange={(e) => setOpt("push", e.target.checked)} /> Push to next stage</label>
          <label><input type="checkbox" checked={s.opt.auto} onChange={(e) => setOpt("auto", e.target.checked)} /> Auto abilities</label>
          <label><input type="checkbox" checked={s.opt.boss} onChange={(e) => setOpt("boss", e.target.checked)} /> Auto-challenge {shortName.split(" ").pop()}</label>
        </div>
      </div>
      <div className={`fight ${boss ? "bossfight" : ""}`} id="fight">
        <div className="foe">
          <b>{f?.name ?? "…"}</b>
          <span className="num muted">{f ? `${fmt(Math.max(0, f.hp))} HP` : ""}</span>
        </div>
        <Bar tall kind="enemy" value={f ? f.hp / f.max : 1} />
        {boss && f && (
          <div className="block">
            <div className="row" style={{ fontSize: ".78rem" }}>
              <span className="muted">Enrage</span>
              <span className="num muted">{(TUNE.enrage - f.t).toFixed(1)}s</span>
            </div>
            <Bar kind="enrage" value={(TUNE.enrage - f.t) / TUNE.enrage} />
            <Telegraph />
          </div>
        )}
        <div className="abil" id="abil">
          {c.abilities.map((a, i) => {
            const left = p ? (p.cd[a] || 0) - s.clock : 0;
            const right = boss && f?.cur && ABILITY[a].counters === f.cur.type && !f.cur.done;
            return (
              <button key={a} className={`btn ${right && left <= 0 ? "right" : ""}`} id={"ab-" + a} disabled={left > 0} onClick={() => useAb(a)}>
                <b>{i + 1} · {ABILITY[a].name}</b>
                <span className="sub">{ABILITY[a].type}</span>
                <i className="cdfill" style={{ width: left > 0 ? (left / ABILITY[a].cd) * 100 + "%" : 0 }} />
              </button>
            );
          })}
        </div>
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
        <h3>{boss ? `How to beat the ${shortName}` : "Who lives here"}</h3>
        <div className="foes">
          {boss ? (
            <>
              <p style={{ margin: 0 }}>Kill him within {TUNE.enrage} seconds. Watch for his three moves:</p>
              <div className="row"><span>Tolls the bell (heals {pct(TUNE.healPct)})</span><span>Interrupt: Bury</span></div>
              <div className="row"><span>Raises his lantern (big blast)</span><span>Shield or Dodge: Ward, Phase</span></div>
              <div className="row"><span>Lantern gutters (takes +50%)</span><span>Burst: Cleave, Haste</span></div>
              <p className="faint" style={{ margin: 0 }}>Keys 1 and 2 use your abilities.</p>
            </>
          ) : (
            <>
              {Object.keys(w).map((k) => {
                const foe = actDef.foes[k];
                return (
                  <div className="row" key={k}>
                    <span>{foe.name} <span className="faint">{Math.round((w[k] / tot) * 100)}%</span></span>
                    <span>{actDef.bases[foe.drop].name}{foe.cm ? ", Corpse Mass" : ""}</span>
                  </div>
                );
              })}
              <p className="faint" style={{ margin: 0 }}>
                Each kill: {pct(TUNE.partChance)} part, {pct(TUNE.dustChance)} Grave Dust, {pct(TUNE.marrowChance)} Marrow Shard. Parts drop at item level {s.stage}.
              </p>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
