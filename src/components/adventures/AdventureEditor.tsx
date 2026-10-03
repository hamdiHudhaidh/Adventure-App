"use client";

import { useState } from "react";
import { MAX_PLAYERS, MAX_TEAMS, resizeTeams, seatsPerTeam } from "@/lib/teams";
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
  memberCount = 0,
}: {
  photo: Photo;
  initial?: AdventureInput;
  onCancel: () => void;
  onSave: (input: AdventureInput) => void;
  onDelete?: () => void;
  /** Later features add sections. */
  children?: React.ReactNode;
  /** Players already in the adventure (capacity can't go below this). */
  memberCount?: number;
}) {
  const [v, setV] = useState<AdventureInput>(
    initial ?? {
      photoId: photo.id,
      name: "",
      brief: { codename: "", summary: "", objective: "" },
      look: { glyph: "diamond", color: "#f5ff00" },
      status: "open",
      capacity: 12,
      teams: resizeTeams([], 3),
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
          if (v.capacity < memberCount) return setError(`${memberCount} players already joined — raise the player count.`);
          if (v.teams.some((t) => !t.name.trim())) return setError("Every team needs a name.");
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

          <div className="hud-field">
            <span>Crew &amp; teams</span>
            <div className="crew-grid">
              <Stepper
                label="Players"
                value={v.capacity}
                min={Math.max(1, v.teams.length, memberCount)}
                max={MAX_PLAYERS}
                onChange={(capacity) => setV({ ...v, capacity })}
              />
              <Stepper
                label="Teams"
                value={v.teams.length}
                min={1}
                max={Math.min(MAX_TEAMS, v.capacity)}
                onChange={(n) => setV({ ...v, teams: resizeTeams(v.teams, n) })}
              />
            </div>
            <p className="text-xs text-zinc-400">
              {v.teams.length} team{v.teams.length > 1 ? "s" : ""} × up to {seatsPerTeam(v)} players · {v.capacity} seats total.
              New players are balanced across teams.
            </p>
            <div className="team-name-list">
              {v.teams.map((t, i) => (
                <label key={t.id} className="team-name-row" style={{ ["--team" as string]: t.color }}>
                  <span className="team-dot" aria-hidden />
                  <input
                    value={t.name}
                    maxLength={20}
                    aria-label={`Team ${i + 1} name`}
                    onChange={(e) =>
                      setV({ ...v, teams: v.teams.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)) })
                    }
                  />
                </label>
              ))}
            </div>
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

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="stepper">
      <span className="hud-kicker">{label}</span>
      <div className="stepper-row">
        <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={`Fewer ${label}`}>
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          aria-label={label}
          onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        />
        <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={`More ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}
