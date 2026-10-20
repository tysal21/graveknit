import { useState } from "react";
import { AFFIX, affixShortName } from "../../content/affixes";
import { TUNE } from "../../content/tune";
import { donors, graft, graftIsBetter, graftResult, graftSlots } from "../../engine/crafting";
import type { Game } from "../../engine/game";
import { affixValue, partName, rarityClass } from "../../engine/parts";
import type { Affix, Part } from "../../engine/state";
import { calc } from "../../engine/stats";
import { Modal } from "../common/Modal";
import { act, useGame } from "../runtime";
import { closeModal, setUi } from "../uiStore";

function Delta({ g, from, to }: { g: Game; from: Part; to: Part }) {
  const a = calc(g, { swap: from, ignoreBuffs: true }), b = calc(g, { swap: to, ignoreBuffs: true });
  const f = (x: number, y: number, l: string) => {
    const d = (y - x) / x;
    return Math.abs(d) < 0.005 ? null : <span className={d > 0 ? "up" : "down"}>{d > 0 ? "+" : ""}{Math.round(d * 100)}% {l} </span>;
  };
  const parts = [f(a.dps, b.dps, "dps"), f(a.maxHp, b.maxHp, "hp")].filter(Boolean);
  return parts.length ? <>{parts}</> : <span className="faint">no change to dps or hp</span>;
}

function AffixLine({ a, part }: { a: Affix; part: Part }) {
  return <><span className={`tb t${a.t}`}>T{a.t}</span> {AFFIX[a.k].fmt(affixValue(a, part.ilvl))} <span className="faint">{AFFIX[a.k].name}</span></>;
}

type Hover = { kind: "donor"; id: number } | { kind: "dA"; i: number } | { kind: "tA"; i: number } | null;

/** "What you'd get": previews the finished part before you commit */
function Preview({ g, t, donor, dA, tA, hover }: { g: Game; t: Part; donor: Part | undefined; dA: number | null; tA: number | null; hover: Hover }) {
  const d = hover?.kind === "donor" ? g.partById(hover.id) : donor;
  const da = hover?.kind === "dA" ? hover.i : hover?.kind === "donor" ? null : dA;
  const ta = hover?.kind === "tA" ? hover.i : hover?.kind === "donor" || hover?.kind === "dA" ? null : tA;
  const head = <h3>What you'd get</h3>;
  if (!d) return <>{head}<p className="faint" style={{ margin: 0 }}>Hover over a donor to preview the result.</p></>;
  if (da === null || (hover?.kind === "donor" && d !== donor)) {
    return (
      <>
        {head}
        <p className="muted" style={{ margin: 0 }}>From <span className={`tc-${rarityClass(d)}`}>{partName(d)}</span>, each affix could become:</p>
        {d.affixes.map((a, k) => {
          const best = graftSlots(t, a).map((i) => ({ i, c: graftResult(t, a, i) })).sort((x, y) => calc(g, { swap: y.c, ignoreBuffs: true }).dps - calc(g, { swap: x.c, ignoreBuffs: true }).dps)[0];
          if (!best) return null;
          return (
            <div className="af" key={k}>
              <span className={`tb t${a.t}`}>T{a.t}</span>
              <span>{AFFIX[a.k].fmt(affixValue(a, t.ilvl))} <span className="faint">replacing {affixShortName(t.affixes[best.i].k)}</span></span>
              <span style={{ fontSize: ".78rem" }}><Delta g={g} from={t} to={best.c} /></span>
            </div>
          );
        })}
      </>
    );
  }
  const a = d.affixes[da];
  const slots = graftSlots(t, a);
  const i = ta !== null && slots.includes(ta) ? ta : slots.length === 1 ? slots[0] : null;
  if (i === null)
    return <>{head}<p className="muted" style={{ margin: 0 }}>{AFFIX[a.k].fmt(affixValue(a, t.ilvl))} can replace {slots.map((j) => affixShortName(t.affixes[j].k)).join(" or ")}. Hover over one below to see the result.</p></>;
  const c = graftResult(t, a, i);
  return (
    <>
      {head}
      <div className={`tc-${rarityClass(c)}`} style={{ fontFamily: "var(--display)", fontSize: "1.05rem" }}>{partName(c)}</div>
      <div className="afx">
        {c.affixes.map((x, k) => (
          <div className="af" key={k}>
            <span className={`tb t${x.t}`}>T{x.t}</span>
            <span className={k === i ? (graftIsBetter(t.affixes[k], x) ? "up" : "down") : ""}>
              {AFFIX[x.k].fmt(affixValue(x, c.ilvl))}
              {k === i && <span className="faint"> (was {AFFIX[t.affixes[k].k].fmt(affixValue(t.affixes[k], t.ilvl))})</span>}
            </span>
            <span />
          </div>
        ))}
      </div>
      <div style={{ fontSize: ".85rem" }}>If worn: <Delta g={g} from={t} to={c} /></div>
    </>
  );
}

