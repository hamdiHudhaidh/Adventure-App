"use client";

import { useMemo } from "react";
import MapLines, { type MapLine } from "@/components/map/MapLines";
import MapMarker from "@/components/map/MapMarker";
import type { Adventure, AdventureStep } from "@/lib/data/types";
import { stepState, type StepState } from "@/lib/steps";

/** Waypoints for an adventure's steps plus dashed dependency lines. */
export default function StepMarkers({
  adventure,
  done,
  paused,
  selectedId,
  onSelect,
}: {
  adventure: Adventure;
  done: Set<string>;
  paused?: Set<string>;
  selectedId?: string | null;
  onSelect: (step: AdventureStep) => void;
}) {
  const color = adventure.look.color;
  const placed = adventure.steps.filter((s) => s.lngLat);
  const lines = useMemo<MapLine[]>(() => {
    const byId = new Map(adventure.steps.map((s) => [s.id, s]));
    const out: MapLine[] = [];
    for (const s of adventure.steps) {
      if (!s.lngLat) continue;
      const st = stepState(s, done);
      for (const pid of s.prerequisites) {
        const p = byId.get(pid);
        if (!p?.lngLat) continue;
        out.push({
          coords: [p.lngLat, s.lngLat],
          color,
          state: st === "done" ? "done" : done.has(pid) ? "open" : "locked",
        });
      }
    }
    return out;
  }, [adventure.steps, done, color]);

  return (
    <>
      <MapLines id={`route-${adventure.id}`} lines={lines} />
      {placed.map((s) => {
        const index = adventure.steps.indexOf(s) + 1;
        const st: StepState | "paused" = paused?.has(s.id) && !done.has(s.id) ? "paused" : stepState(s, done);
        return (
          <MapMarker key={s.id} lngLat={s.lngLat!} anchor="center" zIndex={selectedId === s.id ? 90 : 65}>
            <button
              type="button"
              className={`step-marker is-${st} ${selectedId === s.id ? "is-selected" : ""}`}
              style={{ ["--adv" as string]: color }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(s);
              }}
              aria-label={`Step ${index}: ${s.title} (${st})`}
            >
              <span className="step-marker-hex">{st === "done" ? "✓" : index}</span>
              <span className="step-marker-label">{s.title}</span>
            </button>
          </MapMarker>
        );
      })}
    </>
  );
}
