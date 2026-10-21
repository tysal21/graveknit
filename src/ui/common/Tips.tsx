import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ABILITY } from "../../content/abilities";
import { BASES } from "../../content/acts";
import { RITUAL_TUNE } from "../../content/rituals";
import { slotName } from "../../content/slots";
import { IMPLICIT_TEXT, type StatId } from "../../content/stats";
import { TUNE } from "../../content/tune";
import { AFFIX } from "../../content/affixes";
import { essPerKill } from "../../engine/combat";
import { altarOffer, cmRate, infuseCost } from "../../engine/economy";
import { fmt, pct } from "../../engine/format";
import type { Game } from "../../engine/game";
import { affixValue, rollQuality, isKept, partIntegrity, partName, rarityClass, rarityLabel } from "../../engine/parts";
import { altarBonus, calc, statSources, wornParts, type Stats } from "../../engine/stats";
import { RARITY_INTEGRITY } from "../../content/tune";
import { useGame } from "../runtime";
import { selAbom, ui } from "../uiStore";

// Info blips: hover (desktop) or tap (phone) anything with data-tip="key" to see where its number comes from.

type Row = [ReactNode, ReactNode, string?];

function Table({ rows }: { rows: Row[] }) {
  return (
    <table>
      <tbody>
        {rows.map(([l, v, cls], i) =>
          cls === "sub" ? (
            <tr key={i}><td colSpan={2} className="sub">{l}</td></tr>
          ) : (
            <tr key={i} className={cls}><td>{l}</td><td>{v}</td></tr>
          ),
        )}
      </tbody>
    </table>
  );
}

function Tip({ h, p, rows, after }: { h: string; p?: string; rows?: Row[]; after?: ReactNode }) {
  return (
    <>
      <b className="h">{h}</b>
      {p && <p>{p}</p>}
      {rows && <Table rows={rows} />}
      {after}
    </>
  );
}

const sumOf = (rows?: [string, number][]) => (rows || []).reduce((a, [, v]) => a + v, 0);

/** one row per source, then a total */
function sourceRows(rows: [string, number][] | undefined, unit: string, total?: string, totalLabel = "Total"): Row[] {
  const out: Row[] = (rows || []).map(([l, v]) => [l, `${v > 0 && unit !== "" ? "+" : ""}${fmt(v)}${unit}`]);
  if (!out.length) out.push(["Nothing yet", ""]);
  if (total !== undefined) out.push([totalLabel, total, "tot"]);
  return out;
}

function multRows(c: Stats): Row[] {
  const r: Row[] = [[`× Infusion level ${c.lvl}`, `×${c.inf.toFixed(2)}`, "mul"]];
  if (c.altar > 0) r.push(["× Bone Altar", `×${(1 + c.altar).toFixed(2)}`, "mul"]);
  if (c.moon > 1) r.push(["× Blood Moon", `×${c.moon.toFixed(2)}`, "mul"]);
  return r;
}

export function PartTip({ g, id }: { g: Game; id: number }) {
  const p = g.partById(id);
  if (!p) return null;
  const b = BASES[p.base];
  const imp = b.imp.map(([st, f]) => IMPLICIT_TEXT[st](f(p.ilvl))).join(" · ");
  let cmp: ReactNode = null;
  if (!g.isWorn(p)) {
    const ab = selAbom(g.s.squad.length);
    const a = calc(g, { abom: ab, ignoreBuffs: true }), c2 = calc(g, { abom: ab, swap: p, ignoreBuffs: true });
    const w = g.partById(g.s.squad[ab].eq[b.slot]);
    cmp = (
      <Table
        rows={[
          [`vs ${w ? partName(w) : "empty slot"}`, ""],
          ["DPS", <>{fmt(a.dps)} → <b className={c2.dps >= a.dps ? "up" : "down"}>{fmt(c2.dps)}</b></>],
          ["Max HP", <>{fmt(a.maxHp)} → <b className={c2.maxHp >= a.maxHp ? "up" : "down"}>{fmt(c2.maxHp)}</b></>],
        ]}
      />
    );
  }
  return (
    <>
      <b className={`h tc-${rarityClass(p)}`}>{partName(p)}</b>
      <p>
        {rarityLabel(p)} {slotName(b.slot)} · item level {p.ilvl}
        {g.isWorn(p) ? (g.s.squad.length > 1 ? ` · worn by ${g.s.squad[g.wornBy(p)].name}` : " · worn") : ""}
        {isKept(p) ? " · kept" : ""}
      </p>
      <div>
        {imp}
        {b.ab && <> · <b>{ABILITY[b.ab].name}</b></>}
      </div>
      {p.affixes.length ? (
        p.affixes.map((a, i) => (
          <div className="afl" key={i}>
            <span className={`tb t${a.t}`}>T{a.t}</span>
            <span>{AFFIX[a.k].fmt(affixValue(a, p.ilvl))} <span className={`q ${rollQuality(a.roll).cls}`}>{rollQuality(a.roll).label}</span></span>
          </div>
        ))
      ) : (
        <p>No affixes (Common).</p>
      )}
      {cmp}
    </>
  );
}

