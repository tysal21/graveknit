import { SLOTS } from "../../content/slots";
import { canInfuse, infuse, infuseCost } from "../../engine/economy";
import { fmt } from "../../engine/format";
import { partName, rarityClass } from "../../engine/parts";
import { Bar } from "../common/Bar";
import { Info } from "../common/Info";
import { Panel } from "../common/Panel";
import { act, useGame } from "../runtime";
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
];

export function SquadPanel() {
  const g = useGame();
  const c = g.c, p = g.pl, abom = g.s.squad[0];
  const cost = infuseCost(abom.infusion);
  const shield = p && p.ward > 0 && p.wardUntil > g.s.clock;
  return (
    <Panel id="squad" title="Squad" small="Vanguard">
      <div className="block">
        <div className="row">
          <span style={{ fontFamily: "var(--display)", fontSize: "1.1rem" }}>{abom.name}</span>
          <span className="num muted">{p ? `${fmt(Math.max(0, p.hp))} / ${fmt(c.maxHp)} HP` : ""}</span>
        </div>
        <Bar tall value={p ? p.hp / c.maxHp : 1} />
        {shield && <Bar kind="shield" value={p!.ward / c.maxHp} />}
      </div>
      <dl className="stats">
        {STAT_ROWS.map(([k, label, v]) => (
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
          <button className="btn primary small" id="infBtn" disabled={!canInfuse(g)} onClick={() => act((g) => infuse(g))}>
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
            if (!part) return null;
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
      <div className="block faint" style={{ fontSize: ".8rem" }}>
        Squad slots 2 and 3 unlock at Stages 20 and 40.
      </div>
    </Panel>
  );
}
