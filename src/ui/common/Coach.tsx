import { useLayoutEffect } from "react";
import { TUT_KILLS, TUT_STEPS, type PanelId, type TutStep } from "../../content/tutorial";
import type { Game } from "../../engine/game";
import { currentHint, currentStep, killsDone, tutNext } from "../../engine/tutorial";
import { act, useGame } from "../runtime";
import { ui } from "../uiStore";

/** the step or tip showing right now, if any */
export function activeCoach(g: Game): { step: TutStep; tutorial: boolean } | null {
  if (g.inTut() && g.s.tut > 0) return { step: currentStep(g), tutorial: true };
  const h = currentHint(g);
  return h ? { step: { ...h, next: "Got it" }, tutorial: false } : null;
}

/** the gold tip box at the top of a panel */
export function Coach({ panel, inBench }: { panel: PanelId; inBench?: boolean }) {
  const g = useGame();
  const a = activeCoach(g);
  if (!a || a.step.panel !== panel) return null;
  // while the workbench is open, its copy of the tip shows instead of the panel's
  if (!inBench && panel === "stitch" && ui.modal?.kind === "workbench") return null;
  const { step, tutorial } = a;
  return (
    <div className="coach" id="coach">
      <span className="ct">{tutorial ? `Step ${g.s.tut} of ${TUT_STEPS}` : "Tip"}</span>
      <b className="h">{step.title}</b>
      <p>{step.text}</p>
      {step.next || (tutorial && killsDone(g)) ? (
        <>
          {!step.next && <p className="muted">{TUT_KILLS} of {TUT_KILLS} rats. One of them left something behind.</p>}
          <div className="row">
            <button className="btn primary" id="coachBtn" onClick={() => act(tutNext)}>
              {step.next ?? "See what dropped"}
            </button>
          </div>
        </>
      ) : step.wait === "kills" ? (
        <p className="num muted">
          {Math.min(TUT_KILLS, g.s.tutKills)} of {TUT_KILLS} rats
        </p>
      ) : null}
    </div>
  );
}

/** makes the step's target glow; runs after every redraw */
export function useGlow(g: Game) {
  useLayoutEffect(() => {
    document.querySelectorAll(".glow").forEach((e) => e.classList.remove("glow"));
    const a = activeCoach(g);
    if (!a?.step.target) return;
    const target = a.tutorial && killsDone(g) ? "#coachBtn" : a.step.target;
    const sel = target === "#tutItem" ? `.item[data-id="${g.s.tutPart}"]` : target;
    document.querySelector(sel)?.classList.add("glow");
  });
}
