"use client";

import { createContext, useContext } from "react";
import type { MapInstance, MapLibreNS } from "./maplibre";

export type MapHandle = { map: MapInstance; gl: MapLibreNS };

export const MapContext = createContext<MapHandle | null>(null);

export function useMapHandle() {
  return useContext(MapContext);
}
