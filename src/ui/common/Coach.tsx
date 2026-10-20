import { useLayoutEffect } from "react";
import { TUT_KILLS, TUT_STEPS, type PanelId, type TutStep } from "../../content/tutorial";
import type { Game } from "../../engine/game";
import { currentHint, currentStep, tutNext } from "../../engine/tutorial";
import { act, useGame } from "../runtime";

/** the step or tip showing right now, if any */
export function activeCoach(g: Game): { step: TutStep; tutorial: boolean } | null {
  if (g.inTut() && g.s.tut > 0) return { step: currentStep(g), tutorial: true };
  const h = currentHint(g);
  return h ? { step: { ...h, next: "Got it" }, tutorial: false } : null;
}

/** the gold tip box at the top of a panel */
export function Coach({ panel }: { panel: PanelId }) {
  const g = useGame();
  const a = activeCoach(g);
  if (!a || a.step.panel !== panel) return null;
  const { step, tutorial } = a;
  return (
    <div className="coach" id="coach">
      <span className="ct">{tutorial ? `Step ${g.s.tut} of ${TUT_STEPS}` : "Tip"}</span>
      <b className="h">{step.title}</b>
      <p>{step.text}</p>
      {step.next ? (
        <div className="row">
          <button className="btn primary" id="coachBtn" onClick={() => act(tutNext)}>
            {step.next}
          </button>
        </div>
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
    const sel = a.step.target === "#tutItem" ? `.item[data-id="${g.s.tutPart}"]` : a.step.target;
    document.querySelector(sel)?.classList.add("glow");
  });
}
