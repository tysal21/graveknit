import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../src/ui/App";
import { PartTip } from "../../src/ui/common/Tips";
import { getGame, startGame } from "../../src/ui/runtime";
import { tutFinish } from "../../src/engine/tutorial";
import { makePart, partName } from "../../src/engine/parts";
import { openSquadSlots } from "../../src/engine/combat";
import { selectPart } from "../../src/ui/panels/StitcheryPanel";
import { setUi } from "../../src/ui/uiStore";

describe("comparing parts in the Stitchery", () => {
  it("shows a hovered part beside what the chosen Abomination wears in that slot", () => {
    startGame(null);
    const g = getGame();
    tutFinish(g, true);
    const p = makePart(g, "cleaverArm", 5, "magic");
    const worn = g.partById(g.s.squad[0].eq.main)!;
    const view = render(<PartTip g={g} id={p.id} />);
    const cards = view.container.querySelectorAll(".psum");
    expect(cards.length).toBe(2);
    expect(cards[1].textContent).toContain("Equipped now");
    expect(cards[1].textContent).toContain(partName(worn));
  });

  it("compares against the Abomination you pick, and an empty slot says so", () => {
    startGame(null);
    const g = getGame();
    tutFinish(g, true);
    g.s.maxStage = 20;
    openSquadSlots(g);
    expect(g.s.squad.length).toBe(2);
    const p = makePart(g, "cleaverArm", 5, "magic");
    act(() => setUi({ abom: 1 }));
    const view = render(<PartTip g={g} id={p.id} />);
    expect(view.container.querySelector(".psum.empty")?.textContent).toContain(`Equipped on ${g.s.squad[1].name}`);
    act(() => setUi({ abom: 0 }));
  });

  it("puts the equipped card beside the part on the Workbench", () => {
    startGame(null);
    const g = getGame();
    tutFinish(g, true);
    const p = makePart(g, "cleaverArm", 5, "magic");
    const view = render(<App />);
    act(() => selectPart(p.id));
    view.rerender(<App />);
    expect(view.container.querySelector(".benchside .psum")).toBeTruthy();
  });
});
