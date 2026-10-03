"use client";

import { useMemo, type ReactNode } from "react";
import { sortKey } from "@/lib/cluster";
import type { Photo } from "@/lib/data/types";
import Panel from "../hud/Panel";
import { IconCamera, IconTarget } from "../hud/icons";
import { formatDay } from "./format";
import MediaView from "./MediaView";

/** Photo grid grouped by day. Used for the full library and for a tapped cluster. */
export default function PhotoLibraryPanel({
  title,
  kicker,
  photos,
  onClose,
  onOpen,
  onZoom,
  onAddFiles,
  footerExtra,
  canUpload = true,
  uploadHint,
}: {
  title: string;
  kicker: string;
  photos: Photo[];
  onClose: () => void;
  onOpen: (photos: Photo[], index: number) => void;
  onZoom?: () => void;
  onAddFiles?: (files: File[]) => void;
  footerExtra?: ReactNode;
  canUpload?: boolean;
  uploadHint?: string;
}) {
  const sorted = useMemo(() => [...photos].sort((a, b) => sortKey(b).localeCompare(sortKey(a))), [photos]);
  const groups = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const p of sorted) {
      const day = formatDay(sortKey(p));
      map.set(day, [...(map.get(day) ?? []), p]);
    }
    return [...map.entries()];
  }, [sorted]);

  return (
    <Panel
      title={title}
      kicker={kicker}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {onAddFiles ? (
            canUpload ? (
              <label className="hud-btn hud-btn-primary w-full cursor-pointer">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (files.length) onAddFiles(files);
                  }}
                />
                <IconCamera size={18} /> Add photos
              </label>
            ) : (
              <p className="hud-note">{uploadHint}</p>
            )
          ) : null}
          {onZoom ? (
            <button type="button" className="hud-btn w-full" onClick={onZoom}>
              <IconTarget size={16} /> Zoom to these photos
            </button>
          ) : null}
          {footerExtra}
        </div>
      }
    >
      {groups.length === 0 ? (
        <div className="hud-empty">
          <p>No photos yet.</p>
          <p className="text-zinc-500">Add photos — ones with GPS land on the map automatically.</p>
        </div>
      ) : (
        groups.map(([day, list]) => (
          <section key={day} className="mb-4">
            <h3 className="hud-section-title mt-0">{day}</h3>
            <ul className="photo-grid">
              {list.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="photo-tile"
                    onClick={() => onOpen(sorted, sorted.indexOf(p))}
                    aria-label={p.caption || p.placeName || "Photo"}
                  >
                    <MediaView media={p.media} alt="" className="photo-tile-img" />
                    {p.media.kind === "video" ? <span className="photo-pin-video">▶</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Panel>
  );
}
