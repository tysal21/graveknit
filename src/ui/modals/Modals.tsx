import { useState } from "react";
import { slotName } from "../../content/slots";
import { TUNE } from "../../content/tune";
import { INTRO_TEXT } from "../../content/tutorial";
import { ACT1 } from "../../content/act1";
import { startBoss } from "../../engine/combat";
import { fmt } from "../../engine/format";
import { exportSave, importSave, saveToBrowser, wipeBrowserSave } from "../../engine/save";
import { renderMany, renderSummary } from "../../engine/stash";
import { bossHintKey, lessonKey, tutFinish, tutGo } from "../../engine/tutorial";
import { Modal } from "../common/Modal";
import { act, startGame, useGame } from "../runtime";
import { filteredParts } from "../panels/StitcheryPanel";
import { closeModal, setUi, ui } from "../uiStore";
import { GraftModal } from "./GraftModal";
import { VictoryModal } from "./Victory";
import { Workbench } from "./Workbench";

export function IntroModal() {
  return (
    <Modal locked>
      <h2>Graveknit</h2>
      <p style={{ margin: 0 }}>{INTRO_TEXT}</p>
      <p className="flavor" style={{ margin: 0 }}>{ACT1.story[1]}</p>
      <p className="muted" style={{ margin: 0 }}>This short tutorial shows you one part of the game at a time. It takes about 3 minutes.</p>
      <div className="row">
        <button className="btn" onClick={() => act((g) => tutFinish(g, true))}>I've played before, skip it</button>
        <button className="btn primary" onClick={() => act((g) => tutGo(g, 1))}>Raise it again</button>
      </div>
    </Modal>
  );
}

/** "**bold**" in lesson text becomes <b>bold</b> */
function Rich({ text }: { text: string }) {
  return <>{text.split("**").map((bit, i) => (i % 2 ? <b key={i}>{bit}</b> : bit))}</>;
}

export function BossLessonModal() {
  const g = useGame();
  const b = g.act().boss;
  return (
    <Modal>
      <h2>How {b.name.replace(/^The /, "the ")} fights</h2>
      <p style={{ margin: 0 }}><Rich text={b.lesson.intro} /></p>
      <ul>
        {b.lesson.moves.map((m, i) => <li key={i}><Rich text={m} /></li>)}
      </ul>
      <p style={{ margin: 0 }}><Rich text={b.lesson.outro} /></p>
      <p className="muted" style={{ margin: 0 }}>The right button glows when it matters. Use keys 1 to {Math.max(2, g.abilities().length)}. Turn off Auto abilities in the Crypt if you want to time them yourself.</p>
      <div className="row">
        <button className="btn" onClick={closeModal}>Not yet</button>
        <button className="btn primary" onClick={() => { act((g) => { g.s.seen[lessonKey(b.id)] = 1; g.s.seen[bossHintKey(b.id)] = 1; g.s.hint = null; startBoss(g); }); closeModal(); }}>Begin the fight</button>
      </div>
    </Modal>
  );
}

export function OfflineModal() {
  const m = ui.modal;
  if (m?.kind !== "offline") return null;
  const r = m.report;
  const h = Math.floor(r.sec / 3600), min = Math.floor((r.sec % 3600) / 60);
  return (
    <Modal>
      <h2>While you were away</h2>
      <p className="muted" style={{ margin: 0 }}>
        {h ? h + "h " : ""}{min}m on Stage {r.stage}, at {Math.round(TUNE.offlineRate * 100)}% of your active pace{r.capped ? " (capped at 12 hours)" : ""}.
      </p>
      <ul>
        <li>{r.kills.toLocaleString("en-US")} kills</li>
        <li className="c-ess">+{fmt(r.ess)} Soul Essence</li>
        <li className="c-cm">+{fmt(r.cm)} Corpse Mass</li>
        <li>{r.parts} parts{r.rare ? `, ${r.rare} Rare` : ""}</li>
        <li>+{r.dust} Grave Dust, +{r.marrow} Marrow Shards</li>
      </ul>
      <button className="btn primary" onClick={closeModal}>Back to the crypt</button>
    </Modal>
  );
}

