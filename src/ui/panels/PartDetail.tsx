import { ABILITY } from "../../content/abilities";
import { AFFIX } from "../../content/affixes";
import { BASES } from "../../content/acts";
import { slotName } from "../../content/slots";
import { IMPLICIT_TEXT } from "../../content/stats";
import { TUNE } from "../../content/tune";
import { canCraft, canGraft, canRestitch, dust, equip, marrow, pressMarrow, restitch, restitchCost, toggleLock, type Flash } from "../../engine/crafting";
import { fmt, pct } from "../../engine/format";
import { affixRange, affixValue, rollQuality, isKept, isTrophy, partCM, partIntegrity, partName, rarityClass, rarityLabel, tierOdds } from "../../engine/parts";
import { renderPart } from "../../engine/stash";
import type { Part } from "../../engine/state";
import { calc } from "../../engine/stats";
import { act, useGame } from "../runtime";
import { openModal, selAbom, setUi, ui } from "../uiStore";

function flashAfter(f: Flash | null, id: number) {
  if (f) setUi({ flash: { id, f, at: Date.now() } });
}

export function PartDetail({ part: p }: { part: Part }) {
  const g = useGame();
  const s = g.s;
  const b = BASES[p.base];
  const worn = g.isWorn(p);
  const ab = selAbom(s.squad.length);
  const many = s.squad.length > 1;
  const wearer = s.squad.find((a) => a.eq[b.slot] === p.id);
  // worn, but by a different Abomination than the one you're stitching onto
  const onOther = !!wearer && wearer !== s.squad[ab];
  const fl = ui.flash && ui.flash.id === p.id && Date.now() - ui.flash.at < 1500 ? ui.flash.f : {};
  const craftable = canCraft(p);
  const odds = tierOdds(p.ilvl);
  const lockedTiers = [1, 2, 3, 4, 5].filter((t) => p.ilvl < TUNE.tierIlvl[t]).map((t) => `T${t} at i${TUNE.tierIlvl[t]}`).join(", ");
  let cmp = null;
  if (!worn || onOther) {
    const a = calc(g, { abom: ab, ignoreBuffs: true }), c2 = calc(g, { abom: ab, swap: p, ignoreBuffs: true });
    cmp = (
      <div className="cmp">
        <span>DPS {fmt(a.dps)} → <b className={c2.dps >= a.dps ? "up" : "down"}>{fmt(c2.dps)}</b></span>
        <span>HP {fmt(a.maxHp)} → <b className={c2.maxHp >= a.maxHp ? "up" : "down"}>{fmt(c2.maxHp)}</b></span>
        <span>Infusion cap {a.cap} → <b className={c2.cap >= a.cap ? "up" : "down"}>{c2.cap}</b></span>
      </div>
    );
  }
  const kept = isKept(p), trophy = isTrophy(p);
  const rs = restitchCost(g, p);
  return (
    <div className={`card r-${rarityClass(p)}`}>
      <div>
        <div className={`title tc-${rarityClass(p)}`}>{partName(p)}</div>
        <div className="sub">
          {rarityLabel(p)} {slotName(b.slot)} · item level {p.ilvl} · Integrity {partIntegrity(p).toFixed(1)}
          {worn ? (many && wearer ? ` · worn by ${wearer.name}` : " · worn") : ""}
        </div>
      </div>
      <div className="impl">
        {b.imp.map(([st, f]) => IMPLICIT_TEXT[st](f(p.ilvl))).join(" · ")}
        {b.ab && <> · Ability: <b>{ABILITY[b.ab].name}</b> ({ABILITY[b.ab].type})</>}
      </div>
      <div className="afx">
        {p.affixes.length ? (
          p.affixes.map((a, i) => (
            <div key={i} className={`af ${fl[i] ? "flash-" + fl[i] : ""}`}>
              <span className={`tb t${a.t}`}>T{a.t}</span>
              <span>
                {AFFIX[a.k].fmt(affixValue(a, p.ilvl))} <span className={`q ${rollQuality(a.roll).cls}`}>{rollQuality(a.roll).label}</span>{" "}
                <span className="rng">{AFFIX[a.k].name} · {affixRange(a, p.ilvl)}</span>
              </span>
              <button className={`lockb ${a.locked ? "on" : ""}`} disabled={!a.locked && s.thread < 1} title={a.locked ? "Unlock" : "Lock with a Spectral Thread"} onClick={() => act((g) => toggleLock(g, p, i))}>
                {a.locked ? "Locked" : "Lock"}
              </button>
            </div>
          ))
        ) : (
          <p className="faint" style={{ margin: 0 }}>Common parts have no affixes to craft on.</p>
        )}
      </div>
      {craftable && (
        <>
          <div className="block">
            <div className="row" style={{ fontSize: ".8rem" }}>
              <span className="muted">Residue {p.residue} / {TUNE.residueMax}</span>
              <span className="faint">{p.residue >= TUNE.residueMax ? "Full: next Marrow roll lifts one affix a tier" : "Fills when a Marrow roll fails to improve"}</span>
            </div>
            <div className="bar res"><i style={{ width: (p.residue / TUNE.residueMax) * 100 + "%" }} /></div>
          </div>
          <div className="odds">
            <span>Tier odds at i{p.ilvl}:</span>
            {Object.keys(odds).sort((a, b) => +b - +a).map((t) => <span key={t}>T{t} <b>{pct(odds[+t])}</b></span>)}
            {lockedTiers && <span className="faint">({lockedTiers})</span>}
          </div>
        </>
      )}
      {onOther && (
        <p className="warnline">
          {wearer!.name} is wearing this. Stitching it onto {s.squad[ab].name} takes it off {wearer!.name} and leaves their {slotName(b.slot).toLowerCase()} slot empty.
        </p>
      )}
      {cmp}
      <div className="craft">
        {worn && (!many || wearer === s.squad[ab]) ? (
          <button className="btn" disabled>Worn{many && wearer ? ` by ${wearer.name}` : ""}</button>
        ) : (
          <button className="btn primary" data-act="equip" onClick={() => act((g) => equip(g, p, ab))}>
            {onOther ? `Move to ${s.squad[ab].name}` : many ? `Stitch onto ${s.squad[ab].name}` : "Stitch it on"}
            {onOther && <span className="sub">Takes it off {wearer!.name}</span>}
          </button>
        )}
        <button className="btn" data-act="marrow" disabled={!craftable || s.marrow < 1} onClick={() => act((g) => flashAfter(marrow(g, p), p.id))}>
          Marrow Shard<span className="sub">Reroll unlocked affixes ({s.marrow})</span>
        </button>
        <button className="btn" disabled={!craftable || s.dust < 1} onClick={() => act((g) => flashAfter(dust(g, p), p.id))}>
          Grave Dust<span className="sub">Reroll values in tier ({s.dust})</span>
        </button>
        <button className="btn" data-act="restitch" disabled={!canRestitch(g, p)} onClick={() => act((g) => restitch(g, p))}>
          Re-stitch{rs ? ` to i${rs.to}` : ""}
          <span className="sub">{rs ? `${rs.dust} Dust + ${fmt(rs.ess)} Essence, keeps every roll` : "Already at your best item level"}</span>
        </button>
        <button className="btn" data-act="press" disabled={s.dust < TUNE.dustPerMarrow} onClick={() => act((g) => pressMarrow(g))}>
          Press Marrow<span className="sub">{TUNE.dustPerMarrow} Dust → 1 Marrow Shard</span>
        </button>
        <button className="btn" disabled={!canGraft(g, p)} onClick={() => openModal({ kind: "graft", target: p.id })}>
          Graft<span className="sub">{TUNE.graftMarrow} Marrow + {TUNE.graftDust} Dust, eats a donor</span>
        </button>
        <button className={`btn ${kept ? "primary" : ""}`} disabled={trophy} onClick={() => act(() => (p.kept = !p.kept))}>
          {kept ? "Kept" : "Keep"}
          <span className="sub">{trophy ? "Trophies are always kept" : kept ? "Safe from rendering. Click to release" : "Protect from all rendering"}</span>
        </button>
        {!worn && (
          <button className="btn danger" disabled={kept} onClick={() => { act((g) => renderPart(g, p)); setUi({ sel: null, modal: null }); }}>
            Render<span className="sub">{kept ? "Release it first" : `+${partCM(p)} Corpse Mass`}</span>
          </button>
        )}
      </div>
      <div className="flavor">{b.flavor}</div>
    </div>
  );
}
