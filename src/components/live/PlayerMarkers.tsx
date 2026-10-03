"use client";

import MapMarker from "@/components/map/MapMarker";
import type { User } from "@/lib/auth/types";
import type { Adventure, Membership, PlayerPosition } from "@/lib/data/types";
import Avatar from "../auth/Avatar";

/** Live player positions (real shares or simulated) as avatar pins. */
export default function PlayerMarkers({
  adventure,
  positions,
  memberships,
  users,
  teamFilter,
  meId,
}: {
  adventure: Adventure;
  positions: PlayerPosition[];
  memberships: Membership[];
  users: User[];
  /** Only show this team (players see their own team). */
  teamFilter?: string | null;
  meId?: string | null;
}) {
  return (
    <>
      {positions
        .filter((p) => p.adventureId === adventure.id)
        .map((p) => {
          const m = memberships.find((x) => x.adventureId === adventure.id && x.userId === p.userId);
          if (!m) return null;
          if (teamFilter !== undefined && m.teamId !== teamFilter) return null;
          const team = adventure.teams.find((t) => t.id === m.teamId);
          const u = users.find((x) => x.id === p.userId);
          return (
            <MapMarker key={p.userId} lngLat={p.lngLat} anchor="center" zIndex={70}>
              <span className={`player-pin ${p.userId === meId ? "is-me" : ""}`} style={{ ["--team" as string]: team?.color ?? "#f5ff00" }}>
                <Avatar user={u ?? { name: p.userName, avatar: null, role: "player" }} size={26} />
                <span className="player-pin-name">{p.userId === meId ? "You" : p.userName}</span>
              </span>
            </MapMarker>
          );
        })}
    </>
  );
}
