"use client";

import { useState } from "react";
import type { Adventure, AdventureStep, Reward, RewardKind } from "@/lib/data/types";
import { newId } from "@/lib/data/ids";
import { formatLngLat } from "@/lib/geo";
import { rewardText, wouldCycle } from "@/lib/steps";
import Panel from "../hud/Panel";
import { IconChevron, IconPin, IconPlus, IconTrash } from "../hud/icons";

const KINDS: { id: RewardKind; label: string }[] = [
  { id: "item", label: "Item" },
  { id: "xp", label: "XP" },
  { id: "badge", label: "Badge" },
];

export function blankStep(n: number): AdventureStep {
  return {
    id: newId("st"),
    title: `Step ${n}`,
    instruction: "",
    lngLat: null,
    placeName: "",
    radiusM: 300,
    prerequisites: [],
    rewards: [],
  };
}

/** Admin mission designer: steps, map locations, prerequisites and rewards. */
export default function StepsDesigner({
  adventure,
  selectedId,
  onSelect,
  onChange,
  onPickLocation,
  onClose,
}: {
  adventure: Adventure;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (steps: AdventureStep[]) => void;
  onPickLocation: (step: AdventureStep) => void;
  onClose: () => void;
}) {
  const steps = adventure.steps;
  const [reward, setReward] = useState<{ kind: RewardKind; label: string; amount: number }>({ kind: "item", label: "", amount: 1 });
  const selected = steps.find((s) => s.id === selectedId) ?? null;

  const patch = (id: string, p: Partial<AdventureStep>) => onChange(steps.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const move = (id: string, dir: -1 | 1) => {
    const i = steps.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <Panel
      title="Mission designer"
      kicker={`${adventure.name} · ${steps.length} steps`}
      onClose={onClose}
      wide
      footer={
        <button
          type="button"
          className="hud-btn hud-btn-primary w-full"
          onClick={() => {
            const s = blankStep(steps.length + 1);
            // New steps follow the previous one by default.
            const last = steps[steps.length - 1];
            if (last) s.prerequisites = [last.id];
            onChange([...steps, s]);
            onSelect(s.id);
          }}
        >
          <IconPlus size={16} /> Add step
        </button>
      }
    >
      <ol className="designer-list" style={{ ["--adv" as string]: adventure.look.color }}>
        {steps.map((s, i) => (
          <li key={s.id} className={`designer-item ${s.id === selectedId ? "is-open" : ""}`}>
            <button type="button" className="designer-head" onClick={() => onSelect(s.id === selectedId ? null : s.id)}>
              <span className="step-row-num">{i + 1}</span>
              <span className="min-w-0 flex-1 text-left">
                <span className="step-row-title block truncate">{s.title || "Untitled step"}</span>
                <span className="step-row-meta block truncate">
                  {s.lngLat ? s.placeName || formatLngLat(s.lngLat) : "No location"} · {s.prerequisites.length} prereq · {s.rewards.length} rewards
                  {s.capture ? " · 🎬 media" : ""}
                </span>
              </span>
              <IconChevron size={16} className={s.id === selectedId ? "rotate-90" : ""} />
            </button>

            {s.id === selectedId && selected ? (
              <div className="designer-body">
                <label className="hud-field">
                  <span>Title</span>
                  <input value={s.title} maxLength={48} onChange={(e) => patch(s.id, { title: e.target.value })} />
                </label>
                <label className="hud-field">
                  <span>Instruction</span>
                  <textarea rows={3} maxLength={400} value={s.instruction} onChange={(e) => patch(s.id, { instruction: e.target.value })} placeholder="What do players do here?" />
                </label>

                <div className="hud-field">
                  <span>Location</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="hud-btn" onClick={() => onPickLocation(s)}>
                      <IconPin size={16} /> {s.lngLat ? "Move on map" : "Set on map"}
                    </button>
                    {s.lngLat ? (
                      <button type="button" className="hud-btn hud-btn-ghost" onClick={() => patch(s.id, { lngLat: null })}>
                        Clear
                      </button>
                    ) : null}
                    <span className="text-xs text-zinc-400">{s.lngLat ? formatLngLat(s.lngLat) : "Anywhere (no check-in)"}</span>
                  </div>
                  {s.lngLat ? (
                    <div className="mt-2 grid grid-cols-[1fr_110px] gap-2">
                      <input value={s.placeName} maxLength={48} placeholder="Place name" onChange={(e) => patch(s.id, { placeName: e.target.value })} />
                      <select value={s.radiusM} onChange={(e) => patch(s.id, { radiusM: Number(e.target.value) })} aria-label="Check-in radius">
                        {[50, 100, 300, 1000, 5000].map((m) => (
                          <option key={m} value={m}>
                            {m >= 1000 ? `${m / 1000} km` : `${m} m`} radius
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>

                <div className="hud-field">
                  <span>Prerequisites — unlocks after</span>
                  {steps.length < 2 ? <p className="text-xs text-zinc-500">Add more steps to chain them.</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {steps
                      .filter((o) => o.id !== s.id)
                      .map((o) => {
                        const on = s.prerequisites.includes(o.id);
                        const blocked = !on && wouldCycle(steps, s.id, o.id);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            className={`prereq-chip ${on ? "is-on" : ""}`}
                            disabled={blocked}
                            title={blocked ? "Would create a loop" : undefined}
                            onClick={() =>
                              patch(s.id, {
                                prerequisites: on ? s.prerequisites.filter((p) => p !== o.id) : [...s.prerequisites, o.id],
                              })
                            }
                          >
                            {steps.indexOf(o) + 1}. {o.title}
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div className="hud-field">
                  <span>Rewards</span>
                  <div className="step-rewards">
                    {s.rewards.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className={`reward-chip is-${r.kind} is-removable`}
                        onClick={() => patch(s.id, { rewards: s.rewards.filter((x) => x.id !== r.id) })}
                        aria-label={`Remove reward ${rewardText(r)}`}
                      >
                        {rewardText(r)} ✕
                      </button>
                    ))}
                    {!s.rewards.length ? <span className="text-xs text-zinc-500">No rewards yet.</span> : null}
                  </div>
                  <form
                    className="reward-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const label = reward.kind === "xp" ? "XP" : reward.label.trim();
                      if (!label) return;
                      const r: Reward = { id: newId("rw"), kind: reward.kind, label, amount: Math.max(1, reward.amount || 1) };
                      patch(s.id, { rewards: [...s.rewards, r] });
                      setReward({ ...reward, label: "" });
                    }}
                  >
                    <select value={reward.kind} onChange={(e) => setReward({ ...reward, kind: e.target.value as RewardKind, amount: e.target.value === "xp" ? 100 : 1 })} aria-label="Reward type">
                      {KINDS.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                    {reward.kind !== "xp" ? (
                      <input value={reward.label} maxLength={32} placeholder={reward.kind === "badge" ? "Badge name" : "Item name"} onChange={(e) => setReward({ ...reward, label: e.target.value })} aria-label="Reward name" />
                    ) : null}
                    {reward.kind !== "badge" ? (
                      <input type="number" min={1} value={reward.amount} onChange={(e) => setReward({ ...reward, amount: Number(e.target.value) })} aria-label="Amount" />
                    ) : null}
                    <button type="submit" className="hud-btn">
                      Add
                    </button>
                  </form>
                </div>

                <div className="hud-field">
                  <span>Recap film</span>
                  <label className="hud-check">
                    <input
                      type="checkbox"
                      checked={!!s.capture}
                      onChange={(e) =>
                        patch(s.id, { capture: e.target.checked ? { kind: "any", prompt: "" } : null })
                      }
                    />
                    <span>Collect photos/videos at this step</span>
                  </label>
                  {s.capture ? (
                    <div className="mt-1 grid grid-cols-[110px_1fr] gap-2">
                      <select
                        value={s.capture.kind}
                        aria-label="Capture type"
                        onChange={(e) => patch(s.id, { capture: { ...s.capture!, kind: e.target.value as "photo" | "video" | "any" } })}
                      >
                        <option value="any">Photo or video</option>
                        <option value="photo">Photo</option>
                        <option value="video">Video</option>
                      </select>
                      <input
                        value={s.capture.prompt}
                        maxLength={60}
                        placeholder="Shot prompt, e.g. Team photo at the gate"
                        onChange={(e) => patch(s.id, { capture: { ...s.capture!, prompt: e.target.value } })}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" className="hud-btn" onClick={() => move(s.id, -1)} disabled={i === 0}>
                    ↑ Up
                  </button>
                  <button type="button" className="hud-btn" onClick={() => move(s.id, 1)} disabled={i === steps.length - 1}>
                    ↓ Down
                  </button>
                  <button
                    type="button"
                    className="hud-btn hud-btn-danger ml-auto"
                    onClick={() => {
                      onChange(steps.filter((x) => x.id !== s.id));
                      onSelect(null);
                    }}
                  >
                    <IconTrash size={16} /> Delete step
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      {!steps.length ? <div className="hud-empty">No steps yet — add the first one below.</div> : null}
    </Panel>
  );
}
