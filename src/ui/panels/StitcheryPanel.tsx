import { useMemo } from "react";
import { BASES } from "../../content/acts";
import { SLOTS, slotName, type SlotId } from "../../content/slots";
import { TUNE } from "../../content/tune";
import type { Game } from "../../engine/game";
import { affixValue, implicits, isKept, partName, rarityClass, rarityLabel } from "../../engine/parts";
import { AFFIX } from "../../content/affixes";
import { ABILITY } from "../../content/abilities";
import { IMPLICIT_TEXT } from "../../content/stats";
import { renderCommons, setKept } from "../../engine/stash";
import type { Part, SortId } from "../../engine/state";
import { calc, partGain, type Stats } from "../../engine/stats";
import { tutEvent } from "../../engine/tutorial";
import { Info } from "../common/Info";
import { Panel } from "../common/Panel";
import { act, useGame } from "../runtime";
import { isPhone, openModal, selAbom, setUi, showTab, ui } from "../uiStore";
import { PartIcon } from "../art";
import { AbomPicker } from "../common/PartCompare";

/** open a part in the Stitchery (from the list or the Squad panel) */
export function selectPart(id: number) {
  act((g) => {
    const p = g.partById(id);
    if (p) p.isNew = false;
    tutEvent(g, "select", id);
  });
  setUi({ sel: id, modal: { kind: "workbench" } });
  if (isPhone()) showTab("stitch");
}

/** everything a search can match: name, slot, rarity, affixes and their stats, ability, "kept" */
function searchText(p: Part) {
  const b = BASES[p.base];
  const bits = [partName(p), b.name, slotName(b.slot), rarityLabel(p), `i${p.ilvl}`];
  for (const a of p.affixes) bits.push(AFFIX[a.k].name, AFFIX[a.k].fmt(affixValue(a, p.ilvl)), `T${a.t}`);
  for (const [st, v] of implicits(p)) bits.push(IMPLICIT_TEXT[st](v));
  if (b.unique) bits.push("unique", b.unique.text);
  if (p.sig) bits.push("signature elite");
  if (b.ab) bits.push(ABILITY[b.ab].name);
  if (isKept(p)) bits.push("kept");
  return bits.join(" ").toLowerCase();
}

export function matchesSearch(p: Part, q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = searchText(p);
  return words.every((w) => text.includes(w));
}

/** does a part pass the current filters? */
export function shownByFilters(p: Part) {
  const slotOk = !ui.slots.length || ui.slots.includes(BASES[p.base].slot);
  return slotOk && matchesSearch(p, ui.search);
}

export function filteredParts(g: Game) {
  return g.s.parts.filter(shownByFilters);
}

export function Delta({ g, p, base0 }: { g: Game; p: Part; base0: Stats }) {
  const w = g.wornBy(p);
  if (w >= 0) {
    if (g.s.squad.length < 2) return <span className="muted">worn</span>;
    // worn by the Abomination you're stitching onto, or by someone else in the squad
    return <span className={w === selAbom(g.s.squad.length) ? "muted" : "onother"}>on {g.s.squad[w].name}</span>;
  }
  const b = calc(g, { abom: selAbom(g.s.squad.length), swap: p, ignoreBuffs: true });
  const d = (b.dps - base0.dps) / base0.dps, h = (b.maxHp - base0.maxHp) / base0.maxHp;
  const f = (x: number, l: string) => (Math.abs(x) < 0.005 ? null : <span className={x > 0 ? "up" : "down"}>{x > 0 ? "+" : ""}{Math.round(x * 100)}% {l}</span>);
  const a = f(d, "dps"), c = f(h, "hp");
  if (!a && !c) return <span className="faint">same</span>;
  return <>{a}{a && c && <br />}{c}</>;
}

const tierPoints = (p: Part) => p.affixes.reduce((t, a) => t + (6 - a.t), 0);

