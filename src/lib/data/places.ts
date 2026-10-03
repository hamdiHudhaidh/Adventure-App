import type { LngLat } from "./types";

/** Approximate coordinates for the first adventure near Riyadh (mock data). */
export const PLACES = {
  riyadh: { name: "Riyadh", lngLat: [46.6753, 24.7136] as LngLat },
  masmak: { name: "Masmak Fortress", lngLat: [46.7134, 24.6312] as LngLat },
  wadiHanifah: { name: "Wadi Hanifah", lngLat: [46.6046, 24.6655] as LngLat },
  turaif: { name: "At-Turaif, Diriyah", lngLat: [46.5726, 24.7339] as LngLat },
  redSands: { name: "Red Sand Dunes", lngLat: [46.2475, 24.5806] as LngLat },
  edge: { name: "Edge of the World", lngLat: [45.9925, 24.9511] as LngLat },
  camp: { name: "Fihrayn Camp", lngLat: [46.0405, 24.9032] as LngLat },
} as const;
