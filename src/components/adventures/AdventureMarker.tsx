"use client";

import MapMarker from "@/components/map/MapMarker";
import type { Adventure, LngLat } from "@/lib/data/types";
import { LookBadge } from "./looks";

/** Adventure banner on the map: a unique badge raised above its picture. */
export default function AdventureMarker({
  adventure,
  lngLat,
  members,
  joined,
  onOpen,
}: {
  adventure: Adventure;
  lngLat: LngLat;
  members: number;
  joined: boolean;
  onOpen: () => void;
}) {
  return (
    <MapMarker lngLat={lngLat} zIndex={60}>
      <button
        type="button"
        className={`adv-marker ${adventure.status === "draft" ? "is-draft" : ""} ${joined ? "is-joined" : ""}`}
        style={{ ["--adv" as string]: adventure.look.color }}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        aria-label={`Adventure: ${adventure.name}`}
      >
        <span className="adv-marker-label">
          <span className="adv-marker-name">{adventure.name}</span>
          <span className="adv-marker-meta">
            {adventure.status === "draft" ? "Draft · " : ""}
            {joined ? "Joined" : members >= adventure.capacity ? "Full" : `${members}/${adventure.capacity} joined`}
          </span>
        </span>
        <span className="adv-marker-badge">
          <span className="adv-marker-ring" aria-hidden />
          <LookBadge look={adventure.look} size={46} />
        </span>
        <span className="adv-marker-stake" aria-hidden />
      </button>
    </MapMarker>
  );
}
