"use client";

import type { ReactNode } from "react";
import type { Adventure, AdventureStep } from "@/lib/data/types";
import { rewardText, stepState } from "@/lib/steps";

const STATE_LABEL = { done: "Complete", available: "Unlocked", locked: "Locked", paused: "Paused" } as const;

/** Read-only progression list; callers add per-step actions. */
export default function StepList({
  adventure,
  done,
  paused,
  highlightId,
  actions,
  compact,
}: {
  adventure: Adventure;
  done: Set<string>;
  paused?: Set<string>;
  highlightId?: string | null;
  actions?: (step: AdventureStep, state: "done" | "available" | "locked" | "paused") => ReactNode;
  compact?: boolean;
}) {
  const nameOf = (id: string) => adventure.steps.find((s) => s.id === id)?.title ?? "?";
  if (!adventure.steps.length) return <p className="hud-note">No steps designed yet.</p>;
  return (
    <ol className="step-list" style={{ ["--adv" as string]: adventure.look.color }}>
      {adventure.steps.map((s, i) => {
        const base = stepState(s, done);
        const st = paused?.has(s.id) && base !== "done" ? "paused" : base;
        return (
          <li key={s.id} className={`step-row is-${st} ${highlightId === s.id ? "is-highlight" : ""}`} data-step={s.id}>
            <span className="step-row-num">{st === "done" ? "✓" : i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="step-row-title">{s.title}</p>
                <span className={`step-chip is-${st}`}>{STATE_LABEL[st]}</span>
              </div>
              {!compact && s.instruction ? <p className="step-row-text">{s.instruction}</p> : null}
              <p className="step-row-meta">
                {s.placeName || (s.lngLat ? "Pinned on map" : "Anywhere")}
                {s.prerequisites.length ? ` · after ${s.prerequisites.map(nameOf).join(" + ")}` : ""}
              </p>
              {s.rewards.length ? (
                <div className="step-rewards">
                  {s.rewards.map((r) => (
                    <span key={r.id} className={`reward-chip is-${r.kind}`}>
                      {rewardText(r)}
                    </span>
                  ))}
                </div>
              ) : null}
              {actions ? <div className="step-row-actions">{actions(s, st)}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
