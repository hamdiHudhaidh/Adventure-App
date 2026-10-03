"use client";

import { useEffect, useState } from "react";
import MapMarker from "@/components/map/MapMarker";
import { useMapHandle } from "@/components/map/MapContext";
import { clusterPhotos, type PhotoCluster } from "@/lib/cluster";
import type { Photo } from "@/lib/data/types";
import MediaView from "./MediaView";

/** Apple-Photos-style clustered thumbnails that regroup as you zoom. */
export default function PhotoClusters({
  photos,
  selectedId,
  onSelectCluster,
}: {
  photos: Photo[];
  selectedId: string | null;
  onSelectCluster: (cluster: PhotoCluster) => void;
}) {
  const handle = useMapHandle();
  const [clusters, setClusters] = useState<PhotoCluster[]>([]);

  useEffect(() => {
    if (!handle) return;
    const recompute = () => setClusters(clusterPhotos(handle.map, photos));
    const raf = requestAnimationFrame(recompute);
    handle.map.on("moveend", recompute);
    handle.map.on("resize", recompute);
    return () => {
      cancelAnimationFrame(raf);
      handle.map.off("moveend", recompute);
      handle.map.off("resize", recompute);
    };
  }, [handle, photos]);

  return (
    <>
      {clusters.map((c) => {
        const count = c.photos.length;
        const selected = selectedId ? c.photos.some((p) => p.id === selectedId) : false;
        return (
          <MapMarker key={c.id} lngLat={c.lngLat} zIndex={selected ? 40 : 10 + Math.min(count, 20)}>
            <button
              type="button"
              className={`photo-pin ${count > 1 ? "is-stack" : ""} ${selected ? "is-selected" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCluster(c);
              }}
              aria-label={count > 1 ? `${count} photos near ${c.cover.placeName}` : `Photo: ${c.cover.caption || c.cover.placeName}`}
            >
              {count > 1 ? <span className="photo-pin-under" aria-hidden /> : null}
              <span className="photo-pin-frame">
                <MediaView media={c.cover.media} alt="" className="photo-pin-img" />
                {c.cover.media.kind === "video" ? <span className="photo-pin-video">▶</span> : null}
              </span>
              {count > 1 ? <span className="photo-pin-count">{count}</span> : null}
              <span className="photo-pin-tail" aria-hidden />
            </button>
          </MapMarker>
        );
      })}
    </>
  );
}
