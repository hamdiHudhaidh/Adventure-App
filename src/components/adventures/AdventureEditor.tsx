"use client";

import { useState } from "react";
import type { AdventureInput } from "@/lib/data/repository";
import type { AdventureStatus, Photo } from "@/lib/data/types";
import { IconClose } from "../hud/icons";
import MediaView from "../photos/MediaView";
import { COLORS, GLYPHS, Glyph, LookBadge } from "./looks";

const STATUSES: { id: AdventureStatus; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "open", label: "Open" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Done" },
];

/** Admin form: attach (or edit) an adventure on a picture. */
export default function AdventureEditor({
  photo,
  initial,
  onCancel,
  onSave,
  onDelete,
  children,
}: {
  photo: Photo;
  initial?: AdventureInput;
  onCancel: () => void;
  onSave: (input: AdventureInput) => void;
  onDelete?: () => void;
  /** Later features add sections (steps, teams…). */
  children?: React.ReactNode;
}) {
  const [v, setV] = useState<AdventureInput>(
    initial ?? {
      photoId: photo.id,
      name: "",
      brief: { codename: "", summary: "", objective: "" },
      look: { glyph: "diamond", color: "#f5ff00" },
      status: "open",
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const setBrief = (k: keyof AdventureInput["brief"], val: string) => setV({ ...v, brief: { ...v.brief, [k]: val } });

  return (
    <div className="hud-modal-backdrop pointer-events-auto">
      <form
        className="hud-sheet adv-editor"
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.name.trim()) return setError("Give the adventure a name.");
          onSave({ ...v, name: v.name.trim() });
        }}
      >
        <header className="hud-panel-header">
          <div>
            <p className="hud-kicker">{initial ? "Edit adventure" : "Attach adventure to picture"}</p>
            <h2 className="hud-title">{v.name || "New adventure"}</h2>
          </div>
          <button type="button" className="hud-icon-btn" onClick={onCancel} aria-label="Cancel">
            <IconClose size={18} />
          </button>
        </header>

        <div className="hud-panel-body flex flex-col gap-3">
          <div className="adv-editor-cover">
            <MediaView media={photo.media} alt="" className="adv-editor-cover-img" />
            <div className="adv-editor-preview">
              <LookBadge look={v.look} size={54} />
            </div>
          </div>

          <label className="hud-field">
            <span>Adventure name</span>
            <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={40} placeholder="Sands of Diriyah" />
          </label>
          <label className="hud-field">
            <span>Codename</span>
            <input value={v.brief.codename} onChange={(e) => setBrief("codename", e.target.value.toUpperCase())} maxLength={28} placeholder="OP. MUD & STARS" />
          </label>
          <label className="hud-field">
            <span>Brief</span>
            <textarea value={v.brief.summary} onChange={(e) => setBrief("summary", e.target.value)} rows={4} maxLength={700} placeholder="What is this adventure about?" />
          </label>
          <label className="hud-field">
            <span>Objective</span>
            <input value={v.brief.objective} onChange={(e) => setBrief("objective", e.target.value)} maxLength={140} placeholder="What does winning look like?" />
          </label>

          <div className="hud-field">
            <span>Map marker</span>
            <div className="adv-glyph-grid" role="radiogroup" aria-label="Marker shape">
              {GLYPHS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={v.look.glyph === g.id}
                  className={v.look.glyph === g.id ? "is-active" : ""}
                  onClick={() => setV({ ...v, look: { ...v.look, glyph: g.id } })}
                >
                  <Glyph glyph={g.id} size={22} />
                  <span>{g.label}</span>
                </button>
              ))}
            </div>
            <div className="adv-color-row" role="radiogroup" aria-label="Marker colour">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={v.look.color === c.id}
                  aria-label={c.label}
                  className={v.look.color === c.id ? "is-active" : ""}
                  style={{ background: c.id }}
                  onClick={() => setV({ ...v, look: { ...v.look, color: c.id } })}
                />
              ))}
            </div>
          </div>

          <div className="hud-field">
            <span>Status</span>
            <div className="hud-segment">
              {STATUSES.map((st) => (
                <button key={st.id} type="button" className={v.status === st.id ? "is-active" : ""} onClick={() => setV({ ...v, status: st.id })}>
                  {st.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">Draft adventures are only visible to admins.</p>
          </div>

          {children}
          {error ? <p className="hud-error">{error}</p> : null}
        </div>

        <footer className="hud-panel-footer flex gap-2">
          {onDelete ? (
            confirmDelete ? (
              <button type="button" className="hud-btn hud-btn-danger" onClick={onDelete}>
                Confirm delete
              </button>
            ) : (
              <button type="button" className="hud-btn hud-btn-ghost" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            )
          ) : null}
          <button type="button" className="hud-btn flex-1" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="hud-btn hud-btn-primary flex-1">
            {initial ? "Save adventure" : "Attach adventure"}
          </button>
        </footer>
      </form>
    </div>
  );
}