function Filters() {
  const g = useGame();
  // how many parts each slot button would show, given the search box
  const n = (k: string) => g.s.parts.filter((p) => (k === "all" || BASES[p.base].slot === k) && matchesSearch(p, ui.search)).length;
  const isOn = (k: string) => (k === "all" ? !ui.slots.length : ui.slots.includes(k as SlotId));
  const click = (k: string) => {
    if (k === "all") setUi({ slots: [] });
    else setUi({ slots: ui.slots.includes(k as SlotId) ? ui.slots.filter((x) => x !== k) : [...ui.slots, k as SlotId] });
  };
  const opts: [string, string][] = [["all", "All"], ...SLOTS.map((s) => [s.id, s.name] as [string, string])];
  return (
    <div className="filters" id="filters">
      {opts.map(([k, label]) => (
        <button key={k} className={`btn small ${isOn(k) ? "on" : ""}`} aria-pressed={isOn(k)} onClick={() => click(k)}>{label} <span className="cnt">{n(k)}</span></button>
      ))}
      <button className="btn small" title="Render every unworn, unkept Common part into Corpse Mass" onClick={() => act((g) => { renderCommons(g); if (!g.partById(ui.sel)) ui.sel = null; })}>Render Commons</button>
      <button className="btn small" title="Render every unworn, unkept part the filters are showing" onClick={() => openModal({ kind: "renderAll" })}>Render all…</button>
      <button className={`btn small ${ui.pick ? "on" : ""}`} aria-pressed={!!ui.pick} title="Pick several parts, then Keep or Render them together" onClick={() => setUi({ pick: ui.pick ? null : [] })}>
        {ui.pick ? "Done selecting" : "Select…"}
      </button>
    </div>
  );
}

function PickBar() {
  const g = useGame();
  if (!ui.pick) return null;
  ui.pick = ui.pick.filter((id) => {
    const q = g.partById(id);
    return q && !g.isWorn(q);
  });
  const n = ui.pick.length;
  const keep = (on: boolean) => {
    const list = ui.pick!.map((id) => g.partById(id)!).filter(Boolean);
    act((g) => g.log(`${on ? "Kept" : "Unkept"} ${setKept(list, on)} part${list.length === 1 ? "" : "s"}.`));
    setUi({ pick: [] });
  };
  return (
    <div className="pickbar" id="pickBar">
      <span className="cnt">{n} selected</span>
      <button className="btn small" onClick={() => setUi({ pick: filteredParts(g).filter((p) => !g.isWorn(p)).map((p) => p.id) })}>Select all shown</button>
      <button className="btn small" disabled={!n} onClick={() => setUi({ pick: [] })}>Clear</button>
      <button className="btn small" disabled={!n} onClick={() => keep(true)}>Keep</button>
      <button className="btn small" disabled={!n} onClick={() => keep(false)}>Unkeep</button>
      <button className="btn small danger" disabled={!n} onClick={() => openModal({ kind: "renderPicked" })}>Render…</button>
    </div>
  );
}

/** the worn parts the filters show, one Abomination after another, in slot order */
export function wornShown(g: Game, abom: number) {
  return SLOTS.map((sl) => g.partById(g.s.squad[abom].eq[sl.id])).filter((p): p is Part => !!p && shownByFilters(p));
}

/** the parts the Workbench steps through: the worn section (when open), then the stash in the chosen sort order */
export function sortedParts(g: Game) {
  const worn = ui.wornOpen ? g.s.squad.flatMap((_, i) => wornShown(g, i)) : [];
  return [...worn, ...sortedStash(g)];
}

/** the unworn parts the filters show, in the chosen sort order */
function sortedStash(g: Game) {
  const base0 = calc(g, { abom: selAbom(g.s.squad.length), ignoreBuffs: true });
  const sort = g.s.opt.sort;
  const l = filteredParts(g).filter((p) => !g.isWorn(p));
  const gain = new Map(l.map((p) => [p.id, sort === "upgrade" ? partGain(g, p, base0, selAbom(g.s.squad.length)) : 0]));
  return l.sort((a, b) =>
    (sort === "upgrade" ? gain.get(b.id)! - gain.get(a.id)! : sort === "ilvl" ? b.ilvl - a.ilvl : sort === "tier" ? tierPoints(b) - tierPoints(a) : 0) ||
    b.id - a.id,
  );
}

