"use client";

import type { ReactNode } from "react";
import type { Adventure, Membership, Photo } from "@/lib/data/types";
import { IconClose, IconEdit, IconTarget } from "../hud/icons";
import MediaView from "../photos/MediaView";
import { LookBadge } from "./looks";

const STATUS_LABEL = { draft: "Draft", open: "Open to join", active: "In progress", completed: "Completed" } as const;

/** Mission-brief style card for an adventure, with the Join button. */
export default function AdventureDossier({
  adventure,
  photo,
  members,
  joined,
  isAdmin,
  joinDisabledReason,
  onJoin,
  onLeave,
  onEdit,
  onLocate,
  onClose,
  children,
}: {
  adventure: Adventure;
  photo: Photo | undefined;
  members: Membership[];
  joined: boolean;
  isAdmin: boolean;
  joinDisabledReason?: string | null;
  onJoin: () => void;
  onLeave: () => void;
  onEdit: () => void;
  onLocate: () => void;
  onClose: () => void;
  /** Later features add sections (steps, teams…). */
  children?: ReactNode;
}) {
  const b = adventure.brief;
  const canJoin = adventure.status === "open" || adventure.status === "active";
  return (
    <div className="hud-modal-backdrop pointer-events-auto" onClick={onClose}>
      <article
        className="brief-card"
        style={{ ["--adv" as string]: adventure.look.color }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Adventure: ${adventure.name}`}
      >
        <div className="brief-media">
          {photo ? <MediaView media={photo.media} alt="" className="brief-media-el" /> : null}
          <span className="brief-stamp">{STATUS_LABEL[adventure.status]}</span>
          <span className="brief-look">
            <LookBadge look={adventure.look} size={56} />
          </span>
        </div>

        <div className="brief-body">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="hud-kicker" style={{ color: adventure.look.color }}>
                Adventure brief · {b.codename || "Classified"}
              </p>
              <h3 className="brief-title">{adventure.name}</h3>
            </div>
            <button type="button" className="hud-icon-btn" onClick={onClose} aria-label="Close">
              <IconClose size={18} />
            </button>
          </header>

          <p className="brief-summary">{b.summary || "No brief yet."}</p>
          <dl className="brief-grid">
            <div>
              <dt>Objective</dt>
              <dd>{b.objective || "—"}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{photo?.placeName || "On the map"}</dd>
            </div>
            <div>
              <dt>Crew</dt>
              <dd>
                {members.length}/{adventure.capacity} players · {adventure.teams.length} team
                {adventure.teams.length > 1 ? "s" : ""}
              </dd>
            </div>
          </dl>

          {children}

          <div className="brief-actions">
            {joined ? (
              <button type="button" className="hud-btn" onClick={onLeave}>
                Leave adventure
              </button>
            ) : (
              <button
                type="button"
                className="hud-btn hud-btn-primary adv-join"
                onClick={onJoin}
                disabled={!canJoin || !!joinDisabledReason}
              >
                {canJoin ? "Join adventure" : STATUS_LABEL[adventure.status]}
              </button>
            )}
            <button type="button" className="hud-btn" onClick={onLocate}>
              <IconTarget size={16} /> Map
            </button>
            {isAdmin ? (
              <button type="button" className="hud-btn" onClick={onEdit}>
                <IconEdit size={16} /> Edit
              </button>
            ) : null}
          </div>
          {joinDisabledReason && !joined ? <p className="mt-2 text-xs text-zinc-400">{joinDisabledReason}</p> : null}
        </div>
      </article>
    </div>
  );
}
