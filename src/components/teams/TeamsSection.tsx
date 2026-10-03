"use client";

import type { Adventure, Membership } from "@/lib/data/types";
import { seatsPerTeam, teamHasSeat, teamMembers } from "@/lib/teams";

/** Team roster with seats; players can pick or switch team while seats remain. */
export default function TeamsSection({
  adventure,
  memberships,
  userId,
  canJoin,
  onJoinTeam,
  onSwitchTeam,
}: {
  adventure: Adventure;
  memberships: Membership[];
  userId: string | null;
  canJoin: boolean;
  onJoinTeam: (teamId: string) => void;
  onSwitchTeam: (teamId: string) => void;
}) {
  const seats = seatsPerTeam(adventure);
  const mine = memberships.find((m) => m.adventureId === adventure.id && m.userId === userId);
  return (
    <div className="brief-teams">
      <p className="hud-kicker">
        Teams · {adventure.teams.length} × {seats} seats
      </p>
      <div className="team-grid">
        {adventure.teams.map((t) => {
          const members = teamMembers(memberships, adventure.id, t.id);
          const open = teamHasSeat(adventure, memberships, t.id);
          const isMine = mine?.teamId === t.id;
          const switchOpen = mine && !isMine && members.length < seats;
          return (
            <div key={t.id} className={`team-card ${isMine ? "is-mine" : ""}`} style={{ ["--team" as string]: t.color }}>
              <div className="flex items-center justify-between gap-2">
                <span className="team-name">
                  <span className="team-dot" aria-hidden /> {t.name}
                </span>
                <span className="team-count">
                  {members.length}/{seats}
                </span>
              </div>
              <div className="team-seats" aria-hidden>
                {Array.from({ length: seats }, (_, i) => (
                  <span key={i} className={i < members.length ? "is-taken" : ""} />
                ))}
              </div>
              <p className="team-members">{members.map((m) => m.userName).join(", ") || "No players yet"}</p>
              {isMine ? (
                <span className="team-tag">Your team</span>
              ) : !mine && canJoin && open ? (
                <button type="button" className="hud-btn hud-btn-sm" onClick={() => onJoinTeam(t.id)}>
                  Join {t.name}
                </button>
              ) : switchOpen ? (
                <button type="button" className="hud-btn hud-btn-sm hud-btn-ghost" onClick={() => onSwitchTeam(t.id)}>
                  Switch here
                </button>
              ) : members.length >= seats ? (
                <span className="team-tag is-full">Full</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
