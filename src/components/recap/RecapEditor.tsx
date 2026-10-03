"use client";

import { useState } from "react";
import type { Adventure, Capture, Membership, Recap, RecapClip, RecapCut } from "@/lib/data/types";
import { autoAssemble, clipFromCapture, cutDuration, formatSeconds } from "@/lib/recap";
import Panel from "../hud/Panel";
import { IconPlay, IconPlus, IconTrash } from "../hud/icons";
import MediaView from "../photos/MediaView";

/** Admin final-cut editor: order, trim and caption clips, preview, Release. */
export default function RecapEditor({
  adventure,
  recap,
  captures,
  members,
  onSave,
  onPreview,
  onRelease,
  onClose,
}: {
  adventure: Adventure;
  recap: Recap | undefined;
  captures: Capture[];
  members: Membership[];
  onSave: (cut: RecapCut) => void;
  onPreview: (cut: RecapCut) => void;
  onRelease: () => void;
  onClose: () => void;
}) {
  const cut: RecapCut = recap?.draft ?? { title: adventure.name, subtitle: adventure.brief.codename || "Recap", clips: [] };
  const [confirm, setConfirm] = useState(false);
  const [picker, setPicker] = useState(false);
  const used = new Set(cut.clips.map((c) => c.captureId));
  const unused = captures.filter((c) => !used.has(c.id));
  const stepName = (id: string) => adventure.steps.find((s) => s.id === id)?.title ?? "Step";
  const captureSteps = adventure.steps.filter((s) => s.capture);
  const teamName = (id: string) => adventure.teams.find((t) => t.id === id)?.name ?? "";
  const set = (clips: RecapClip[]) => onSave({ ...cut, clips });
  const patch = (id: string, p: Partial<RecapClip>) => set(cut.clips.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= cut.clips.length) return;
    const next = [...cut.clips];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  const changedSinceRelease =
    !!recap?.released && JSON.stringify(recap.released.clips) !== JSON.stringify(cut.clips);

  return (
    <Panel
      title="Recap film"
      kicker={`${adventure.name} · ${recap?.released ? `released v${recap.released.version}` : "draft"}`}
      onClose={onClose}
      wide
      footer={
        confirm ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-zinc-300">
              Send “{cut.title}” ({formatSeconds(cutDuration(cut))}) to {members.length} participant
              {members.length === 1 ? "" : "s"}? It appears in their Films inbox.
            </p>
            <div className="flex gap-2">
              <button type="button" className="hud-btn flex-1" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="hud-btn hud-btn-primary flex-1"
                onClick={() => {
                  setConfirm(false);
                  onRelease();
                }}
              >
                Confirm release
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" className="hud-btn flex-1" disabled={!cut.clips.length} onClick={() => onPreview(cut)}>
              <IconPlay size={14} /> Preview
            </button>
            <button
              type="button"
              className="hud-btn hud-btn-primary flex-1"
              disabled={!cut.clips.length || (!!recap?.released && !changedSinceRelease && recap.released.title === cut.title)}
              onClick={() => setConfirm(true)}
            >
              {recap?.released ? (changedSinceRelease || recap.released.title !== cut.title ? "Release update" : "Released ✓") : "Release"}
            </button>
          </div>
        )
      }
    >
      <div className="recap-stats">
        <span>
          <b>{captures.length}</b> captures
        </span>
        <span>
          <b>{captureSteps.length}</b> capture steps
        </span>
        <span>
          <b>{cut.clips.length}</b> clips · {formatSeconds(cutDuration(cut))}
        </span>
      </div>
      {!captureSteps.length ? (
        <p className="hud-note mt-2">Turn on “Collect media” for steps in the mission designer so players can capture clips.</p>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="hud-field">
          <span>Film title</span>
          <input value={cut.title} maxLength={40} onChange={(e) => onSave({ ...cut, title: e.target.value })} />
        </label>
        <label className="hud-field">
          <span>Subtitle</span>
          <input value={cut.subtitle} maxLength={40} onChange={(e) => onSave({ ...cut, subtitle: e.target.value })} />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="hud-btn"
          disabled={!captures.length}
          onClick={() => onSave({ ...autoAssemble(adventure, captures), title: cut.title, subtitle: cut.subtitle })}
        >
          Auto-assemble from captures
        </button>
        <button type="button" className="hud-btn hud-btn-ghost" disabled={!unused.length} onClick={() => setPicker((p) => !p)}>
          <IconPlus size={14} /> Add clip ({unused.length})
        </button>
      </div>

      {picker && unused.length ? (
        <div className="recap-picker">
          {unused.map((c) => (
            <button
              key={c.id}
              type="button"
              className="recap-pick"
              onClick={() => set([...cut.clips, clipFromCapture(adventure, c)])}
              title={`${stepName(c.stepId)} · ${c.userName}`}
            >
              <MediaView media={c.media} alt="" className="recap-thumb" />
              <span>{stepName(c.stepId)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <h3 className="hud-section-title">Final cut</h3>
      {!cut.clips.length ? (
        <div className="hud-empty">No clips yet — auto-assemble or add clips from captures.</div>
      ) : (
        <ol className="recap-timeline">
          {cut.clips.map((clip, i) => {
            const cap = captures.find((c) => c.id === clip.captureId);
            return (
              <li key={clip.id} className="recap-clip" style={{ ["--adv" as string]: adventure.look.color }}>
                <span className="recap-clip-num">{i + 1}</span>
                <MediaView media={clip.media} alt="" className="recap-thumb" />
                <div className="min-w-0 flex-1">
                  <input
                    className="recap-caption"
                    value={clip.caption}
                    maxLength={40}
                    onChange={(e) => patch(clip.id, { caption: e.target.value })}
                    aria-label={`Caption for clip ${i + 1}`}
                  />
                  <p className="step-row-meta">
                    {clip.media.kind === "video" ? "Video" : "Photo"}
                    {cap ? ` · ${cap.userName}${teamName(cap.partyId) ? ` (${teamName(cap.partyId)})` : ""} · ${stepName(cap.stepId)}` : ""}
                  </p>
                  <div className="recap-clip-controls">
                    <label>
                      <span>{clip.duration.toFixed(1)}s</span>
                      <input
                        type="range"
                        min={1}
                        max={clip.media.kind === "video" ? 15 : 8}
                        step={0.5}
                        value={clip.duration}
                        onChange={(e) => patch(clip.id, { duration: Number(e.target.value) })}
                        aria-label={`Duration of clip ${i + 1}`}
                      />
                    </label>
                    {clip.media.kind === "video" ? (
                      <label>
                        <span>start {clip.trimStart.toFixed(1)}s</span>
                        <input
                          type="range"
                          min={0}
                          max={30}
                          step={0.5}
                          value={clip.trimStart}
                          onChange={(e) => patch(clip.id, { trimStart: Number(e.target.value) })}
                          aria-label={`Trim start of clip ${i + 1}`}
                        />
                      </label>
                    ) : null}
                  </div>
                </div>
                <div className="recap-clip-actions">
                  <button type="button" className="hud-btn hud-btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" className="hud-btn hud-btn-sm" onClick={() => move(i, 1)} disabled={i === cut.clips.length - 1} aria-label="Move down">
                    ↓
                  </button>
                  <button type="button" className="hud-btn hud-btn-sm hud-btn-ghost" onClick={() => set(cut.clips.filter((c) => c.id !== clip.id))} aria-label="Remove clip">
                    <IconTrash size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {recap?.released ? (
        <p className="hud-note mt-3">
          Released v{recap.released.version} by {recap.released.releasedBy} ·{" "}
          {new Date(recap.released.releasedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}. Edits stay in
          the draft until you release an update.
        </p>
      ) : null}
    </Panel>
  );
}
