import { GENERATORS } from "../../content/generators";
import { RITUALS, type RitualId } from "../../content/rituals";
import { TUNE } from "../../content/tune";
import { altarPreview, buyGenerator, castRitual, cmRate, genCost, sacrifice } from "../../engine/economy";
import { fmt, mmss } from "../../engine/format";
import { tutFinish } from "../../engine/tutorial";
import { Info } from "../common/Info";
import { Panel } from "../common/Panel";
import { act, speed, useGame } from "../runtime";
import { openModal } from "../uiStore";

function Rituals() {
  const g = useGame();
  const s = g.s;
  return (
    <div className="block">
      <h3>Rituals</h3>
      <div className="rit" id="rituals">
        {RITUALS.map((r) => {
          const st = s.rit[r.id];
          const left = st.ready - s.clock;
          const active = st.until > s.clock;
          return (
            <button key={r.id} className={`btn ${left <= 0 ? "ready" : ""}`} id={"rit-" + r.id} disabled={left > 0} onClick={() => act((g) => castRitual(g, r.id as RitualId, false))}>
              <b>{r.name}</b>
              <span className="sub">{active ? `Active ${mmss(st.until - s.clock)}` : left > 0 ? `Ready in ${mmss(left)}` : r.short}</span>
            </button>
          );
        })}
      </div>
      <div className="toggles">
        <label><input type="checkbox" checked={s.opt.rit} onChange={(e) => act((g) => (g.s.opt.rit = e.target.checked))} /> Cast Rituals automatically (weaker)</label>
      </div>
    </div>
  );
}

function Generators() {
  const g = useGame();
  const s = g.s;
  return (
    <div className="block">
      <h3>Generators</h3>
      <div>
        {GENERATORS.map((gen) => {
          const n = s.gens[gen.id] || 0;
          if (gen.later) return <div key={gen.id} className="gen locked"><div>{gen.name}<div className="meta">{gen.bonusText} · {gen.later}</div></div><span /></div>;
          if (s.maxStage < gen.unlock) return <div key={gen.id} className="gen locked"><div>{gen.name}<div className="meta">Unlocks at Stage {gen.unlock}</div></div><span /></div>;
          const cost = genCost(gen, n);
          return (
            <div key={gen.id} className="gen">
              <div>
                {gen.name} <span className="num faint">×{n}</span>
                <div className="meta">{gen.rate} Corpse Mass/s · {gen.bonusText}</div>
              </div>
              <div className="row">
                <button className="btn small" id={"buy-" + gen.id} disabled={s.cm < cost} onClick={() => act((g) => buyGenerator(g, gen.id, false))}>{fmt(cost)}</button>
                <button className="btn small" disabled={s.cm < cost} onClick={() => act((g) => buyGenerator(g, gen.id, true))}>Max</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Altar() {
  const g = useGame();
  const pv = altarPreview(g);
  const enough = g.s.cm >= TUNE.altarMinCm;
  return (
    <div className="block">
      <h3 data-tip="x-altar" tabIndex={0}>Bone Altar<Info /></h3>
      <div className="row">
        <span>+{(pv.now * 100).toFixed(1)}% damage <span className="faint">({fmt(g.s.altar)} given)</span></span>
        <button className="btn small" disabled={!enough} onClick={() => act(sacrifice)}>Sacrifice half</button>
      </div>
      <div id="altarPrev">
        {enough ? (
          <><span className="faint">Sacrifice {fmt(pv.give)} now:</span> damage +{(pv.now * 100).toFixed(1)}% → <b className="up">+{(pv.after * 100).toFixed(1)}%</b>, DPS {fmt(pv.dps)} → <b className="up">{fmt(pv.dpsAfter)}</b></>
        ) : (
          <span className="faint">Needs at least {TUNE.altarMinCm} Corpse Mass.</span>
        )}
      </div>
    </div>
  );
}

function Log() {
  const log = useGame().s.log;
  return (
    <div className="block">
      <h3>Grimoire Log</h3>
      <div className="log" id="log">
        {log.map((l, i) => (
          <p key={l.t + ":" + i} className={l.cls}>
            <time>{new Date(l.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            {l.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function Settings() {
  const g = useGame();
  return (
    <details className="tools">
      <summary>Settings, saves and tester tools</summary>
      <div className="row">
        <label className="toggles"><input type="checkbox" checked={g.s.opt.sound} onChange={(e) => act((g) => (g.s.opt.sound = e.target.checked))} /> Sound when a boss is ready</label>
      </div>
      <div className="row">
        <button className="btn small" onClick={() => openModal({ kind: "saves" })}>Export or import save</button>
        {g.inTut() && <button className="btn small" onClick={() => act((g) => tutFinish(g, true))}>Skip the tutorial</button>}
      </div>
      <div className="row">
        <span className="muted">Game speed</span>
        {[1, 3, 10].map((v) => (
          <button key={v} className="btn small" onClick={() => act(() => (speed.value = v))}>{v}×</button>
        ))}
        <span className="num">{speed.value}×</span>
      </div>
      <div className="row">
        <button className="btn small" onClick={() => act((g) => { g.s.marrow += 10; g.s.dust += 10; g.s.thread += 10; g.log("Tester gift: 10 of each reagent."); })}>Give 10 of each reagent</button>
        <button className="btn small danger" onClick={() => openModal({ kind: "reset" })}>Start over</button>
      </div>
      <p className="faint" style={{ margin: "6px 0 0" }}>Progress saves in this browser every few seconds. Export your save to keep a backup. Speed and gifts are for testing only.</p>
    </details>
  );
}

export function GraveyardPanel() {
  const g = useGame();
  return (
    <Panel id="yard" title="Graveyard" small={`${fmt(cmRate(g))} Corpse Mass / s`}>
      <Rituals />
      <Generators />
      <Altar />
      <Log />
      <Settings />
    </Panel>
  );
}
