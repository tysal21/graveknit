import { SLOTS } from "../../content/slots";
import { TUNE } from "../../content/tune";
import { makeVanguard } from "../../engine/combat";
import { canInfuse, infuse, infuseCost } from "../../engine/economy";
import { fmt } from "../../engine/format";
import { partName, rarityClass } from "../../engine/parts";
import { Bar } from "../common/Bar";
import { Info } from "../common/Info";
import { Panel } from "../common/Panel";
import { act, useGame } from "../runtime";
import { selAbom, setUi, showTab } from "../uiStore";
import { selectPart } from "./StitcheryPanel";

const STAT_ROWS: [string, string, (c: ReturnType<typeof useGame>["c"]) => string][] = [
  ["dps", "Damage per second", (c) => fmt(c.dps)],
  ["hit", "Hit damage", (c) => fmt(c.hit)],
  ["aps", "Attacks per second", (c) => c.aps.toFixed(2)],
  ["cc", "Crit chance", (c) => c.cc.toFixed(1) + "%"],
  ["cm", "Crit multiplier", (c) => Math.round(c.cm) + "%"],
  ["poison", "Poison per second", (c) => fmt(c.poisonDps)],
  ["hp", "Max HP", (c) => fmt(c.maxHp)],
  ["ess", "Soul Essence bonus", (c) => "+" + Math.round(c.ess) + "%"],
  ["drop", "Part drop bonus", (c) => "+" + Math.round(c.drop) + "%"],
  ["splash", "Area damage", (c) => Math.round(c.splash) + "%"],
];

/** pick which Abomination the panel shows (and the Stitchery compares against) */
function SquadTabs() {
  const g = useGame();
  const sq = g.s.squad, ab = selAbom(sq.length);
  return (
    <div className="squadTabs" id="squadTabs" role="tablist">
      {sq.map((a, i) => (
        <button key={i} role="tab" aria-selected={i === ab} className={i === ab ? "on" : ""} onClick={() => setUi({ abom: i })}>
          <b>{i + 1}</b> {a.name}
          <span className="faint">{i === 0 ? "Vanguard" : `${fmt(g.cs[i]?.dps ?? 0)} dps`}</span>
        </button>
      ))}
    </div>
  );
}

/** the next squad slot that isn't open yet */
const nextSlotText = (open: number) => {
  const later = TUNE.squadSlots.slice(open);
  if (!later.length) return null;
  return later.length > 1 ? `Squad slots ${open + 1} and ${open + 2} unlock at Stages ${later.join(" and ")}.` : `Squad slot ${open + 1} unlocks at Stage ${later[0]}.`;
};

export function SquadPanel() {
  const g = useGame();
  const sq = g.s.squad;
  const ab = selAbom(sq.length);
  const c = g.cs[ab] ?? g.c, p = g.pl, abom = sq[ab];
  const vanguard = ab === 0;
  const cost = infuseCost(abom.infusion);
  const shield = p && p.ward > 0 && p.wardUntil > g.s.clock;
  const many = sq.length > 1;
  return (
    <Panel id="squad" title="Squad" small={many ? `${fmt(g.dps())} squad dps` : "Vanguard"}>
      {many && <SquadTabs />}
      <div className="block">
        <div className="row">
          <span style={{ fontFamily: "var(--display)", fontSize: "1.1rem" }}>{abom.name}</span>
          {vanguard ? (
            <span className="num muted">{p ? `${fmt(Math.max(0, p.hp))} / ${fmt(c.maxHp)} HP` : ""}</span>
          ) : (
            <button className="btn small" onClick={() => { act((g) => makeVanguard(g, ab)); setUi({ abom: 0 }); }}>Make Vanguard</button>
          )}
        </div>
        {vanguard ? (
          <>
            <Bar tall value={p ? p.hp / c.maxHp : 1} />
            {shield && <Bar kind="shield" value={p!.ward / c.maxHp} />}
          </>
        ) : (
          <p className="faint" style={{ margin: 0, fontSize: ".8rem" }}>Fights behind the Vanguard, so it never gets hit. Its damage and abilities join the fight.</p>
        )}
      </div>
      <dl className="stats">
        {STAT_ROWS.filter(([k]) => k !== "splash" || c.splash > 0).map(([k, label, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt data-tip={"st-" + k} tabIndex={0}>{label}<Info /></dt>
            <dd data-tip={"st-" + k}>{v(c)}</dd>
          </div>
        ))}
      </dl>
      <div className="block">
        <h3 data-tip="x-inf" tabIndex={0}>Infusion<Info /></h3>
        <div className="row">
          <span>
            Level <b className="num">{c.lvl}</b>
            {abom.infusion > c.lvl && <span className="down"> ({abom.infusion} bought)</span>} of <span className="num">{c.cap}</span> · ×{c.inf.toFixed(2)}
          </span>
          <button className="btn primary small" id="infBtn" disabled={!canInfuse(g, ab)} onClick={() => act((g) => infuse(g, ab))}>
            Infuse · {fmt(cost)}
          </button>
        </div>
        <div className="faint" style={{ fontSize: ".8rem" }}>
          {abom.infusion >= c.cap
            ? `Vessel Integrity ${c.integrity.toFixed(1)} holds ${c.cap} levels. Better parts (higher item level or rarity) raise the cap.`
            : `Next level costs ${fmt(cost)} Soul Essence. Integrity ${c.integrity.toFixed(1)} ÷ 10 = cap ${c.cap}.`}
        </div>
      </div>
      <div className="block">
        <h3>Stitched parts</h3>
        <div className="slots" id="slots">
          {SLOTS.map(({ id, name }) => {
            const part = g.partById(abom.eq[id]);
            // an empty slot opens the Stitchery filtered to that slot
            if (!part)
              return (
                <button key={id} className="slot empty" onClick={() => { setUi({ slots: [id] }); showTab("stitch"); }}>
                  <span className="k">{name}</span>
                  <span className="n faint">empty · find a part</span>
                </button>
              );
            return (
              <button key={id} className={`slot r-${rarityClass(part)}`} onClick={() => selectPart(part.id)}>
                <span className="k">{name}</span>
                <span className={`n tc-${rarityClass(part)}`}>
                  {partName(part)} <span className="faint">i{part.ilvl}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {nextSlotText(sq.length) && (
        <div className="block faint" style={{ fontSize: ".8rem" }}>
          {nextSlotText(sq.length)}
        </div>
      )}
    </Panel>
  );
}