/** a key that changes whenever the list's contents or order could change */
export const listKey = (g: Game) => {
  const s = g.s;
  return s.parts.length + ":" + s.nextId + ":" + JSON.stringify(s.squad) + ":" + ui.abom + ui.slots.join() + ui.search + s.opt.sort + JSON.stringify(s.gens);
};

/** one worn part: small, so a whole squad's gear fits above the stash */
function WornRow({ p }: { p: Part }) {
  return (
    <button data-id={p.id} data-tip={"part-" + p.id} className={`item worn r-${rarityClass(p)} ${!ui.pick && ui.sel === p.id ? "sel" : ""} ${ui.pick ? "worn-dim" : ""}`} onClick={() => !ui.pick && selectPart(p.id)}>
      <PartIcon base={p.base} blank />
      <span className={`n tc-${rarityClass(p)}`}>{partName(p)}</span>
      <span className="meta">{slotName(BASES[p.base].slot)} · i{p.ilvl} {p.affixes.map((a, i) => <span key={i} className={`tb t${a.t}`}>T{a.t}</span>)}</span>
    </button>
  );
}

/** an empty slot: clicking it shows the stash parts that fit */
function EmptyRow({ slot }: { slot: SlotId }) {
  return (
    <button className="item worn emptyslot" title={`Show the ${slotName(slot)} parts in your stash`} onClick={() => setUi({ slots: [slot] })}>
      <span className="n faint">Empty {slotName(slot)} <span className="meta">· show parts that fit</span></span>
    </button>
  );
}

/** what each Abomination wears, kept apart from the stash and labelled by who wears it */
function WornSection() {
  const g = useGame();
  const sq = g.s.squad, ab = selAbom(sq.length), many = sq.length > 1;
  const open = ui.wornOpen;
  // empty slots only show when the filters would show that slot and nothing is being searched
  const emptyShown = (a: number) => (ui.search ? [] : SLOTS.filter((sl) => !sq[a].eq[sl.id] && (!ui.slots.length || ui.slots.includes(sl.id))));
  const blocks = sq.map((_, i) => ({ i, worn: wornShown(g, i), empty: emptyShown(i) })).filter((b) => b.worn.length || b.empty.length);
  if (!blocks.length) return null;
  // with a squad, only the Abomination you compare with is unfolded, unless you fold others open, or a filter
  // narrows things down to a few rows each (that's when reading across the squad matters)
  const narrowed = !!ui.slots.length || !!ui.search;
  const shown = (i: number) => !many || narrowed || (ui.wornUnfold.includes(i) ? true : i === ab && !ui.wornFold.includes(i));
  const toggle = (i: number) => {
    const isOpen = shown(i);
    setUi({ wornUnfold: isOpen ? ui.wornUnfold.filter((x) => x !== i) : [...ui.wornUnfold, i], wornFold: isOpen ? [...ui.wornFold, i] : ui.wornFold.filter((x) => x !== i) });
  };
  return (
    <section className="wornsec" id="wornSec">
      <button className="sechead" aria-expanded={open} onClick={() => setUi({ wornOpen: !open })}>
        <span>{open ? "▾" : "▸"} Worn</span>
        <span className="faint">{many ? `by your squad of ${sq.length}` : `by ${sq[0].name}`}</span>
      </button>
      {open && blocks.map(({ i, worn, empty }) => (
        <div key={i} className={`wornab ${many && i === ab ? "cmp" : ""}`}>
          {many && (
            <div className="wornab-h">
              <button className="wornab-name" aria-expanded={shown(i)} onClick={() => toggle(i)}>
                {shown(i) ? "▾" : "▸"} <b>{sq[i].name}</b>{" "}
                <span className="faint">{i === 0 ? "Vanguard" : `Slot ${i + 1}`} · {SLOTS.filter((sl) => sq[i].eq[sl.id]).length} of {SLOTS.length} worn</span>
              </button>
              {i === ab ? <span className="cmptag">Comparing</span> : <button className="btn small" onClick={() => setUi({ abom: i })}>Compare with</button>}
            </div>
          )}
          {shown(i) && <div className="wornrows">
            {worn.map((p) => <WornRow key={p.id} p={p} />)}
            {empty.map((sl) => <EmptyRow key={sl.id} slot={sl.id} />)}
          </div>}
        </div>
      ))}
    </section>
  );
}

