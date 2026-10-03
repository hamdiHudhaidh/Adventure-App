// Client-side recap film renderer: draws title card, clips (Ken Burns photos,
// trimmed videos) and an end card onto a canvas. The same renderer drives
// in-app playback and the MediaRecorder export, so preview == final cut.

import { asset } from "@/lib/basePath";
import { getBlobUrl } from "@/lib/data/media";
import type { MediaRef, RecapClip } from "@/lib/data/types";
import { END_SECONDS, TITLE_SECONDS } from "@/lib/recap";

export type FilmInput = {
  title: string;
  subtitle: string;
  clips: RecapClip[];
  credits: string[];
  color: string;
  dateLabel: string;
};

type Segment =
  | { kind: "title"; start: number; end: number }
  | { kind: "end"; start: number; end: number }
  | { kind: "clip"; start: number; end: number; clip: RecapClip; el: HTMLImageElement | HTMLVideoElement | null; index: number };

export const FILM_W = 1280;
export const FILM_H = 720;

async function resolveUrl(media: MediaRef) {
  if (media.source === "static") return asset(media.src);
  return getBlobUrl(media.blobId);
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function loadVideo(url: string) {
  return new Promise<HTMLVideoElement | null>((resolve) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.crossOrigin = "anonymous";
    const done = (ok: boolean) => resolve(ok ? v : null);
    v.onloadeddata = () => done(true);
    v.onerror = () => done(false);
    window.setTimeout(() => done(v.readyState >= 2), 8000);
    v.src = url;
  });
}

export class RecapRenderer {
  private ctx: CanvasRenderingContext2D;
  private segments: Segment[] = [];
  private raf = 0;
  private startedAt = 0;
  private active: HTMLVideoElement | null = null;
  readonly duration: number;
  private font: string;

  constructor(
    private canvas: HTMLCanvasElement,
    private film: FilmInput,
  ) {
    canvas.width = FILM_W;
    canvas.height = FILM_H;
    this.ctx = canvas.getContext("2d")!;
    const family = getComputedStyle(document.body).getPropertyValue("--font-game").trim();
    this.font = family ? `${family}, sans-serif` : "sans-serif";
    let t = 0;
    this.segments.push({ kind: "title", start: 0, end: (t = TITLE_SECONDS) });
    film.clips.forEach((clip, index) => {
      this.segments.push({ kind: "clip", start: t, end: t + clip.duration, clip, el: null, index });
      t += clip.duration;
    });
    this.segments.push({ kind: "end", start: t, end: t + END_SECONDS });
    this.duration = t + END_SECONDS;
  }

  async load(onProgress?: (done: number, total: number) => void) {
    const clips = this.segments.filter((s): s is Extract<Segment, { kind: "clip" }> => s.kind === "clip");
    let n = 0;
    await Promise.all(
      clips.map(async (seg) => {
        const url = await resolveUrl(seg.clip.media);
        if (url) seg.el = seg.clip.media.kind === "video" ? await loadVideo(url) : await loadImage(url);
        onProgress?.(++n, clips.length);
      }),
    );
    this.draw(0);
  }

