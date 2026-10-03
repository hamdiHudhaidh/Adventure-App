// Screen-space photo clustering (like Apple Photos' map): photos whose pins
// would overlap at the current zoom are grouped into one stacked thumbnail.

import type { MapInstance } from "@/components/map/maplibre";
import type { LngLat, Photo } from "./data/types";

export type PhotoCluster = {
  id: string;
  lngLat: LngLat;
  photos: Photo[];
  /** Newest photo is used as the cover thumbnail. */
  cover: Photo;
};

export function clusterPhotos(map: MapInstance, photos: Photo[], radiusPx = 58): PhotoCluster[] {
  const pts = photos.map((p) => ({ p, xy: map.project(p.lngLat) }));
  const used = new Set<number>();
  const clusters: PhotoCluster[] = [];
  // Newest first so the cover is the latest shot.
  const order = pts
    .map((_, i) => i)
    .sort((a, b) => sortKey(pts[b].p).localeCompare(sortKey(pts[a].p)));

  for (const i of order) {
    if (used.has(i)) continue;
    used.add(i);
    const members = [pts[i]];
    for (const j of order) {
      if (used.has(j)) continue;
      const dx = pts[j].xy.x - pts[i].xy.x;
      const dy = pts[j].xy.y - pts[i].xy.y;
      if (dx * dx + dy * dy <= radiusPx * radiusPx) {
        used.add(j);
        members.push(pts[j]);
      }
    }
    const lng = members.reduce((s, m) => s + m.p.lngLat[0], 0) / members.length;
    const lat = members.reduce((s, m) => s + m.p.lngLat[1], 0) / members.length;
    clusters.push({
      id: members.map((m) => m.p.id).sort().join("|"),
      lngLat: members.length === 1 ? members[0].p.lngLat : [lng, lat],
      photos: members.map((m) => m.p),
      cover: members[0].p,
    });
  }
  return clusters;
}

export function sortKey(p: Photo) {
  return p.takenAt ?? p.createdAt;
}

export function boundsOf(photos: { lngLat: LngLat }[]): [LngLat, LngLat] {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const { lngLat } of photos) {
    minLng = Math.min(minLng, lngLat[0]);
    maxLng = Math.max(maxLng, lngLat[0]);
    minLat = Math.min(minLat, lngLat[1]);
    maxLat = Math.max(maxLat, lngLat[1]);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