function StashList() {
  const g = useGame();
  const base0 = calc(g, { abom: selAbom(g.s.squad.length), ignoreBuffs: true });
  // the list only needs rebuilding when parts, filters or worn gear change
  const key = listKey(g);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => sortedStash(g), [key]);

  const click = (p: Part) => {
    if (ui.pick) {
      setUi({ pick: ui.pick.includes(p.id) ? ui.pick.filter((x) => x !== p.id) : [...ui.pick, p.id] });
    } else selectPart(p.id);
  };

  const filtered = ui.slots.length || ui.search;
  return (
    <div className="stash" id="stash">
      <WornSection />
      <div className="sechead stashhead">
        <span>Stash</span>
        <span className="faint">{filtered ? `${list.length} shown of ${g.looseCount()}` : `${list.length} unworn`}</span>
      </div>
      {!list.length && <p className="faint" style={{ margin: "2px 0" }}>{filtered ? "No stash parts match these filters." : "Nothing here yet."}</p>}
      {!list.length && filtered && <button className="btn small" style={{ alignSelf: "flex-start" }} onClick={() => setUi({ slots: [], search: "" })}>Clear filters</button>}
      {list.map((p) => {
        const picked = !!ui.pick?.includes(p.id);
        return (
          <button key={p.id} data-id={p.id} data-tip={"part-" + p.id} className={`item r-${rarityClass(p)} ${!ui.pick && ui.sel === p.id ? "sel" : ""} ${picked ? "picked" : ""}`} aria-pressed={ui.pick ? picked : undefined} onClick={() => click(p)}>
            <PartIcon base={p.base} blank />
            <span className={`n tc-${rarityClass(p)}`}>
              {ui.pick && <i className="ck">{picked ? "✓" : ""}</i>}
              {p.isNew && <><i className="newdot" /> </>}
              {partName(p)}
            </span>
            <span className="delta"><Delta g={g} p={p} base0={base0} /></span>
            <span className="meta">
              {isKept(p) && <span className="kept">Kept</span>}
              {p.sig && <span className="sigtag">Signature</span>}
              {slotName(BASES[p.base].slot)} · i{p.ilvl}{" "}
              {p.affixes.map((a, i) => <span key={i} className={`tb t${a.t}`}>T{a.t}</span>)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function StitcheryPanel() {
  const g = useGame();
  const lc = g.looseCount();
  if (ui.sel !== null && !g.partById(ui.sel)) ui.sel = null;
  return (
    <Panel
      id="stitch"
      title="Stitchery"
      small={<span className={lc >= TUNE.stashMax - 5 ? "down" : ""} data-tip="x-stash" tabIndex={0}>{lc} / {TUNE.stashMax} in stash<Info /></span>}
    >
      <Filters />
      <div className="toggles" id="stashOpts">
        <label>
          Sort{" "}
          <select value={g.s.opt.sort} onChange={(e) => act((g) => (g.s.opt.sort = e.target.value as SortId))}>
            <option value="new">Newest</option>
            <option value="upgrade">Upgrades first</option>
            <option value="ilvl">Item level</option>
            <option value="tier">Best rolls</option>
          </select>
        </label>
        <input
          type="search"
          className="search"
          placeholder="Search parts…"
          aria-label="Search parts"
          title="Matches names, slots, rarity, stats, tiers and abilities. Try: frenzy, rare, T3, skull, bury"
          value={ui.search}
          onChange={(e) => setUi({ search: e.target.value })}
        />
      </div>
      <AbomPicker />
      <PickBar />
      <StashList />
      <p className="faint" style={{ margin: 0, fontSize: ".8rem" }}>Hover a part to compare it with what you wear. Click or tap it to open the Workbench.</p>
    </Panel>
  );
}

