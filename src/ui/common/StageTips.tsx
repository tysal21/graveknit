import type { ReactNode } from "react";
import { AFFIX } from "../../content/affixes";
import { actForStage, BASES } from "../../content/acts";
import { TUNE } from "../../content/tune";
import { enemyHit, trashHp } from "../../engine/combat";
import { fmt, pct } from "../../engine/format";
import type { Game } from "../../engine/game";
import type { Affix, Part } from "../../engine/state";
import { affixFits, affixRange, allowedTiers } from "../../engine/parts";
import { artUrl, PartIcon } from "../art";
import { selAbom } from "../uiStore";
import { CompareStrip, EquippedCard, PartSummary } from "./PartCompare";

// Previews for the "Who lives here" list: hover (desktop) or tap (phone) an enemy or the part it drops.
// Keys: "foe-<stage>-<foe key>" and "base-<base key>". Parts preview at the stage's item level.

/** the tip for a "foe-" or "base-" key, or null if it isn't one of ours */
export function stageTip(g: Game, key: string): ReactNode {
  const [kind, a, b] = key.split("-");
  if (kind === "foe" && b) return <FoeTip g={g} stage={+a} foeKey={b} />;
  if (kind === "base" && a) return <BaseTip g={g} base={a} />;
  return null;
}

function FoeTip({ g, stage, foeKey }: { g: Game; stage: number; foeKey: string }) {
  const act = actForStage(stage);
  const f = act.foes[foeKey];
  const w = act.stageFoes[stage];
  if (!f || !w) return null;
  const share = w[foeKey] / Object.values(w).reduce((x, y) => x + y, 0);
  const hp = trashHp(stage) * f.hp;
  const hit = enemyHit(stage) * f.dmg;
  const dps = g.dps();
  const src = artUrl("foe-" + foeKey);
  return (
    <>
      <div className="tiphead">
        {src && <img className="px-icon" src={src} width={64} height={64} alt="" />}
        <div>
          <b className="h">{f.name}</b>
          <p>Stage {stage} · {Math.round(share * 100)}% of the enemies here</p>
        </div>
      </div>
      <table>
        <tbody>
          <tr><td>HP</td><td>{fmt(hp)}</td></tr>
          <tr><td>Hits for</td><td>{fmt(hit)} every {f.int}s</td></tr>
          {/* the same numbers set against your squad, so you can tell if it's a threat */}
          <tr><td>Your kill time</td><td>{dps > 0 ? `${(hp / dps).toFixed(1)}s` : "never"}</td></tr>
          <tr><td>Each hit takes</td><td>{pct(hit / g.c.maxHp)} of your Vanguard's HP</td></tr>
          {f.cm && <tr><td>Corpse Mass</td><td>×{f.cm} per kill</td></tr>}
        </tbody>
      </table>
      <div className="tiphead">
        <PartIcon base={f.drop} size={24} />
        <span>Drops <b>{BASES[f.drop].name}</b> ({pct(TUNE.partChance)} of kills)</span>
      </div>
    </>
  );
}

function BaseTip({ g, base }: { g: Game; base: string }) {
  const b = BASES[base];
  if (!b) return null;
  const ilvl = g.s.stage;
  const ab = selAbom(g.s.squad.length);
  // a plain Common copy at this stage's item level, so the Stitchery's cards can show it beside what you wear
  const sample: Part = { id: -1, base, ilvl, rarity: "common", affixes: [], residue: 0, isNew: false, born: 0 };
  const best = Math.min(...allowedTiers(ilvl));
  // the affixes this part leans toward, at the best tier this item level can roll
  const leans = b.lean.filter((k) => affixFits(k, sample));
  const tot = TUNE.rarityW.common + TUNE.rarityW.magic + TUNE.rarityW.rare;
  return (
    <>
      <div className="pcmp">
        <PartSummary g={g} p={sample} label={`Drops here at item level ${ilvl}`} />
        <EquippedCard g={g} p={sample} abom={ab} />
      </div>
      <CompareStrip g={g} p={sample} abom={ab} />
      <table>
        <tbody>
          <tr><td colSpan={2} className="sub">Magic and Rare ones roll these 3× more often (up to Tier {best} here)</td></tr>
          {/* the affix's own wording with its range dropped in, e.g. "+5–8 hit damage" */}
          {leans.map((k) => (
            <tr key={k}><td>{AFFIX[k].name}</td><td>{AFFIX[k].fmt(0).replace("0", affixRange({ k, t: best, roll: 0 } as Affix, ilvl))}</td></tr>
          ))}
        </tbody>
      </table>
      <p>
        Common {pct(TUNE.rarityW.common / tot)} (no affixes) · Magic {pct(TUNE.rarityW.magic / tot)} (1 prefix, 1 suffix) · Rare {pct(TUNE.rarityW.rare / tot)} (2 and 2)
      </p>
      <p className="faint"><i>{b.flavor}</i></p>
    </>
  );
}
