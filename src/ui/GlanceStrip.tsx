import { useEffect } from "react";
import { RITUALS } from "../content/rituals";
import { TUNE } from "../content/tune";
import { TUT_STEPS, type PanelId } from "../content/tutorial";
import { canInfuse } from "../engine/economy";
import { fmt, mmss } from "../engine/format";
import { tutFinish } from "../engine/tutorial";
import { Icon } from "./art";
import { Info } from "./common/Info";
import { act, useGame } from "./runtime";
import { showTab } from "./uiStore";

export function Resources() {
  const s = useGame().s;
  return (
    <div className="res" id="res">
      <span className="c-cm" data-tip="r-cm" tabIndex={0}><Icon name="icon-cm" size={16} />Corpse Mass <b>{fmt(s.cm)}</b><Info /></span>
      <span className="c-ess" data-tip="r-ess" tabIndex={0}><Icon name="icon-ess" size={16} />Soul Essence <b>{fmt(s.ess)}</b><Info /></span>
      <span className="c-mar" data-tip="r-mar" tabIndex={0}><Icon name="icon-marrow" size={16} />Marrow <b>{s.marrow}</b><Info /></span>
      <span className="c-dust" data-tip="r-dust" tabIndex={0}><Icon name="icon-dust" size={16} />Dust <b>{s.dust}</b><Info /></span>
      <span className="c-thr" data-tip="r-thr" tabIndex={0}><Icon name="icon-thread" size={16} />Thread <b>{s.thread}</b><Info /></span>
    </div>
  );
}

export type Pill = { on: boolean; text: string; tab: PanelId; calm?: boolean };

/** the pills at the top that light up when something needs you */
export function usePills(): Pill[] {
  const g = useGame();
  const s = g.s;
  if (g.inTut()) return [];
  const boss = g.act().boss;
  const out: Pill[] = [];
  const ready = g.bossReady();
  const fighting = g.foe?.kind === "boss";
  const short = boss.name.replace(/^The /, "");
  const knit = g.bossReknitLeft();
  out.push({ on: ready, text: ready ? (g.bossCleared() ? `${short} ready to farm` : "(!) Boss ready") : fighting ? `Fighting the ${short}` : knit > 0 ? `${short} re-knits in ${mmss(knit)}` : `Boss at Stage ${boss.stage}`, tab: "crypt" });
  const rr = RITUALS.filter((r) => s.rit[r.id].ready <= s.clock).length;
  out.push({ on: rr > 0 && !s.opt.rit, text: rr ? `${rr} Ritual${rr > 1 ? "s" : ""} ready` : "Rituals cooling", tab: "yard" });
  const inf = g.s.squad.some((_, i) => canInfuse(g, i));
  out.push({ on: inf, text: inf ? "Can infuse" : "Infusion", tab: "squad" });
  const piling = s.marrow >= 8 || s.dust >= 20;
  out.push({ on: piling, text: piling ? "Reagents piling up" : "Reagents", tab: "stitch" });
  const lc = g.looseCount();
  if (lc >= TUNE.stashMax - 5) out.push({ on: true, text: lc >= TUNE.stashMax ? "Stash full" : "Stash almost full", tab: "stitch" });
  const fresh = s.parts.filter((p) => p.isNew && !g.isWorn(p)).length;
  out.push({ on: false, calm: fresh > 0, text: fresh ? `${fresh} new part${fresh > 1 ? "s" : ""}` : "No new parts", tab: "stitch" });
  return out;
}

export function GlanceStrip({ pills }: { pills: Pill[] }) {
  const g = useGame();
  const tut = g.inTut();
  const alert = pills.find((p) => p.on);
  const title = tut || !alert ? "Graveknit" : `(!) ${alert.text.replace("(!) ", "")} · Graveknit`;
  useEffect(() => {
    document.title = title;
  }, [title]);
  const act1 = g.act();
  return (
    <header className="glance">
      <div className="brand">
        Graveknit<small>{act1.name} · {act1.setting}</small>
      </div>
      <div className="pills" id="pills" aria-live="polite">
        {tut ? (
          <span className="tutbar">
            Learning the ropes · step {Math.max(1, g.s.tut)} of {TUT_STEPS}
            <button className="pill" onClick={() => act((g) => tutFinish(g, true))}>Skip the tutorial</button>
          </span>
        ) : (
          pills.map((p, i) => (
            <button key={i} className={`pill ${p.on ? "on" : p.calm ? "calm" : ""}`} onClick={() => showTab(p.tab)}>
              {p.text}
            </button>
          ))
        )}
      </div>
      {(!tut || g.s.tut >= 4) && <Resources />}
    </header>
  );
}
