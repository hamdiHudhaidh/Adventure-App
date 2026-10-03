import { newId } from "./data/ids";
import type { Adventure, Capture, RecapClip, RecapCut } from "./data/types";

export const TITLE_SECONDS = 3;
export const END_SECONDS = 3.5;

export function defaultDuration(kind: "image" | "video") {
  return kind === "video" ? 5 : 3;
}

/** Build a first cut: captures in step order, then by time. */
export function autoAssemble(adventure: Adventure, captures: Capture[]): RecapCut {
  const order = new Map(adventure.steps.map((s, i) => [s.id, i]));
  const sorted = captures
    .filter((c) => c.adventureId === adventure.id)
    .sort((a, b) => (order.get(a.stepId) ?? 99) - (order.get(b.stepId) ?? 99) || a.at.localeCompare(b.at));
  const clips: RecapClip[] = sorted.slice(0, 40).map((c) => clipFromCapture(adventure, c));
  return {
    title: adventure.name,
    subtitle: adventure.brief.codename || "Recap",
    clips,
  };
}

export function clipFromCapture(adventure: Adventure, c: Capture): RecapClip {
  const step = adventure.steps.find((s) => s.id === c.stepId);
  return {
    id: newId("clip"),
    captureId: c.id,
    media: c.media,
    caption: step ? step.title : "",
    duration: defaultDuration(c.media.kind),
    trimStart: 0,
  };
}

export function cutDuration(cut: RecapCut) {
  return TITLE_SECONDS + cut.clips.reduce((n, c) => n + c.duration, 0) + END_SECONDS;
}

export function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}