  play(onTick: (t: number) => void, onEnd: () => void) {
    this.stop();
    this.startedAt = performance.now();
    const loop = () => {
      const t = (performance.now() - this.startedAt) / 1000;
      if (t >= this.duration) {
        this.draw(this.duration - 0.001);
        this.pauseVideo();
        onTick(this.duration);
        onEnd();
        return;
      }
      this.draw(t, true);
      onTick(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.pauseVideo();
  }

  private pauseVideo() {
    this.active?.pause();
    this.active = null;
  }

  /** Draw the frame at time t (seconds). */
  draw(t: number, live = false) {
    const { ctx } = this;
    const seg = this.segments.find((s) => t >= s.start && t < s.end) ?? this.segments[this.segments.length - 1];
    const local = t - seg.start;
    const len = seg.end - seg.start;
    ctx.save();
    ctx.fillStyle = "#050506";
    ctx.fillRect(0, 0, FILM_W, FILM_H);

    if (seg.kind === "clip") {
      const el = seg.el;
      if (el instanceof HTMLVideoElement) {
        if (live && this.active !== el) {
          this.pauseVideo();
          el.currentTime = seg.clip.trimStart + local;
          void el.play().catch(() => undefined);
          this.active = el;
        } else if (!live) {
          el.currentTime = seg.clip.trimStart + local;
        }
        this.cover(el, el.videoWidth, el.videoHeight, 1);
      } else if (el) {
        // Ken Burns: slow push-in with a gentle drift.
        const p = local / len;
        const dir = seg.index % 2 ? -1 : 1;
        this.cover(el, el.naturalWidth, el.naturalHeight, 1.04 + p * 0.1, dir * (p - 0.5) * 30);
      } else {
        this.missing();
      }
      // Cross-fade in.
      const fade = Math.min(1, local / 0.45);
      if (fade < 1) {
        ctx.fillStyle = `rgba(5,5,6,${1 - fade})`;
        ctx.fillRect(0, 0, FILM_W, FILM_H);
      }
      this.caption(seg.clip.caption, seg.index + 1, this.film.clips.length, Math.min(1, local / 0.6));
    } else if (seg.kind === "title") {
      this.titleCard(local / len);
    } else {
      this.endCard(local / len);
    }
    this.frame();
    ctx.restore();
  }

  private cover(src: CanvasImageSource, w: number, h: number, zoom: number, dx = 0) {
    if (!w || !h) return this.missing();
    const scale = Math.max(FILM_W / w, FILM_H / h) * zoom;
    const dw = w * scale;
    const dh = h * scale;
    this.ctx.drawImage(src, (FILM_W - dw) / 2 + dx, (FILM_H - dh) / 2, dw, dh);
    const g = this.ctx.createLinearGradient(0, FILM_H * 0.55, 0, FILM_H);
    g.addColorStop(0, "rgba(5,5,6,0)");
    g.addColorStop(1, "rgba(5,5,6,0.85)");
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, FILM_W, FILM_H);
  }

  private missing() {
    const { ctx } = this;
    ctx.fillStyle = "#121214";
    ctx.fillRect(0, 0, FILM_W, FILM_H);
    ctx.fillStyle = "#52525b";
    ctx.font = `24px ${this.font}`;
    ctx.textAlign = "center";
    ctx.fillText("MEDIA UNAVAILABLE", FILM_W / 2, FILM_H / 2);
  }

  private caption(text: string, n: number, total: number, alpha: number) {
    const { ctx } = this;
    ctx.globalAlpha = alpha;
    ctx.textAlign = "left";
    ctx.fillStyle = this.film.color;
    ctx.font = `600 18px ${this.font}`;
    ctx.fillText(`${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, 72, FILM_H - 118);
    ctx.fillStyle = "#f4f4f5";
    ctx.font = `700 42px ${this.font}`;
    ctx.fillText(text.toUpperCase().slice(0, 40), 72, FILM_H - 70);
    ctx.strokeStyle = this.film.color;
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(72, FILM_H - 50);
    ctx.lineTo(72 + Math.min(560, ctx.measureText(text.toUpperCase().slice(0, 40)).width), FILM_H - 50);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  private titleCard(p: number) {
    const { ctx } = this;
    const a = Math.min(1, p * 3);
    ctx.globalAlpha = a;
    ctx.strokeStyle = this.film.color;
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 2;
    ctx.strokeRect(120, 150, FILM_W - 240, FILM_H - 300);
    ctx.setLineDash([]);
    ctx.textAlign = "center";
    ctx.fillStyle = this.film.color;
    ctx.font = `600 22px ${this.font}`;
    ctx.fillText(this.film.subtitle.toUpperCase(), FILM_W / 2, 280);
    ctx.fillStyle = "#f4f4f5";
    ctx.font = `800 68px ${this.font}`;
    ctx.fillText(this.film.title.toUpperCase().slice(0, 26), FILM_W / 2, 370);
    ctx.fillStyle = "#a1a1aa";
    ctx.font = `500 20px ${this.font}`;
    ctx.fillText(`RECAP FILM · ${this.film.dateLabel.toUpperCase()}`, FILM_W / 2, 440);
    ctx.globalAlpha = 1;
  }

  private endCard(p: number) {
    const { ctx } = this;
    ctx.globalAlpha = Math.min(1, p * 3);
    ctx.textAlign = "center";
    ctx.fillStyle = this.film.color;
    ctx.font = `800 54px ${this.font}`;
    ctx.fillText("MISSION COMPLETE", FILM_W / 2, 300);
    ctx.fillStyle = "#e4e4e7";
    ctx.font = `500 22px ${this.font}`;
    const names = this.film.credits.join(" · ");
    const lines: string[] = [];
    let line = "";
    for (const word of names.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > FILM_W - 300) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    if (line) lines.push(line);
    lines.slice(0, 5).forEach((l, i) => ctx.fillText(l, FILM_W / 2, 370 + i * 34));
    ctx.globalAlpha = 1;
  }

  private frame() {
    const { ctx } = this;
    ctx.strokeStyle = this.film.color;
    ctx.lineWidth = 3;
    const c = 40;
    const m = 28;
    for (const [x, y, sx, sy] of [
      [m, m, 1, 1],
      [FILM_W - m, m, -1, 1],
      [m, FILM_H - m, 1, -1],
      [FILM_W - m, FILM_H - m, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * c);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * c, y);
      ctx.stroke();
    }
  }
}

/** Real-time export of the film to a video file with MediaRecorder. */
export async function exportFilm(
  canvas: HTMLCanvasElement,
  renderer: RecapRenderer,
  onTick: (t: number) => void,
): Promise<{ blob: Blob; ext: string }> {
  if (typeof MediaRecorder === "undefined" || !("captureStream" in canvas)) {
    throw new Error("Video export isn't supported in this browser.");
  }
  const types = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
  const stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
  const rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 5_000_000 } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((resolve) => (rec.onstop = () => resolve()));
  rec.start(250);
  await new Promise<void>((resolve) => renderer.play(onTick, resolve));
  await new Promise((r) => setTimeout(r, 200));
  rec.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  const type = rec.mimeType || mimeType || "video/webm";
  return { blob: new Blob(chunks, { type }), ext: type.includes("mp4") ? "mp4" : "webm" };
}
