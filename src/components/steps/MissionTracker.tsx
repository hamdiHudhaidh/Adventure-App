"use client";

import { useState, type ReactNode } from "react";
import type { Adventure, AdventureStep } from "@/lib/data/types";
import { distanceMeters, formatDistance, getCurrentPosition } from "@/lib/geo";
import { rewardText, totalRewards } from "@/lib/steps";
import Panel from "../hud/Panel";
import { IconGps, IconTarget } from "../hud/icons";
import { LookBadge } from "../adventures/looks";
import StepList from "./StepList";

/** Player-side mission view: progress, inventory and step check-ins. */
export default function MissionTracker({
  adventures,
  activeId,
  onActiveChange,
  done,
  paused,
  unlocked,
  highlightId,
  partyLabel,
  onComplete,
  onLocateStep,
  onClose,
  header,
}: {
  adventures: Adventure[];
  activeId: string;
  onActiveChange: (id: string) => void;
  done: Set<string>;
  paused?: Set<string>;
  unlocked?: Set<string>;
  highlightId?: string | null;
  partyLabel: string;
  onComplete: (step: AdventureStep, how: "gps" | "manual") => void;
  onLocateStep: (step: AdventureStep) => void;
  onClose: () => void;
  header?: ReactNode;
}) {
  const adventure = adventures.find((a) => a.id === activeId) ?? adventures[0];
  const [checking, setChecking] = useState<string | null>(null);
  const [hint, setHint] = useState<{ stepId: string; text: string } | null>(null);
  if (!adventure) return null;
  const total = adventure.steps.length;
  const count = adventure.steps.filter((s) => done.has(s.id)).length;
  const loot = totalRewards(adventure, done);

  const checkIn = async (s: AdventureStep) => {
    if (!s.lngLat) return onComplete(s, "manual");
    setChecking(s.id);
    setHint(null);
    try {
      const here = await getCurrentPosition();
      const d = distanceMeters(here, s.lngLat);
      if (d <= s.radiusM) onComplete(s, "gps");
      else setHint({ stepId: s.id, text: `You're ${formatDistance(d)} away — get within ${formatDistance(s.radiusM)}.` });
    } catch (err) {
      setHint({ stepId: s.id, text: err instanceof Error ? err.message : "Location unavailable" });
    } finally {
      setChecking(null);
    }
  };

  return (
    <Panel title={adventure.name} kicker={`Mission tracker · ${partyLabel}`} onClose={onClose}>
      {adventures.length > 1 ? (
        <div className="hud-segment mb-3">
          {adventures.map((a) => (
            <button key={a.id} type="button" className={a.id === adventure.id ? "is-active" : ""} onClick={() => onActiveChange(a.id)}>
              {a.name}
            </button>
          ))}
        </div>
      ) : null}
      {header}

      <div className="tracker-summary" style={{ ["--adv" as string]: adventure.look.color }}>
        <LookBadge look={adventure.look} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between text-xs">
            <span className="hud-kicker">Progress</span>
            <span className="tracker-count">
              {count}/{total}
            </span>
          </div>
          <div className="tracker-bar">
            <span style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
          </div>
          <p className="tracker-xp">{loot.xp} XP</p>
        </div>
      </div>

      <div className="tracker-inventory">
        <p className="hud-kicker">Inventory</p>
        {loot.items.length ? (
          <div className="step-rewards">
            {loot.items.map((r, i) => (
              <span key={`${r.id}-${i}`} className={`reward-chip is-${r.kind}`}>
                {rewardText(r)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Complete steps to earn items and badges.</p>
        )}
      </div>

      <StepList
        adventure={adventure}
        done={done}
        paused={paused}
        unlocked={unlocked}
        highlightId={highlightId}
        actions={(s, st) => (
          <>
            {s.lngLat ? (
              <button type="button" className="hud-btn hud-btn-sm" onClick={() => onLocateStep(s)}>
                <IconTarget size={14} /> Map
              </button>
            ) : null}
            {st === "available" ? (
              <>
                <button type="button" className="hud-btn hud-btn-sm hud-btn-primary" disabled={checking === s.id} onClick={() => checkIn(s)}>
                  <IconGps size={14} /> {checking === s.id ? "Locating…" : s.lngLat ? "Check in" : "Complete"}
                </button>
                {s.lngLat ? (
                  <button type="button" className="hud-btn hud-btn-sm hud-btn-ghost" onClick={() => onComplete(s, "manual")} title="For testing away from the location">
                    Mark done (demo)
                  </button>
                ) : null}
              </>
            ) : null}
            {hint?.stepId === s.id ? <p className="w-full text-xs text-amber-300">{hint.text}</p> : null}
          </>
        )}
      />
    </Panel>
  );
}
