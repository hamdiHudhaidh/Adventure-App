"use client";

import { useEffect, useMemo } from "react";
import type { LngLat } from "./maplibre";
import { useMapHandle } from "./MapContext";

export type MapLine = { coords: LngLat[]; color: string; state: "done" | "open" | "locked" };

const STYLES: Record<MapLine["state"], Record<string, unknown>> = {
  done: { "line-width": 3, "line-opacity": 0.95 },
  open: { "line-width": 2.5, "line-opacity": 0.9, "line-dasharray": [2, 1.6] },
  locked: { "line-width": 1.6, "line-opacity": 0.45, "line-dasharray": [0.6, 1.8] },
};

/** Dashed/dotted GeoJSON route lines drawn under the DOM markers. */
export default function MapLines({ id, lines }: { id: string; lines: MapLine[] }) {
  const handle = useMapHandle();
  const data = useMemo(
    () => ({
      type: "FeatureCollection",
      features: lines.map((l) => ({
        type: "Feature",
        properties: { color: l.color, state: l.state },
        geometry: { type: "LineString", coordinates: l.coords },
      })),
    }),
    [lines],
  );

  useEffect(() => {
    if (!handle) return;
    const { map } = handle;
    let added = false;
    const add = () => {
      if (map.getSource(id)) return;
      map.addSource(id, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      (Object.keys(STYLES) as MapLine["state"][]).forEach((state) =>
        map.addLayer({
          id: `${id}-${state}`,
          type: "line",
          source: id,
          filter: ["==", ["get", "state"], state],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["get", "color"], ...STYLES[state] },
        }),
      );
      added = true;
    };
    if (map.isStyleLoaded()) add();
    else map.once("idle", add);
    return () => {
      if (!added) return;
      try {
        (Object.keys(STYLES) as MapLine["state"][]).forEach((s) => map.getLayer(`${id}-${s}`) && map.removeLayer(`${id}-${s}`));
        if (map.getSource(id)) map.removeSource(id);
      } catch {
        /* map already destroyed */
      }
    };
  }, [handle, id]);

  useEffect(() => {
    if (!handle) return;
    const apply = () => handle.map.getSource(id)?.setData(data);
    apply();
    // Source may be added on the next idle; push data again then.
    handle.map.once("idle", apply);
  }, [handle, id, data]);

  return null;
}
