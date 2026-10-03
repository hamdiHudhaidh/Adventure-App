"use client";

import { useRef, useState, type ReactNode } from "react";
import type { Photo } from "@/lib/data/types";
import { formatLngLat } from "@/lib/geo";
import { IconChevron, IconClose, IconEdit, IconTarget, IconTrash } from "../hud/icons";
import { formatWhen, SOURCE_LABEL } from "./format";
import MediaView from "./MediaView";

/**
 * Full-screen photo viewer. Swipe (or use the arrows / keyboard) to move
 * through the photos of the tapped cluster.
 */
export default function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
  onLocate,
  onSave,
  onDelete,
  canEdit,
  extra,
}: {
  photos: Photo[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onLocate: (p: Photo) => void;
  onSave: (p: Photo, patch: { caption: string; placeName: string }) => void;
  onDelete: (p: Photo) => void;
  canEdit: (p: Photo) => boolean;
  /** Slot for later features (e.g. "Attach adventure" for admins). */
  extra?: (p: Photo) => ReactNode;
}) {
  const photo = photos[Math.min(index, photos.length - 1)];
  const [editing, setEditing] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const touchX = useRef<number | null>(null);

  if (!photo) return null;
  const go = (d: number) => {
    setEditing(null);
    setConfirmDelete(null);
    onIndexChange((index + d + photos.length) % photos.length);
  };
  const isEditing = editing === photo.id;

  return (
    <div
      className="photo-viewer pointer-events-auto"
      role="dialog"
      aria-label="Photo viewer"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (isEditing) return;
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div
        className="photo-viewer-stage"
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start === null || end === undefined || photos.length < 2) return;
          if (Math.abs(end - start) > 50) go(end < start ? 1 : -1);
        }}
      >
        <MediaView key={photo.id} media={photo.media} alt={photo.caption} className="photo-viewer-media" controls />
        {photos.length > 1 ? (
          <>
            <button type="button" className="photo-viewer-nav is-prev" onClick={() => go(-1)} aria-label="Previous photo">
              <IconChevron size={22} style={{ transform: "rotate(180deg)" }} />
            </button>
            <button type="button" className="photo-viewer-nav is-next" onClick={() => go(1)} aria-label="Next photo">
              <IconChevron size={22} />
            </button>
          </>
        ) : null}
        <div className="photo-viewer-top">
          <span className="hud-chip">
            {photos.length > 1 ? `${index + 1} / ${photos.length}` : "Photo"}
            {photo.sample ? <span className="text-zinc-400"> · sample</span> : null}
          </span>
          <button type="button" className="hud-icon-btn" onClick={onClose} aria-label="Close viewer">
            <IconClose size={18} />
          </button>
        </div>
      </div>

      <aside className="photo-viewer-info">
        {isEditing ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              onSave(photo, { caption: caption.trim(), placeName: placeName.trim() });
              setEditing(null);
            }}
          >
            <label className="hud-field">
              <span>Caption</span>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120} autoFocus />
            </label>
            <label className="hud-field">
              <span>Place</span>
              <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} maxLength={60} />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="hud-btn hud-btn-primary flex-1">
                Save
              </button>
              <button type="button" className="hud-btn flex-1" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="hud-kicker">{photo.placeName || "Unnamed place"}</p>
            <h3 className="photo-viewer-caption">{photo.caption || "Untitled photo"}</h3>
            <dl className="photo-viewer-meta">
              <div>
                <dt>Taken</dt>
                <dd>{formatWhen(photo.takenAt ?? photo.createdAt)}</dd>
              </div>
              <div>
                <dt>By</dt>
                <dd>{photo.authorName}</dd>
              </div>
              <div>
                <dt>Position</dt>
                <dd>
                  {formatLngLat(photo.lngLat)}
                  <span className="photo-source">{SOURCE_LABEL[photo.locationSource]}</span>
                </dd>
              </div>
            </dl>
            {extra?.(photo)}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="hud-btn hud-btn-primary" onClick={() => onLocate(photo)}>
                <IconTarget size={16} /> Show on map
              </button>
              {canEdit(photo) ? (
                <>
                  <button
                    type="button"
                    className="hud-btn"
                    onClick={() => {
                      setCaption(photo.caption);
                      setPlaceName(photo.placeName);
                      setEditing(photo.id);
                    }}
                  >
                    <IconEdit size={16} /> Edit
                  </button>
                  {confirmDelete === photo.id ? (
                    <button type="button" className="hud-btn hud-btn-danger" onClick={() => onDelete(photo)}>
                      Confirm delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="hud-btn hud-btn-ghost"
                      onClick={() => setConfirmDelete(photo.id)}
                      aria-label="Delete photo"
                    >
                      <IconTrash size={16} />
                    </button>
                  )}
                </>
              ) : null}
            </div>
          </>
        )}
        {photos.length > 1 ? (
          <ul className="photo-viewer-strip">
            {photos.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={i === index ? "is-active" : ""}
                  onClick={() => onIndexChange(i)}
                  aria-label={`Photo ${i + 1}`}
                >
                  <MediaView media={p.media} alt="" className="photo-viewer-thumb" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </aside>
    </div>
  );
}
