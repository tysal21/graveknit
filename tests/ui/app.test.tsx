import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../src/ui/App";
import { getGame, startGame } from "../../src/ui/runtime";
import { tutFinish } from "../../src/engine/tutorial";
import { spawnTrash, startBoss } from "../../src/engine/combat";
import { tipContent } from "../../src/ui/common/Tips";

describe("the screen", () => {
  it("shows the intro on a new game, then all four panels", () => {
    startGame(null);
    const view = render(<App />);
    expect(view.getByText("Raise it again")).toBeTruthy();
    act(() => tutFinish(getGame(), true));
    view.rerender(<App />);
    for (const name of ["Squad", "Crypt", "Stitchery", "Graveyard"]) expect(view.container.querySelector(`#h-${{ Squad: "squad", Crypt: "crypt", Stitchery: "stitch", Graveyard: "yard" }[name]}`)?.textContent).toContain(name);
  });

  it("draws a boss's summoned adds in the fight, and clears them when the next enemy arrives", () => {
    startGame(null);
    const g = getGame();
    tutFinish(g, true);
    g.s.stage = g.s.maxStage = 20;
    const view = render(<App />);
    const adds = () => view.container.querySelectorAll(".scene .add").length;
    act(() => {
      startBoss(g);
      for (let i = 0; i < 2; i++) g.foe!.adds.push({ name: "Bone Mite", hp: 10, max: 10, dmg: 0, atk: 0 });
    });
    view.rerender(<App />);
    expect(adds()).toBe(2);
    act(() => spawnTrash(g));
    view.rerender(<App />);
    expect(adds()).toBe(0);
  });

  it("previews an enemy and the part it drops from the Who lives here list", () => {
    startGame(null);
    const g = getGame();
    tutFinish(g, true);
    g.s.stage = g.s.maxStage = 15;
    const view = render(<App />);
    const foe = view.container.querySelector<HTMLElement>('[data-tip="foe-15-cultist"]');
    const part = view.container.querySelector<HTMLElement>('[data-tip="base-knightArm"]');
    expect(foe && part).toBeTruthy();
    const foeTip = render(<>{tipContent(g, foe!.dataset.tip!)}</>);
    expect(foeTip.container.textContent).toContain("Bone Cultist");
    expect(foeTip.container.textContent).toContain("Drops Cultist's Arm");
    const partTip = render(<>{tipContent(g, part!.dataset.tip!)}</>);
    expect(partTip.container.textContent).toContain("Drops here at item level 15");
    expect(partTip.container.textContent).toContain("DPS");
    expect(partTip.container.textContent).toContain("Brutal");
  });

  it("shows the re-knit countdown on the boss button and the stage list after a kill", () => {
    startGame(null);
    const g = getGame();
    tutFinish(g, true);
    g.s.stage = 9;
    g.s.maxStage = 11;
    g.s.bosses.warden = { kills: 1, thrall: false, tries: 1, readyAt: g.s.clock + 300 };
    const view = render(<App />);
    expect(view.container.querySelector(".reknit")?.textContent).toContain("5:00");
    const stg = view.container.querySelector<HTMLButtonElement>(".stg.boss");
    expect(stg?.textContent).toContain("5:00");
    expect(stg?.disabled).toBe(true);
    act(() => { g.s.clock += 300; });
    view.rerender(<App />);
    expect(view.container.querySelector(".reknit")).toBeNull();
    expect(view.container.querySelector<HTMLButtonElement>(".stg.boss")?.disabled).toBe(false);
  });
});
