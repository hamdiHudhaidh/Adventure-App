"use client";

import { useState } from "react";
import type { LngLat } from "@/lib/data/types";
import { formatLngLat, getCurrentPosition } from "@/lib/geo";
import { IconGps, IconTarget } from "../hud/icons";
import { useMapHandle } from "./MapContext";

/**
 * Crosshair placement mode: pan the map under the reticle (touch friendly),
 * or jump to GPS, then confirm. Reused anywhere we need to pick a location.
 */
export default function PlacementOverlay({
  title,
  hint,
  confirmLabel = "Drop pin here",
  onConfirm,
  onCancel,
  center,
  children,
  extraActions,
}: {
  title: string;
  hint?: string;
  confirmLabel?: string;
  onConfirm: (lngLat: LngLat) => void;
  onCancel: () => void;
  center: LngLat;
  /** e.g. a thumbnail of the photo being placed */
  children?: React.ReactNode;
  extraActions?: React.ReactNode;
}) {
  const handle = useMapHandle();
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-0 z-[1300]">
      <div className="placement-reticle" aria-hidden>
        <IconTarget size={56} />
      </div>
      <div className="placement-bar pointer-events-auto">
        {children}
        <div className="min-w-0 flex-1">
          <p className="hud-kicker">{title}</p>
          <p className="placement-coords">{formatLngLat(center)}</p>
          <p className="placement-hint">{gpsError ?? hint ?? "Pan the map to line up the reticle."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="hud-btn"
            disabled={locating}
            onClick={async () => {
              setGpsError(null);
              setLocating(true);
              try {
                const pos = await getCurrentPosition();
                handle?.map.flyTo({ center: pos, zoom: Math.max(handle.map.getZoom(), 14) });
              } catch (err) {
                setGpsError(err instanceof Error ? err.message : "Location unavailable");
              } finally {
                setLocating(false);
              }
            }}
          >
            <IconGps size={16} /> {locating ? "Locating…" : "My location"}
          </button>
          {extraActions}
          <button type="button" className="hud-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="hud-btn hud-btn-primary"
            onClick={() => {
              const c = handle?.map.getCenter();
              onConfirm(c ? [c.lng, c.lat] : center);
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
