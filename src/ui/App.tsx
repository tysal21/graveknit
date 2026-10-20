import { useEffect } from "react";
import { TUTORIAL, type PanelId } from "../content/tutorial";
import { checkHints } from "../engine/tutorial";
import { activeCoach, useGlow } from "./common/Coach";
import { panelOpen } from "./common/Panel";
import { TipLayer } from "./common/Tips";
import { GlanceStrip, usePills } from "./GlanceStrip";
import { ModalLayer } from "./modals/Modals";
import { CryptPanel } from "./panels/CryptPanel";
import { GraveyardPanel } from "./panels/GraveyardPanel";
import { SquadPanel } from "./panels/SquadPanel";
import { StitcheryPanel } from "./panels/StitcheryPanel";
import { onGameCreated, useGame } from "./runtime";
import { bossReadyCue } from "./sound";
import { isPhone, openModal, setUi, showTab, ui } from "./uiStore";

const TABS: [PanelId, string][] = [["squad", "Squad"], ["crypt", "Crypt"], ["stitch", "Stitchery"], ["yard", "Graveyard"]];

// hook game events to the screen (runs again if the game is replaced by an import or a wipe)
onGameCreated((g) => {
  g.on((e) => {
    if (e.type === "bossReady" && g.s.opt.sound) bossReadyCue();
    if (e.type === "tutPartDropped") setUi({ up: false, slots: [] });
    if (e.type === "tutStep") {
      const p = TUTORIAL[e.step]?.panel;
      if (p && isPhone()) showTab(p);
    }
    if (e.type === "offline") openModal({ kind: "offline", report: e.report });
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
      <TipLayer />
    </div>
  );
}
