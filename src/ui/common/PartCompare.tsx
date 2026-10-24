import { ABILITY } from "../../content/abilities";
import { AFFIX } from "../../content/affixes";
import { BASES } from "../../content/acts";
import { slotName, type SlotId } from "../../content/slots";
import { IMPLICIT_TEXT } from "../../content/stats";
import { fmt } from "../../engine/format";
import type { Game } from "../../engine/game";
import { affixValue, implicits, isKept, partName, rarityClass, rarityLabel, rollQuality } from "../../engine/parts";
import type { Part } from "../../engine/state";
import { calc } from "../../engine/stats";
import { useGame } from "../runtime";
import { selAbom, setUi } from "../uiStore";
import { PartIcon } from "../art";

// The side-by-side compare: the part you're looking at next to what the chosen Abomination wears in that slot.
// Both cards use the same layout, line for line, so you can read straight across.

/** what the chosen Abomination wears in a slot, or null for an empty slot */
export function equippedIn(g: Game, slot: SlotId, abom: number) {
  return g.partById(g.s.squad[abom].eq[slot]) ?? null;
}

/** should a part get a compare card beside it? Not when it's the very part being compared against. */
export function needsCompare(g: Game, p: Part, abom: number) {
  return g.s.squad[abom].eq[BASES[p.base].slot] !== p.id;
}

/** a compact card for one part, the same shape whichever side it's on */
export function PartSummary({ g, p, label, wearer = true }: { g: Game; p: Part; label: string; wearer?: boolean }) {
  const b = BASES[p.base];
  return (
    <div className={`psum r-${rarityClass(p)}`}>
      <div className="plabel">{label}</div>
      <div className="card-head">
        <PartIcon base={p.base} size={32} />
        <div>
          <div className={`title tc-${rarityClass(p)}`}>{partName(p)}</div>
          <div className="sub">
            {rarityLabel(p)} {slotName(b.slot)} · i{p.ilvl}
            {wearer && g.s.squad.length > 1 && g.isWorn(p) ? ` · on ${g.s.squad[g.wornBy(p)].name}` : ""}
            {isKept(p) ? " · kept" : ""}
          </div>
        </div>
      </div>
      <div className="pimpl">
        {implicits(p).map(([st, v]) => <div key={st}>{IMPLICIT_TEXT[st](v)}</div>)}
        {b.ab && <div>Ability: <b>{ABILITY[b.ab].name}</b></div>}
      </div>
      {b.unique && <div className="uniqfx">{b.unique.text}</div>}
      {b.mirror && <div className="uniqfx">Copies the best affix another squad member wears</div>}
      {!b.unique && (
        <div className="pafx">
          {p.affixes.length ? (
            p.affixes.map((a, i) => (
              <div className="afl" key={i}>
                <span className={`tb t${a.t}`}>T{a.t}</span>
                <span>{AFFIX[a.k].fmt(affixValue(a, p.ilvl))} <span className={`q ${rollQuality(a, p.ilvl).cls}`}>{rollQuality(a, p.ilvl).label}</span></span>
              </div>
            ))
          ) : (
            <span className="faint">No affixes (Common)</span>
          )}
        </div>
      )}
    </div>
  );
}

/** the right-hand card when nothing is stitched into that slot */
export function EmptySlot({ label, slot }: { label: string; slot: SlotId }) {
  return (
    <div className="psum empty">
      <div className="plabel">{label}</div>
      <p className="faint" style={{ margin: 0 }}>Nothing in the {slotName(slot).toLowerCase()} slot. Anything is an upgrade.</p>
    </div>
  );
}

/** the equipped card for a part's slot on the chosen Abomination */
export function EquippedCard({ g, p, abom }: { g: Game; p: Part; abom: number }) {
  const slot = BASES[p.base].slot;
  const label = g.s.squad.length > 1 ? `Equipped on ${g.s.squad[abom].name}` : "Equipped now";
  const w = equippedIn(g, slot, abom);
  return w ? <PartSummary g={g} p={w} label={label} wearer={false} /> : <EmptySlot label={label} slot={slot} />;
}

/** DPS, HP and Infusion cap before → after stitching the part onto the chosen Abomination */
export function CompareStrip({ g, p, abom }: { g: Game; p: Part; abom: number }) {
  const a = calc(g, { abom, ignoreBuffs: true }), c = calc(g, { abom, swap: p, ignoreBuffs: true });
  const cell = (l: string, x: number, y: number, show = fmt) => (
    <span>{l} {show(x)} → <b className={y > x ? "up" : y < x ? "down" : ""}>{show(y)}</b></span>
  );
  return (
    <div className="cmp">
      {cell("DPS", a.dps, c.dps)}
      {cell("HP", a.maxHp, c.maxHp)}
      {cell("Infusion cap", a.cap, c.cap, String)}
    </div>
  );
}

/** "Compare with:" buttons, one per Abomination. Only shown once you have a squad. */
export function AbomPicker() {
  const g = useGame();
  const sq = g.s.squad, ab = selAbom(sq.length);
  if (sq.length < 2) return null;
  return (
    <div className="abompick" role="group" aria-label="Compare with">
      <span className="faint">Compare with</span>
      {sq.map((a, i) => (
        <button key={i} className={`btn small ${i === ab ? "on" : ""}`} aria-pressed={i === ab} onClick={() => setUi({ abom: i })}>
          {a.name}
        </button>
      ))}
    </div>
  );
}

/** the next Abomination to compare against (Tab on a hover card) */
export const nextAbom = (g: Game) => (selAbom(g.s.squad.length) + 1) % g.s.squad.length;
