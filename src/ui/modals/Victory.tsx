import { BASES, bossById } from "../../content/acts";
import { slotName } from "../../content/slots";
import { TUNE } from "../../content/tune";
import { fmt } from "../../engine/format";
import type { BossWin, Game } from "../../engine/game";
import { isUnique, partName, rarityClass } from "../../engine/parts";
import { calc } from "../../engine/stats";
import { Modal } from "../common/Modal";
import { Delta, selectPart } from "../panels/StitcheryPanel";
import { useGame } from "../runtime";
import { closeModal, selAbom, setUi, ui } from "../uiStore";

/** first kills and new Thralls always get the big pop-up; repeat kills only if you ask for it */
export const wantsPopup = (g: Game, w: BossWin) => w.first || w.thrall || g.s.opt.bossPop;

/** the loot list: reagents, then each part (click one to open it on the Workbench) */
function Loot({ win }: { win: BossWin }) {
  const g = useGame();
  const base0 = calc(g, { abom: selAbom(g.s.squad.length), ignoreBuffs: true });
  return (
    <div className="loot">
      <div className="reag">
        <span className="c-ess">+{fmt(win.ess)} Soul Essence</span>
        <span className="c-cm">+{fmt(win.cm)} Corpse Mass</span>
        <span>+{win.marrow} Marrow Shards</span>
        <span>+{win.dust} Grave Dust</span>
        {win.thread && <span className="tc-rare">+1 Spectral Thread</span>}
      </div>
      {win.parts.map((id) => {
        const p = g.partById(id);
        // the part may have been rendered or lost to a full stash since
        if (!p) return <div key={id} className="item gone"><span className="faint">A part you've since rendered</span></div>;
        return (
          <button key={id} className={`item r-${rarityClass(p)}`} onClick={() => selectPart(id)}>
            <span className={`n tc-${rarityClass(p)}`}>{partName(p)}</span>
            <span className="delta"><Delta g={g} p={p} base0={base0} /></span>
            <span className="meta">
              {slotName(BASES[p.base].slot)} · i{p.ilvl}{" "}
              {p.affixes.map((a, i) => <span key={i} className={`tb t${a.t}`}>T{a.t}</span>)}
            </span>
          </button>
        );
      })}
      {win.parts.length < TUNE.bossLoot.parts + (win.first ? 1 : 0) && <p className="faint" style={{ margin: 0 }}>Some loot was left behind: your stash is full of kept parts.</p>}
    </div>
  );
}

export function VictoryModal() {
  const m = ui.modal;
  if (m?.kind !== "victory") return null;
  const win = m.win;
  const b = bossById(win.bossId);
  return (
    <Modal className="victory">
      <p className="eyebrow">{win.first ? "First kill" : "Victory"}</p>
      <h2>{b.name} falls</h2>
      <p className="muted" style={{ margin: 0 }}>Slain in {win.secs.toFixed(1)} seconds.</p>
      {win.thrall && (
        <div className="thrallBanner">
          <b>Bound as Thrall: {b.thrall.name}</b>
          <span>{b.name} rises again and kneels. Aura: {b.thrall.text}.</span>
        </div>
      )}
      <h3>Loot</h3>
      <Loot win={win} />
      {win.first && <p className="flavor" style={{ margin: 0 }}>{b.firstClear[b.firstClear.length - 1]}</p>}
      <p className="faint" style={{ margin: 0 }}>Click a part to open it on the Workbench.</p>
      <button className="btn primary" onClick={closeModal}>Back to the crypt</button>
    </Modal>
  );
}

/** small corner notes for repeat boss kills; they fade after a few seconds */
export function Toasts() {
  const g = useGame();
  const now = Date.now();
  const live = ui.toasts.filter((t) => now - t.at < 7000);
  if (!live.length) return null;
  return (
    <div className="toasts" aria-live="polite">
      {live.map((t) => {
        if (t.rare !== undefined) return <RareToast key={t.at} at={t.at} id={t.rare} />;
        if (!t.win) return null;
        const win = t.win;
        const b = bossById(win.bossId);
        return (
          <button key={t.at} className="toast" onClick={() => setUi({ modal: { kind: "victory", win }, toasts: ui.toasts.filter((x) => x !== t) })}>
            <b>{b.name.replace(/^The /, "")} slain</b> in {win.secs.toFixed(1)}s · {lootSummary(g, win)}
            <span className="faint"> · see loot</span>
          </button>
        );
      })}
    </div>
  );
}

/** a gold corner note when a Rare drops; click to open it on the Workbench */
function RareToast({ at, id }: { at: number; id: number }) {
  const g = useGame();
  const p = g.partById(id);
  if (!p) return null;
  return (
    <button className={`toast ${isUnique(p) ? "unique" : "rare"}`} onClick={() => { setUi({ toasts: ui.toasts.filter((x) => x.at !== at) }); selectPart(id); }}>
      {isUnique(p) ? <b className="tc-unique">Unique drop!</b> : <b className="tc-rare">Rare drop!</b>} {partName(p)} <span className="faint">· item level {p.ilvl} · open it</span>
    </button>
  );
}

/** "2 parts, 1 Rare" for the toast */
function lootSummary(g: Game, win: BossWin) {
  const ps = win.parts.map((id) => g.partById(id)).filter(Boolean);
  const rares = ps.filter((p) => p!.rarity === "rare").length;
  return `${ps.length} part${ps.length === 1 ? "" : "s"}${rares ? `, ${rares} Rare` : ""}${win.thread ? ", a Thread" : ""}`;
}
