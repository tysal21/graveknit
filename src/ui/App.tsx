import { useEffect } from "react";
import { TUTORIAL, type PanelId } from "../content/tutorial";
import { checkHints } from "../engine/tutorial";
import { activeCoach, useGlow } from "./common/Coach";
import { panelOpen } from "./common/Panel";
import { TipLayer } from "./common/Tips";
import { GlanceStrip, usePills } from "./GlanceStrip";
import { ModalLayer } from "./modals/Modals";
import { Toasts, wantsPopup } from "./modals/Victory";
import { CryptPanel } from "./panels/CryptPanel";
import { GraveyardPanel } from "./panels/GraveyardPanel";
import { SquadPanel } from "./panels/SquadPanel";
import { StitcheryPanel } from "./panels/StitcheryPanel";
import { onGameCreated, useGame } from "./runtime";
import { bossReadyCue, rareDropCue } from "./sound";
import { isPhone, openModal, setUi, showTab, SLAIN_MS, ui } from "./uiStore";

const TABS: [PanelId, string][] = [["squad", "Squad"], ["crypt", "Crypt"], ["stitch", "Stitchery"], ["yard", "Graveyard"]];

// hook game events to the screen (runs again if the game is replaced by an import or a wipe)
onGameCreated((g) => {
  g.on((e) => {
    if (e.type === "bossReady" && g.s.opt.sound) bossReadyCue();
    if (e.type === "rareDrop") {
      if (g.s.opt.sound) rareDropCue();
      setUi({ toasts: [...ui.toasts.slice(-2), { at: Date.now(), rare: e.id }] });
    }
    if (e.type === "tutPartDropped") setUi({ slots: [] });
    if (e.type === "tutStep") {
      const p = TUTORIAL[e.step]?.panel;
      // the workbench covers the board, so close it once the tutorial moves past the Stitchery
      if (p !== "stitch" && ui.modal?.kind === "workbench") setUi({ modal: null });
      if (p && isPhone()) showTab(p);
    }
    if (e.type === "offline") openModal({ kind: "offline", report: e.report });
    if (e.type === "bossWin") {
      // stamp SLAIN over the fight first, then show the loot once it has sunk in
      setUi({ slain: { at: Date.now() } });
      const big = wantsPopup(g, e.win);
      setTimeout(() => {
        // never cover another open window (a graft, a confirm box): fall back to a toast
        if (big && !ui.modal) openModal({ kind: "victory", win: e.win });
        else setUi({ toasts: [...ui.toasts.slice(-2), { at: Date.now(), win: e.win }] });
      }, SLAIN_MS);
    }
  });
});

export function App() {
  const g = useGame();
  const pills = usePills();
  checkHints(g);
  useGlow(g);

  // on phones, jump to the panel a tip is about
  const coachPanel = activeCoach(g)?.step.panel;
  useEffect(() => {
    if (coachPanel && isPhone() && coachPanel !== ui.tab) showTab(coachPanel);
  }, [coachPanel]);

  return (
    <div className="app">
      <GlanceStrip pills={pills} />
      <main className="board">
        <SquadPanel />
        <CryptPanel />
        <StitcheryPanel />
        <GraveyardPanel />
      </main>
      <nav className="tabs" aria-label="Panels">
        {TABS.map(([id, name]) =>
          panelOpen(g.inTut(), g.s.tut, id) ? (
            <button key={id} className={ui.tab === id ? "on" : ""} onClick={() => showTab(id)}>
              {name}
              {pills.some((p) => p.on && p.tab === id) && <i className="dot" />}
            </button>
          ) : null,
        )}
      </nav>
      <ModalLayer />
      <Toasts />
      <TipLayer />
    </div>
  );
}
