"use client";

import { useState } from "react";
import type { User } from "@/lib/auth/types";
import { useRepository } from "@/lib/data/hooks";
import type { Adventure, AdventureStep, AppState, LngLat, Team } from "@/lib/data/types";
import { completedSet, controlSets, stepState } from "@/lib/steps";
import { seatsPerTeam, teamMembers } from "@/lib/teams";
import Panel from "../hud/Panel";
import { IconChevron, IconPlay, IconTarget } from "../hud/icons";
import { useToast } from "../hud/Toasts";
import Avatar from "../auth/Avatar";
import { LookBadge } from "../adventures/looks";

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Game-master view: every team's progress, with flow control and messaging. */
export default function LiveControlPanel({
  adventures,
  activeId,
  onActiveChange,
  state,
  users,
  actor,
  onLocate,
  onSimulate,
  onClose,
}: {
  adventures: Adventure[];
  activeId: string;
  onActiveChange: (id: string) => void;
  state: AppState;
  users: User[];
  actor: string;
  onLocate: (lngLat: LngLat) => void;
  onSimulate: (adventure: Adventure) => void;
  onClose: () => void;
}) {
  const repo = useRepository();
  const toast = useToast();
  const adventure = adventures.find((a) => a.id === activeId) ?? adventures[0];
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [target, setTarget] = useState<string>("all");
  if (!adventure) {
    return (
      <Panel title="Live control" onClose={onClose}>
        <div className="hud-empty">No adventures yet.</div>
      </Panel>
    );
  }
  const control = controlSets(state.controls, adventure.id, null, adventure.steps);
  const members = state.memberships.filter((m) => m.adventureId === adventure.id);
  const total = adventure.steps.length;
  const run = (fn: () => void) => {
    try {
      fn();
    } catch (err) {
      toast({ title: "Not possible", body: err instanceof Error ? err.message : String(err), tone: "alert" });
    }
  };

  const teamView = (team: Team) => {
    const done = completedSet(state.progress, adventure.id, team.id);
    const { unlocked } = controlSets(state.controls, adventure.id, team.id, adventure.steps);
    const states = adventure.steps.map((s) => ({ s, st: stepState(s, done, unlocked) }));
    const current = states.filter((x) => x.st === "available").map((x) => x.s);
    const last = [...state.activity].reverse().find((e) => e.adventureId === adventure.id && e.partyId === team.id);
    return { done, unlocked, states, current, last };
  };

  const advance = (team: Team, current: AdventureStep[]) => {
    const next = current.find((s) => !control.paused.has(s.id));
    if (!next) return toast({ title: "Nothing to advance", body: current.length ? "Next steps are paused." : "Team finished every step.", tone: "alert" });
    repo.progress.complete(adventure.id, team.id, next.id, `${actor} (admin)`);
    toast({ title: `${team.name} advanced`, body: next.title, tone: "reward" });
  };

  const overall = adventure.teams.length && total
    ? Math.round(
        (adventure.teams.reduce((n, t) => n + completedSet(state.progress, adventure.id, t.id).size, 0) /
          (adventure.teams.length * total)) *
          100,
      )
    : 0;

  const feed = state.activity.filter((e) => e.adventureId === adventure.id).slice(-30).reverse();
  const teamName = (id: string | null) => adventure.teams.find((t) => t.id === id)?.name;

  return (
    <Panel title="Live control" kicker={`Game master · ${adventure.name}`} onClose={onClose} wide>
      {adventures.length > 1 ? (
        <div className="hud-chips-row mb-3">
          {adventures.map((a) => (
            <button key={a.id} type="button" className={`hud-filter ${a.id === adventure.id ? "is-active" : ""}`} onClick={() => onActiveChange(a.id)}>
              {a.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className={`live-header ${control.allPaused ? "is-paused" : ""}`} style={{ ["--adv" as string]: adventure.look.color }}>
        <LookBadge look={adventure.look} size={42} />
        <div className="min-w-0 flex-1">
          <p className="live-status">{control.allPaused ? "Paused" : adventure.status === "active" ? "Live" : adventure.status}</p>
          <p className="text-xs text-zinc-400">
            {members.length}/{adventure.capacity} players · {adventure.teams.length} teams · {overall}% complete
          </p>
        </div>
        <button
          type="button"
          className={`hud-btn ${control.allPaused ? "hud-btn-primary" : ""}`}
          onClick={() => repo.control.setPaused(adventure.id, !control.allPaused, actor)}
        >
          {control.allPaused ? (
            <>
              <IconPlay size={14} /> Resume all
            </>
          ) : (
            "❚❚ Pause all"
          )}
        </button>
      </div>

      {adventure.status !== "active" && adventure.status !== "completed" ? (
        <button type="button" className="hud-btn mt-2 w-full" onClick={() => repo.adventures.update(adventure.id, { status: "active" })}>
          <IconPlay size={14} /> Start adventure (set to Active)
        </button>
      ) : null}

      <h3 className="hud-section-title">Teams</h3>
      <div className="flex flex-col gap-2">
        {adventure.teams.map((team) => {
          const v = teamView(team);
          const crew = teamMembers(state.memberships, adventure.id, team.id);
          const isOpen = openTeam === team.id;
          return (
            <div key={team.id} className={`live-team ${isOpen ? "is-open" : ""}`} style={{ ["--team" as string]: team.color, ["--adv" as string]: adventure.look.color }}>
              <div className="live-team-head">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenTeam(isOpen ? null : team.id)}>
                  <span className="flex items-center gap-2">
                    <span className="team-name">
                      <span className="team-dot" aria-hidden /> {team.name}
                    </span>
                    <span className="team-count">
                      {crew.length}/{seatsPerTeam(adventure)} · {v.done.size}/{total} steps
                    </span>
                    <IconChevron size={14} className={isOpen ? "rotate-90" : ""} />
                  </span>
                  <span className="tracker-bar block">
                    <span style={{ width: `${total ? (v.done.size / total) * 100 : 0}%`, background: team.color }} />
                  </span>
                  <span className="mt-1 block text-xs text-zinc-300">
                    {v.done.size === total && total
                      ? "Finished every step"
                      : v.current.length
                        ? `Now: ${v.current.map((s) => s.title + (control.paused.has(s.id) ? " (paused)" : "")).join(" · ")}`
                        : "Waiting on prerequisites"}
                  </span>
                  {v.last ? (
                    <span className="block text-[11px] text-zinc-500">
                      {v.last.actor} {v.last.text} · {ago(v.last.at)}
                    </span>
                  ) : null}
                </button>
                <button type="button" className="hud-btn hud-btn-sm hud-btn-primary" onClick={() => advance(team, v.current)}>
                  Advance ▸
                </button>
              </div>

              <div className="live-crew">
                {crew.map((m) => {
                  const u = users.find((x) => x.id === m.userId);
                  const pos = state.positions.find((p) => p.userId === m.userId && p.adventureId === adventure.id);
                  return (
                    <span key={m.userId} className="live-member">
                      <Avatar user={u ?? { name: m.userName, avatar: null, role: "player" }} size={22} />
                      <span>{m.userName}</span>
                      {pos ? (
                        <button type="button" className="live-locate" onClick={() => onLocate(pos.lngLat)} aria-label={`Locate ${m.userName}`} title={`${pos.simulated ? "Simulated" : "Live"} · ${ago(pos.at)}`}>
                          <IconTarget size={12} />
                        </button>
                      ) : null}
                      {isOpen ? (
                        <select
                          className="hud-select-sm"
                          value={m.teamId ?? ""}
                          aria-label={`Move ${m.userName}`}
                          onChange={(e) => run(() => repo.adventures.setTeam(adventure.id, m.userId, e.target.value))}
                        >
                          {adventure.teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </span>
                  );
                })}
                {!crew.length ? <span className="text-xs text-zinc-500">No players</span> : null}
              </div>

              {isOpen ? (
                <ol className="live-steps">
                  {v.states.map(({ s, st }, i) => {
                    const paused = control.paused.has(s.id) && st !== "done";
                    return (
                      <li key={s.id} className={`live-step is-${paused ? "paused" : st}`}>
                        <span className="step-row-num">{st === "done" ? "✓" : i + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {s.title}
                          {v.unlocked.has(s.id) && st !== "done" ? <em className="ml-1 text-amber-300 not-italic">· unlocked</em> : null}
                        </span>
                        {st === "done" ? (
                          <button type="button" className="hud-btn hud-btn-sm hud-btn-ghost" onClick={() => repo.progress.undo(adventure.id, team.id, s.id, actor)}>
                            Reopen
                          </button>
                        ) : (
                          <>
                            {st === "locked" ? (
                              <button type="button" className="hud-btn hud-btn-sm" onClick={() => repo.control.unlock(adventure.id, team.id, s.id, actor)}>
                                Unlock
                              </button>
                            ) : v.unlocked.has(s.id) ? (
                              <button type="button" className="hud-btn hud-btn-sm hud-btn-ghost" onClick={() => repo.control.relock(adventure.id, team.id, s.id)}>
                                Relock
                              </button>
                            ) : null}
                            <button type="button" className="hud-btn hud-btn-sm" onClick={() => repo.progress.complete(adventure.id, team.id, s.id, `${actor} (admin)`)}>
                              Complete
                            </button>
                          </>
                        )}
                      </li>
                    );
                  })}
                  <li className="pt-1">
                    <button type="button" className="hud-btn hud-btn-sm hud-btn-danger" onClick={() => repo.progress.resetParty(adventure.id, team.id, actor)}>
                      Reset {team.name} progress
                    </button>
                  </li>
                </ol>
              ) : null}
            </div>
          );
        })}
      </div>

      <h3 className="hud-section-title">Step flow</h3>
      <ul className="live-flow">
        {adventure.steps.map((s, i) => {
          const paused = !!state.controls.find((c) => c.adventureId === adventure.id)?.pausedSteps.includes(s.id);
          return (
            <li key={s.id}>
              <span className="step-row-num">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{s.title}</span>
              <span className="live-dots" aria-label="Teams done">
                {adventure.teams.map((t) => (
                  <span key={t.id} title={t.name} style={{ ["--team" as string]: t.color }} className={completedSet(state.progress, adventure.id, t.id).has(s.id) ? "is-done" : ""} />
                ))}
              </span>
              <button
                type="button"
                className={`hud-btn hud-btn-sm ${paused ? "hud-btn-primary" : "hud-btn-ghost"}`}
                disabled={control.allPaused}
                onClick={() => repo.control.toggleStepPause(adventure.id, s.id, actor)}
              >
                {paused ? "Resume" : "Pause"}
              </button>
            </li>
          );
        })}
      </ul>

      <h3 className="hud-section-title">Message players</h3>
      <form
        className="live-message"
        onSubmit={(e) => {
          e.preventDefault();
          if (!msg.trim()) return;
          repo.live.notify(adventure.id, target === "all" ? null : target, msg.trim(), actor);
          toast({ title: "Message sent", body: target === "all" ? "Everyone" : `Team ${teamName(target)}` });
          setMsg("");
        }}
      >
        <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Send to">
          <option value="all">Everyone</option>
          {adventure.teams.map((t) => (
            <option key={t.id} value={t.id}>
              Team {t.name}
            </option>
          ))}
        </select>
        <input value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={160} placeholder="e.g. Head to the Edge — sunset in 30 min" aria-label="Message" />
        <button type="submit" className="hud-btn hud-btn-primary">
          Send
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="hud-btn hud-btn-sm" onClick={() => onSimulate(adventure)}>
          Simulate crew positions
        </button>
      </div>

      <h3 className="hud-section-title">Activity</h3>
      <ul className="live-feed">
        {feed.map((e) => (
          <li key={e.id} className={`is-${e.kind}`}>
            <span className="live-feed-time">{ago(e.at)}</span>
            <span>
              <b>{e.actor}</b>
              {e.partyId && teamName(e.partyId) ? <span className="text-zinc-500"> · {teamName(e.partyId)}</span> : null} {e.text}
            </span>
          </li>
        ))}
        {!feed.length ? <li className="text-zinc-500">No activity yet.</li> : null}
      </ul>
    </Panel>
  );
}
