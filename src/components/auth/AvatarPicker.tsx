"use client";

import { useRef, useState } from "react";
import { putBlob } from "@/lib/data/media";
import type { MediaRef } from "@/lib/data/types";
import { prepareAvatar } from "@/lib/image";
import { IconCamera } from "../hud/icons";
import MediaView from "../photos/MediaView";

/** Round profile-picture picker: tap to choose / take a photo, cropped to a square. */
export default function AvatarPicker({
  value,
  onChange,
  name,
  size = 96,
}: {
  value: MediaRef | null;
  onChange: (media: MediaRef | null) => void;
  name: string;
  size?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initials = (name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="avatar-picker">
      <button
        type="button"
        className="avatar-picker-btn"
        style={{ width: size, height: size }}
        onClick={() => input.current?.click()}
        aria-label="Choose profile picture"
        disabled={busy}
      >
        {value ? <MediaView media={value} alt="" className="avatar-img" /> : <span className="avatar-picker-initials">{initials}</span>}
        <span className="avatar-picker-cam">
          <IconCamera size={16} />
        </span>
      </button>
      <div className="min-w-0 text-xs text-zinc-400">
        <p className="hud-kicker">Profile picture</p>
        <p>{busy ? "Processing…" : error ?? "Tap to pick or take a photo."}</p>
        {value ? (
          <button type="button" className="mt-1 underline" onClick={() => onChange(null)}>
            Remove
          </button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            const blob = await prepareAvatar(file);
            const blobId = await putBlob(blob);
            onChange({ kind: "image", source: "local", blobId, mime: blob.type || "image/jpeg" });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not use that image");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
