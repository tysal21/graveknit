import type { ReactNode } from "react";
import { PANEL_LOCKED_TEXT, PANEL_OPENS_AT, type PanelId } from "../../content/tutorial";
import { useGame } from "../runtime";
import { ui } from "../uiStore";
import { Coach } from "./Coach";

/** one of the four grimoire panels. Panels the tutorial hasn't reached yet stay greyed out. */
export function Panel(props: { id: PanelId; title: ReactNode; small?: ReactNode; className?: string; children: ReactNode }) {
  const g = useGame();
  const locked = g.inTut() && g.s.tut < PANEL_OPENS_AT[props.id];
  const cls = ["panel", ui.tab === props.id ? "show" : "", locked ? "locked" : "", props.className || ""].join(" ");
  return (
    <section className={cls} id={"p-" + props.id} aria-labelledby={"h-" + props.id}>
      <h2 id={"h-" + props.id}>
        {props.title} {props.small !== undefined && <small>{props.small}</small>}
      </h2>
      <Coach panel={props.id} />
      <p className="lockmsg">{PANEL_LOCKED_TEXT[props.id]}</p>
      {props.children}
    </section>
  );
}

export const panelOpen = (inTut: boolean, tut: number, id: PanelId) => !inTut || tut >= PANEL_OPENS_AT[id];