function RenderConfirm({ title, list, what, onDone }: { title: string; list: ReturnType<typeof filteredParts>; what: string; onDone: () => void }) {
  const g = useGame();
  const sum = renderSummary(g, list);
  if (!sum.count)
    return (
      <Modal>
        <h2>Nothing to render</h2>
        <p style={{ margin: 0 }}>{sum.skippedKept ? "Every selected part is kept. Unkeep them first if you want to render them." : "Every part here is either worn or kept."}</p>
        <button className="btn" onClick={closeModal}>OK</button>
      </Modal>
    );
  return (
    <Modal>
      <h2>{title.replace("{n}", String(sum.count))}</h2>
      <p style={{ margin: 0 }}>
        They turn into <b className="c-cm">{fmt(sum.cm)} Corpse Mass</b>.
        {sum.rares > 0 && <> That includes <b className="tc-rare">{sum.rares} Rare</b>.</>}
        {sum.skippedKept > 0 && <> {sum.skippedKept} kept part{sum.skippedKept > 1 ? "s are" : " is"} skipped.</>}
      </p>
      <p className="muted" style={{ margin: 0 }}>Worn and kept parts are safe. Rendering can't be undone.</p>
      <div className="row">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn danger" onClick={() => { act((g) => renderMany(g, list, what)); onDone(); closeModal(); }}>Render {sum.count} parts</button>
      </div>
    </Modal>
  );
}

export function RenderAllModal() {
  const g = useGame();
  const where = (ui.up ? " upgrade" : "") + (ui.slots.length ? " " + ui.slots.map(slotName).join(" or ") : "") ;
  const match = ui.search.trim() ? ` matching "${ui.search.trim()}"` : "";
  return <RenderConfirm title={`Render all${where} parts${match}?`} list={filteredParts(g)} what="parts" onDone={() => { if (!g.partById(ui.sel)) setUi({ sel: null }); }} />;
}

export function RenderPickedModal() {
  const g = useGame();
  const list = (ui.pick || []).map((id) => g.partById(id)!).filter(Boolean);
  return <RenderConfirm title="Render {n} selected parts?" list={list} what="selected parts" onDone={() => setUi({ pick: [], sel: g.partById(ui.sel) ? ui.sel : null })} />;
}

export function ResetModal() {
  return (
    <Modal>
      <h2>Start over?</h2>
      <p style={{ margin: 0 }}>This wipes your progress in this browser. Your parts, stages and reagents will be gone. Export your save first if you might want it back.</p>
      <div className="row">
        <button className="btn" onClick={closeModal}>Keep playing</button>
        <button className="btn danger" onClick={() => { wipeBrowserSave(); setUi({ modal: null, sel: null, pick: null }); startGame(null); }}>Wipe and start over</button>
      </div>
    </Modal>
  );
}

export function SavesModal() {
  const g = useGame();
  const [code] = useState(() => exportSave(g.s));
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setNote({ ok: true, text: "Copied. Paste it somewhere safe, like a note or an email to yourself." });
    } catch {
      setNote({ ok: false, text: "Couldn't copy automatically. Select the text above and copy it by hand." });
    }
  };
  const load = () => {
    const s = importSave(paste);
    if (!s) return setNote({ ok: false, text: "That doesn't look like a Graveknit save. Check you copied the whole thing, starting with GK1:" });
    saveToBrowser(s);
    setUi({ modal: null, sel: null, pick: null });
    startGame(s);
  };
  return (
    <Modal>
      <h2>Your save</h2>
      <p style={{ margin: 0 }}>This block of text is your whole game. Copy it to keep a backup, or to carry your game to another computer or browser.</p>
      <textarea className="savebox" readOnly value={code} onFocus={(e) => e.target.select()} />
      <div className="row"><button className="btn primary" onClick={copy}>Copy save</button></div>
      <h3>Load a save</h3>
      <p className="muted" style={{ margin: 0 }}>Paste a save here. It replaces the game in this browser.</p>
      <textarea className="savebox" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="GK1:…" />
      {note && <p className={note.ok ? "note-ok" : "note-bad"} style={{ margin: 0 }}>{note.text}</p>}
      <div className="row">
        <button className="btn" onClick={closeModal}>Close</button>
        <button className="btn danger" disabled={!paste.trim()} onClick={load}>Load this save</button>
      </div>
    </Modal>
  );
}

export function ModalLayer() {
  const g = useGame();
  if (g.s.tut === 0) return <IntroModal />;
  switch (ui.modal?.kind) {
    case "bossLesson": return <BossLessonModal />;
    case "offline": return <OfflineModal />;
    case "graft": return <GraftModal targetId={ui.modal.target} />;
    case "renderAll": return <RenderAllModal />;
    case "renderPicked": return <RenderPickedModal />;
    case "reset": return <ResetModal />;
    case "saves": return <SavesModal />;
    case "workbench": return <Workbench />;
    case "victory": return <VictoryModal />;
  }
  return null;
}
