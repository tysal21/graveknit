import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../src/ui/App";
import { getGame, startGame } from "../../src/ui/runtime";
import { tutFinish } from "../../src/engine/tutorial";

describe("the screen", () => {
  it("shows the intro on a new game, then all four panels", () => {
    startGame(null);
    const view = render(<App />);
    expect(view.getByText("Raise it again")).toBeTruthy();
    act(() => tutFinish(getGame(), true));
    view.rerender(<App />);
    for (const name of ["Squad", "Crypt", "Stitchery", "Graveyard"]) expect(view.container.querySelector(`#h-${{ Squad: "squad", Crypt: "crypt", Stitchery: "stitch", Graveyard: "yard" }[name]}`)?.textContent).toContain(name);
  });
});
