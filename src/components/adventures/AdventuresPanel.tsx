"use client";

import type { ReactNode } from "react";
import type { Adventure, Membership, Photo } from "@/lib/data/types";
import Panel from "../hud/Panel";
import MediaView from "../photos/MediaView";
import { LookBadge } from "./looks";

export default function AdventuresPanel({
  adventures,
  photos,
  memberships,
  userId,
  isAdmin,
  onOpen,
  onClose,
  footer,
}: {
  adventures: Adventure[];
  photos: Photo[];
  memberships: Membership[];
  userId: string | null;
  isAdmin: boolean;
  onOpen: (a: Adventure) => void;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <Panel title="Adventures" kicker={`${adventures.length} on the map`} onClose={onClose} footer={footer}>
      {adventures.length === 0 ? (
        <div className="hud-empty">
          <p>No adventures yet.</p>
          {isAdmin ? <p className="text-zinc-500">Open any photo and tap “Attach adventure”.</p> : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {adventures.map((a) => {
            const photo = photos.find((p) => p.id === a.photoId);
            const count = memberships.filter((m) => m.adventureId === a.id).length;
            const joined = !!userId && memberships.some((m) => m.adventureId === a.id && m.userId === userId);
            return (
              <li key={a.id}>
                <button type="button" className="adv-card" style={{ ["--adv" as string]: a.look.color }} onClick={() => onOpen(a)}>
                  {photo ? <MediaView media={photo.media} alt="" className="adv-card-img" /> : <span className="adv-card-img media-placeholder" />}
                  <span className="adv-card-body">
                    <span className="adv-card-top">
                      <LookBadge look={a.look} size={30} />
                      <span className="adv-card-status">{a.status}</span>
                    </span>
                    <span className="adv-card-name">{a.name}</span>
                    <span className="adv-card-meta">
                      {a.brief.codename || "—"} · {joined ? "You joined" : `${count} joined`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