export function tipContent(g: Game, key: string): ReactNode {
  if (key.startsWith("part-")) return <PartTip g={g} id={+key.slice(5)} />;
  const s = g.s;
  const ab = selAbom(s.squad.length);
  const c = calc(g, { abom: ab });
  const m = statSources(g, ab);
  const st = s.stage;
  const many = s.squad.length > 1;
  const squadEss = g.bonus("ess");
  const kill = essPerKill(st) * (1 + squadEss / 100);
  const raise = s.rit.raise.until > s.clock ? 1 + s.rit.raise.power : 1;
  const raiseRow: Row[] = raise > 1 ? [["Raise the Fallen is active", `×${raise}`, "mul"]] : [];
  const boss = g.act().boss;
  const abom = s.squad[ab];
  const cmFoes = Object.values(g.act().foes).filter((f) => f.cm);
  const statTip = (id: StatId, h: string, p: string, unit: string, total: string) => <Tip h={h} p={p} rows={sourceRows(m[id], unit, total)} />;

  switch (key) {
    case "r-cm":
      return <Tip h="Corpse Mass" p="Buys generators in the Graveyard and feeds the Bone Altar." rows={[
        ["Generators", `${fmt(cmRate(g))}/s`],
        [`Each kill on Stage ${st}`, fmt(st * TUNE.cmPerKill)],
        ...cmFoes.map((f): Row => [`${f.name} kills`, `×${f.cm}`]),
        ["Grave Hunger Ritual", fmt(Math.max(RITUAL_TUNE.hungerMin, cmRate(g) * RITUAL_TUNE.hungerSecs))],
        [`${boss.name} kill`, String(TUNE.bossCm)],
        ["Rendering a part", "5 × item level"],
      ]} />;
    case "r-ess":
      return <Tip h="Soul Essence" p="Spent on Infusion in the Squad panel. Each level gives +12% damage and HP." rows={[
        [`Each kill on Stage ${st}`, fmt(kill)],
        [many ? "Includes your squad's Soul Essence bonus" : "Includes your Soul Essence bonus", `+${Math.round(squadEss)}%`],
        [`${boss.name} kill`, fmt(essPerKill(boss.stage) * TUNE.bossEssMult * (1 + squadEss / 100))],
        ["Next Infusion level", fmt(infuseCost(abom.infusion))],
      ]} />;
    case "r-mar":
      return <Tip h="Marrow Shard" p="Rerolls every unlocked affix on a part: new stats, new tiers." rows={[
        ["Chance per kill", pct(TUNE.marrowChance * raise)],
        [`${boss.name} kill`, String(TUNE.bossLoot.marrow)],
        ["Grafting costs", String(TUNE.graftMarrow)],
        ...raiseRow,
      ]} />;
    case "r-dust":
      return <Tip h="Grave Dust" p="Keeps each affix's tier but rerolls its number inside that tier." rows={[
        ["Chance per kill", pct(TUNE.dustChance * raise)],
        [`${boss.name} kill`, String(TUNE.bossLoot.dust)],
        ["Grafting costs", String(TUNE.graftDust)],
        ...raiseRow,
      ]} />;
    case "r-thr":
      return <Tip h="Spectral Thread" p="Locks one affix on a part so Marrow Shards and Grave Dust skip it. Unlocking is free; the Thread is used up." rows={[
        [`${boss.name} kill`, `${pct(TUNE.bossLoot.threadChance)} chance`],
        ["Normal enemies", "never"],
      ]} />;
    case "st-dps": {
      const crit = 1 + ((c.cc / 100) * c.cm) / 100;
      return <Tip h="Damage per second" p="Your average damage over time, against normal enemies. Abilities come on top." rows={[
        ["Hit damage", fmt(c.hit)],
        ["× Attacks per second", `×${c.aps.toFixed(2)}`],
        ["× Average crit bonus", `×${crit.toFixed(2)}`],
        ["+ Poison per second", `+${fmt(c.poisonDps)}`],
        ["Total", fmt(c.dps), "tot"],
        ...(many ? s.squad.map((a, i): Row => [`${a.name}${i === 0 ? " (Vanguard)" : ""}`, fmt(g.cs[i]?.dps ?? 0)]).concat([["Whole squad", fmt(g.dps()), "tot"]]) : []),
      ]} />;
    }
    case "st-hit": {
      const pctRows = m.dmgPct;
      const rows: Row[] = sourceRows(m.flat, "", fmt(sumOf(m.flat)), "Flat damage");
      if (pctRows) rows.push(["Damage bonuses", "", "sub"], ...sourceRows(pctRows, "%", `×${(1 + sumOf(pctRows) / 100).toFixed(2)}`, "Bonus total"));
      rows.push(...multRows(c), ["Hit damage", fmt(c.hit), "tot"]);
      return <Tip h="Hit damage" p="Flat damage first, then percentage bonuses, then multipliers." rows={rows} />;
    }
    case "st-aps":
      return <Tip h="Attacks per second" p={`Base ${TUNE.baseAps} attack per second, raised by attack speed bonuses. Haste adds 60% more for 5 seconds.`}
        rows={[...sourceRows((m.as || []).filter((r) => r[1]), "%", `×${(1 + sumOf(m.as) / 100).toFixed(2)}`, "Speed bonus"), ["Attacks per second", c.aps.toFixed(2), "tot"]]} />;
    case "st-cc":
      return statTip("cc", "Crit chance", "Chance for a hit to crit. Crits deal extra damage equal to your crit multiplier.", "%", c.cc.toFixed(1) + "%");
    case "st-cm":
      return statTip("cm", "Crit multiplier", "How much extra damage a crit deals. 65% means a crit hits for 1.65×.", "%", Math.round(c.cm) + "%");
    case "st-poison":
      return <Tip h="Poison per second" p="Damage dealt every second on its own, without attacking. Helps most when you're idle."
        rows={[...sourceRows(m.poison, "/s"), ...multRows(c), ["Poison per second", fmt(c.poisonDps), "tot"]]} />;
    case "st-hp":
      return <Tip h="Max HP" p="How much damage your Abomination can take. It heals 8% on each kill and 1% per second between kills, but not during boss fights."
        rows={[
          ...sourceRows(m.hpFlat, "", fmt(sumOf(m.hpFlat)), "Base HP"),
          [`× Infusion level ${c.lvl}`, `×${c.inf.toFixed(2)}`, "mul"],
          ...(m.hpPct ? sourceRows(m.hpPct, "%", `×${(1 + sumOf(m.hpPct) / 100).toFixed(2)}`, "HP bonus") : []),
          ["Max HP", fmt(c.maxHp), "tot"],
        ]} after={many ? <p>Only the Vanguard takes hits, so only the Vanguard's HP matters in a fight.</p> : undefined} />;
    case "st-ess":
      return <Tip h="Soul Essence bonus" p={"Extra Soul Essence from every kill." + (many ? " Every squad member's parts add to it; generators and Thralls count once." : "")}
        rows={[...sourceRows(m.ess, "%", "+" + Math.round(c.ess) + "%"), ...(many ? [["Whole squad", `+${Math.round(squadEss)}%`, "tot"] as Row] : [])]} />;
    case "st-drop":
      return <Tip h="Part drop bonus" p={`Raises the ${pct(TUNE.partChance)} base chance that a kill drops a body part.` + (many ? " Every squad member's parts add to it; generators and Thralls count once." : "")}
        rows={[...sourceRows(m.drop, "%", "+" + Math.round(c.drop) + "%"), ...(many ? [["Whole squad", `+${Math.round(g.bonus("drop"))}%`, "tot"] as Row] : [])]} />;
    case "x-stash": {
      const lc = g.looseCount();
      const kept = s.parts.filter((p) => !g.isWorn(p) && isKept(p)).length;
      return <Tip h="Stash" p={`Holds ${TUNE.stashMax} unworn parts. Worn parts don't count. When it is full, your oldest unkept part is rendered into Corpse Mass to make room for each new one. Kept parts are never touched.`}
        rows={[["Parts in the stash", `${lc} / ${TUNE.stashMax}`], ["Kept (safe)", String(kept)], ["Space left", String(Math.max(0, TUNE.stashMax - lc))]]}
        after={<p>Keep a part to protect it from Render all, Render Commons and the full-stash clean-up.</p>} />;
    }
    case "x-inf": {
      const rows: Row[] = [["Vessel Integrity (item level × rarity)", "", "sub"]];
      for (const p of wornParts(g, ab)) rows.push([<>{BASES[p.base].name} <span className="faint">i{p.ilvl} × {RARITY_INTEGRITY[rarityClass(p)]}</span></>, partIntegrity(p).toFixed(1)]);
      rows.push(
        [`Integrity ${c.integrity.toFixed(1)} ÷ 10`, `cap ${c.cap}`, "tot"],
        ["Levels bought", String(abom.infusion)],
        ["Levels held by these parts", String(c.lvl)],
        ["Current multiplier", `×${c.inf.toFixed(2)}`, "mul"],
        abom.infusion < c.cap ? ["Next level costs", `${fmt(infuseCost(abom.infusion))} Essence`] : ["Next level", `needs cap ${abom.infusion + 1}`],
        ["Each level costs more", `×${TUNE.infuseGrow}`],
      );
      return <Tip h="Infusion" p={`Spend Soul Essence to raise your Abomination's level. Each level multiplies damage, poison and HP by ×${TUNE.infuseMult}. Your parts' Vessel Integrity limits how many levels the body can hold.`}
        rows={rows} after={<p>Common parts count ×0.5, Magic ×1, Rare and trophies ×1.5. Swapping in weaker parts keeps your bought levels, but only the held ones count.</p>} />;
    }
    case "x-altar": {
      const give = altarOffer(g), now = altarBonus(s.altar), after = altarBonus(s.altar + give);
      const at = (x: number) => (altarBonus(x) * 100).toFixed(1) + "%";
      return <Tip h="Bone Altar" p="Sacrifice Corpse Mass for a damage bonus that lasts the whole run. Each sacrifice is worth less than the last, so it's best when you have Corpse Mass to spare." rows={[
        ["Corpse Mass given so far", fmt(s.altar)],
        ["Damage bonus now", `+${(now * 100).toFixed(1)}%`, "mul"],
        [`Sacrifice half now (${fmt(give)})`, `+${(after * 100).toFixed(1)}%`],
        ["Bonus by total given", "", "sub"],
        ["500", "+" + at(500)], ["5,000", "+" + at(5000)], ["50,000", "+" + at(50000)],
      ]} after={<p>The bonus multiplies hit damage and poison. It lasts until Death (coming in a later act). Losing a fight doesn't touch it.</p>} />;
    }
  }
  return null;
}

/** the floating tip box; listens for hover, focus and taps on anything with data-tip */
export function TipLayer() {
  const g = useGame();
  const [tip, setTip] = useState<{ key: string; el: HTMLElement; pinned: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const pinned = useRef(false);
  pinned.current = !!tip?.pinned;

  useEffect(() => {
    const isPartTip = (el: HTMLElement) => el.dataset.tip!.startsWith("part-");
    const canHover = () => matchMedia("(hover:hover)").matches;
    const over = (e: MouseEvent) => {
      if (pinned.current) return;
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
      if (el && !(isPartTip(el) && (ui.pick || !canHover()))) setTip({ key: el.dataset.tip!, el, pinned: false });
    };
    const out = (e: MouseEvent) => {
      if (pinned.current) return;
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
      if (el && !el.contains(e.relatedTarget as Node)) setTip(null);
    };
    const focus = (e: FocusEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
      if (el && !isPartTip(el)) setTip({ key: el.dataset.tip!, el, pinned: false });
    };
    const blur = (e: FocusEvent) => {
      if (!pinned.current && (e.target as HTMLElement).closest("[data-tip]")) setTip(null);
    };
    const click = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
      if (el && isPartTip(el)) return setTip(null);
      if (el) setTip((t) => (t?.pinned && t.key === el.dataset.tip ? null : { key: el.dataset.tip!, el, pinned: true }));
      else setTip(null);
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", blur);
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", out);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", blur);
      document.removeEventListener("click", click, true);
    };
  }, []);

  // keep the tip next to its element, inside the window
  useLayoutEffect(() => {
    const t = box.current;
    if (!t || !tip) return;
    let el = tip.el;
    if (!document.body.contains(el)) {
      const again = document.querySelector<HTMLElement>(`[data-tip="${tip.key}"]`);
      if (!again) return setTip(null);
      el = again;
    }
    document.querySelectorAll(".tipon").forEach((e) => e !== el && e.classList.remove("tipon"));
    el.classList.add("tipon");
    const r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
    const x = Math.min(Math.max(12, r.left), window.innerWidth - w - 12);
    let y = r.bottom + 6;
    if (y + h > window.innerHeight - 12) y = Math.max(12, r.top - h - 6);
    t.style.left = x + "px";
    t.style.top = y + "px";
  });

  useEffect(() => {
    if (!tip) document.querySelectorAll(".tipon").forEach((e) => e.classList.remove("tipon"));
  }, [tip]);

  if (!tip) return null;
  const content = tipContent(g, tip.key);
  if (!content) return null;
  return (
    <div id="tip" role="tooltip" ref={box}>
      {content}
    </div>
  );
}
