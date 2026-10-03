import { newId } from "./data/ids";
import type { Adventure, Membership, Team } from "./data/types";

export const TEAM_COLORS = ["#f5ff00", "#5be7ff", "#ff4d6d", "#a3ff6b", "#c58bff", "#ffb547", "#ff8bd1", "#f4f4f5"];
const TEAM_NAMES = ["Falcons", "Oryx", "Scorpions", "Camels", "Wolves", "Hawks", "Cobras", "Lynx"];

export const MAX_TEAMS = 8;
export const MAX_PLAYERS = 60;

/** Grow or shrink a team list, keeping existing teams (and their ids). */
export function resizeTeams(teams: Team[], count: number): Team[] {
  const n = Math.max(1, Math.min(MAX_TEAMS, Math.round(count)));
  if (teams.length >= n) return teams.slice(0, n);
  const out = [...teams];
  for (let i = teams.length; i < n; i++) {
    const used = new Set(out.map((t) => t.name));
    const name = TEAM_NAMES.find((x) => !used.has(x)) ?? `Team ${i + 1}`;
    out.push({ id: newId("tm"), name, color: TEAM_COLORS[i % TEAM_COLORS.length] });
  }
  return out;
}

/** Seats per team: capacity split evenly, rounding up. */
export function seatsPerTeam(a: Pick<Adventure, "capacity" | "teams">) {
  return Math.max(1, Math.ceil(a.capacity / Math.max(1, a.teams.length)));
}

export function membersOf(memberships: Membership[], adventureId: string) {
  return memberships.filter((m) => m.adventureId === adventureId);
}

export function teamMembers(memberships: Membership[], adventureId: string, teamId: string) {
  return memberships.filter((m) => m.adventureId === adventureId && m.teamId === teamId);
}

export function isFull(a: Adventure, memberships: Membership[]) {
  return membersOf(memberships, a.id).length >= a.capacity;
}

export function teamHasSeat(a: Adventure, memberships: Membership[], teamId: string) {
  return teamMembers(memberships, a.id, teamId).length < seatsPerTeam(a) && !isFull(a, memberships);
}

/** Balanced auto-assignment: the team with the fewest players that still has a seat. */
export function pickTeam(a: Adventure, memberships: Membership[]): Team | null {
  if (isFull(a, memberships)) return null;
  const sorted = [...a.teams]
    .map((t, i) => ({ t, i, n: teamMembers(memberships, a.id, t.id).length }))
    .filter((x) => x.n < seatsPerTeam(a))
    .sort((x, y) => x.n - y.n || x.i - y.i);
  return sorted[0]?.t ?? null;
}

export function joinBlockReason(a: Adventure, memberships: Membership[]) {
  if (isFull(a, memberships)) return `Adventure is full · ${a.capacity}/${a.capacity} players`;
  if (!pickTeam(a, memberships)) return "All teams are full";
  return null;
}
