import { useEffect } from "react";
import { Coach } from "../common/Coach";
import { Modal } from "../common/Modal";
import { PartDetail } from "../panels/PartDetail";
import { selectPart, sortedParts } from "../panels/StitcheryPanel";
import { getGame, useGame } from "../runtime";
import { closeModal, isPhone, selAbom, setUi, ui } from "../uiStore";
import { BASES } from "../../content/acts";
import { slotName } from "../../content/slots";
import { partName } from "../../engine/parts";
import { AbomPicker, EquippedCard, equippedIn, needsCompare } from "../common/PartCompare";

/** step to the previous or next part in the list's current order */
function stepPart(dir: -1 | 1) {
  const list = sortedParts(getGame());
  const i = list.findIndex((p) => p.id === ui.sel);
  const next = list[i + dir];
  if (next) selectPart(next.id);
}

/** beside the part: what the chosen Abomination wears in that slot, to read across while you craft */
function BenchCompare() {
  const g = useGame();
  const p = g.partById(ui.sel)!;
  const ab = selAbom(g.s.squad.length);
  const w = equippedIn(g, BASES[p.base].slot, ab);
  const open = ui.benchCmp ?? !isPhone();
  return (
    <details className="benchside" open={open} onToggle={(e) => { const o = (e.target as HTMLDetailsElement).open; if (o !== open) setUi({ benchCmp: o }); }}>
      <summary>
        Compare: {g.s.squad.length > 1 ? `${g.s.squad[ab].name}'s ` : ""}{slotName(BASES[p.base].slot).toLowerCase()}
        <span className="muted">{w ? ` · ${partName(w)}` : " · empty"}</span>
      </summary>
      <AbomPicker />
      <EquippedCard g={g} p={p} abom={ab} />
      {w && <button className="btn small" onClick={() => selectPart(w.id)}>Open the equipped part</button>}
    </details>
  );
}

/** the part workbench: a big window with a part's full details and crafting */
export function Workbench() {
  const g = useGame();
  const p = g.partById(ui.sel);

  // arrow keys step through parts; Escape closes
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      if (e.key === "ArrowLeft") stepPart(-1);
      if (e.key === "ArrowRight") stepPart(1);
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);

  if (!p) return null;
  const list = sortedParts(g);
  const i = list.findIndex((x) => x.id === p.id);
  const side = needsCompare(g, p, selAbom(g.s.squad.length));
  return (
    <Modal className={`bench ${side ? "wide" : ""}`}>
      <Coach panel="stitch" inBench />
      <div className="benchnav">
        <button className="btn small" disabled={i <= 0} onClick={() => stepPart(-1)} aria-label="Previous part">◂ Prev</button>
        <span className="pos">{i >= 0 ? `Part ${i + 1} of ${list.length} in your list` : "Not in your current filters"}</span>
        <button className="btn small" disabled={i < 0 || i >= list.length - 1} onClick={() => stepPart(1)} aria-label="Next part">Next ▸</button>
        <button className="btn small" onClick={closeModal}>Close</button>
      </div>
      <div className={side ? "benchgrid" : ""}>
        <PartDetail part={p} />
        {side && <BenchCompare />}
      </div>
    </Modal>
  );
}
