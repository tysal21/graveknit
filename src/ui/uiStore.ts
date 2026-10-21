import type { SlotId } from "../content/slots";
import type { PanelId } from "../content/tutorial";
import type { Flash } from "../engine/crafting";
import type { BossWin } from "../engine/game";
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
  | { kind: "saves" }
  | { kind: "workbench" }
  | { kind: "victory"; win: BossWin };

/** how long the SLAIN stamp shows before the loot appears */
export const SLAIN_MS = 1600;

/** what's selected, filtered and open on screen. Not saved. */
export const ui = {
  /** the part open in the Stitchery */
  sel: null as number | null,
  /** filter: these slots (none = all) */
  slots: [] as SlotId[],
  /** search box text: every word must match the part */
  search: "",
  /** Select mode: the picked part ids, or null when off */
  pick: null as number[] | null,
  /** which Abomination the Squad panel shows, and the one the Stitchery compares and stitches onto */
  abom: 0,
  /** the panel shown on phones */
  tab: "squad" as PanelId,
  modal: null as ModalState,
  /** rows that just got better or worse after a reroll */
  flash: null as { id: number; f: Flash; at: number } | null,
  /** the SLAIN stamp over the fight, shown for a moment after a boss dies */
  slain: null as { at: number } | null,
  /** small corner notes for repeat boss kills; click one to see the full loot */
  /** corner notes: a repeat boss kill (win) or a Rare drop (rare = the part's id) */
  toasts: [] as { at: number; win?: BossWin; rare?: number }[],
};

/** the selected Abomination, kept in range if the squad changed (an import, a wipe) */
export const selAbom = (squadSize: number) => Math.min(ui.abom, squadSize - 1);

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