export function GraftModal({ targetId }: { targetId: number }) {
  const g = useGame();
  const [donorId, setDonor] = useState<number | null>(null);
  const [dA, setDA] = useState<number | null>(null);
  const [tA, setTA] = useState<number | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const t = g.partById(targetId);
  if (!t) return null;
  const ds = donors(g, t);
  const d = g.partById(donorId);
  const hv = (h: Hover) => ({ onMouseEnter: () => setHover(h), onMouseLeave: () => setHover(null) });
  const go = () => {
    if (!d || dA === null || tA === null) return;
    let ok = false;
    act((g) => (ok = graft(g, t, d, dA, tA)));
    if (ok) setUi({ flash: { id: t.id, f: { [tA]: "up" }, at: Date.now() } });
    closeModal();
  };
  const dupe = d && dA !== null ? graftSlots(t, d.affixes[dA]) : [];
  return (
    <Modal>
      <h2>Graft</h2>
      <p className="muted" style={{ margin: 0 }}>
        Move one affix from a donor part onto <b className={`tc-${rarityClass(t)}`}>{partName(t)}</b>. The donor is destroyed. Costs {TUNE.graftMarrow} Marrow Shards and {TUNE.graftDust} Grave Dust. Guaranteed.
      </p>
      <h3>1. Donor</h3>
      <div className="pick">
        {ds.map((x) => (
          <button key={x.id} className={`btn ${donorId === x.id ? "on" : ""}`} {...hv({ kind: "donor", id: x.id })} onClick={() => { setDonor(x.id); setDA(null); setTA(null); }}>
            <span className={`tc-${rarityClass(x)}`}>{partName(x)}</span> <span className="faint">i{x.ilvl}</span>{" "}
            {x.affixes.map((a, i) => <span key={i} className={`tb t${a.t}`}>T{a.t}</span>)}
          </button>
        ))}
      </div>
      {d && (
        <>
          <h3>2. Affix to take</h3>
          <div className="pick">
            {d.affixes.map((a, i) => (
              <button key={i} className={`btn ${dA === i ? "on" : ""}`} {...hv({ kind: "dA", i })} onClick={() => { setDA(i); setTA(null); }}>
                <AffixLine a={a} part={d} />
              </button>
            ))}
          </div>
        </>
      )}
      {d && dA !== null && (
        <>
          <h3>3. Affix it replaces</h3>
          <div className="pick">
            {t.affixes.map((a, i) => dupe.includes(i) && (
              <button key={i} className={`btn ${tA === i ? "on" : ""}`} {...hv({ kind: "tA", i })} onClick={() => setTA(i)}>
                <AffixLine a={a} part={t} />
              </button>
            ))}
          </div>
        </>
      )}
      <div className="gprev" id="gprev">
        <Preview g={g} t={t} donor={d} dA={dA} tA={tA} hover={hover} />
      </div>
      <div className="row">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn primary" disabled={tA === null} onClick={go}>Graft it</button>
      </div>
    </Modal>
  );
}
