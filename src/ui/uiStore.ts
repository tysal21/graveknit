import type { SlotId } from "../content/slots";
import type { PanelId } from "../content/tutorial";
import type { Flash } from "../engine/crafting";
import type { OfflineReport } from "../engine/offline";
import { bump } from "./runtime";

export type ModalState =
  | null
  | { kind: "intro" }
  | { kind: "bossLesson" }
  | { kind: "offline"; report: OfflineReport }
  | { kind: "graft"; target: number }
  | { kind: "renderAll" }
  | { kind: "renderPicked" }
  | { kind: "reset" }
  | { kind: "saves" };

/** what's selected, filtered and open on screen. Not saved. */
export const ui = {
  /** the part open in the Stitchery */
  sel: null as number | null,
  /** filter: only upgrades */
  up: false,
  /** filter: these slots (none = all) */
  slots: [] as SlotId[],
  /** Select mode: the picked part ids, or null when off */
  pick: null as number[] | null,
  /** part details folded away */
  dhide: false,
  /** the panel shown on phones */
  tab: "squad" as PanelId,
  modal: null as ModalState,
  /** rows that just got better or worse after a reroll */
  flash: null as { id: number; f: Flash; at: number } | null,
};

export function setUi(patch: Partial<typeof ui>) {
  Object.assign(ui, patch);
  bump();
}

export const openModal = (m: ModalState) => setUi({ modal: m });
export const closeModal = () => setUi({ modal: null });

export const isPhone = () => window.innerWidth <= 760;

export function showTab(tab: PanelId) {
  setUi({ tab });
  if (isPhone()) window.scrollTo(0, 0);
}
