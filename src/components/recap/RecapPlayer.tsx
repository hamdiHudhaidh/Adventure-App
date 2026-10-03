"use client";

import { useEffect, useRef, useState } from "react";
import { formatSeconds } from "@/lib/recap";
import { IconClose, IconPlay } from "../hud/icons";
import { exportFilm, RecapRenderer, type FilmInput } from "./renderer";

/** Full-screen recap film player (canvas), with optional video export. */
export default function RecapPlayer({
  film,
  kicker,
  onClose,
  autoPlay = true,
}: {
  film: FilmInput;
  kicker: string;
  onClose: () => void;
  autoPlay?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<RecapRenderer | null>(null);
  const [loaded, setLoaded] = useState<{ done: number; total: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [duration, setDuration] = useState(0);
  const [exporting, setExporting] = useState<"idle" | "recording" | "error">("idle");
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvas.current) return;
    const r = new RecapRenderer(canvas.current, film);
    renderer.current = r;
    let alive = true;
    void r
      .load((done, total) => alive && setLoaded({ done, total }))
      .then(() => {
        if (!alive) return;
        setDuration(r.duration);
        setReady(true);
        if (autoPlay) {
          setPlaying(true);
          r.play(setT, () => setPlaying(false));
        }
      });
    return () => {
      alive = false;
      r.stop();
    };
  }, [film, autoPlay]);

  useEffect(() => () => {
    if (download) URL.revokeObjectURL(download.url);
  }, [download]);

  const play = () => {
    if (!renderer.current) return;
    setPlaying(true);
    renderer.current.play(setT, () => setPlaying(false));
  };

  return (
    <div className="hud-modal-backdrop pointer-events-auto recap-backdrop" onClick={onClose}>
      <div className="recap-player" onClick={(e) => e.stopPropagation()} style={{ ["--adv" as string]: film.color }}>
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="hud-kicker" style={{ color: film.color }}>
              {kicker}
            </p>
            <h2 className="hud-title truncate">{film.title}</h2>
          </div>
          <button type="button" className="hud-icon-btn" onClick={onClose} aria-label="Close film">
            <IconClose size={18} />
          </button>
        </header>
        <div className="recap-screen">
          <canvas ref={canvas} className="recap-canvas" />
          {!ready ? (
            <div className="recap-loading">Loading clips {loaded ? `${loaded.done}/${loaded.total}` : "…"}</div>
          ) : !playing ? (
            <button type="button" className="recap-play" onClick={play} aria-label="Play film">
              <IconPlay size={36} />
            </button>
          ) : null}
        </div>
        <div className="recap-progress">
          <span style={{ width: `${duration ? (t / duration) * 100 : 0}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="recap-time">
            {formatSeconds(t)} / {formatSeconds(duration)}
          </span>
          <span className="flex-1" />
          <button type="button" className="hud-btn hud-btn-sm" disabled={!ready || playing || exporting === "recording"} onClick={play}>
            <IconPlay size={14} /> {t > 0 ? "Replay" : "Play"}
          </button>
          {download ? (
            <a className="hud-btn hud-btn-sm hud-btn-primary" href={download.url} download={download.name}>
              Download video
            </a>
          ) : (
            <button
              type="button"
              className="hud-btn hud-btn-sm"
              disabled={!ready || playing || exporting === "recording"}
              onClick={async () => {
                if (!canvas.current || !renderer.current) return;
                setExporting("recording");
                setError(null);
                setPlaying(true);
                try {
                  const { blob, ext } = await exportFilm(canvas.current, renderer.current, setT);
                  const name = `${film.title.replace(/[^\w-]+/g, "-").toLowerCase()}-recap.${ext}`;
                  setDownload({ url: URL.createObjectURL(blob), name });
                  setExporting("idle");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Export failed");
                  setExporting("error");
                } finally {
                  setPlaying(false);
                }
              }}
            >
              {exporting === "recording" ? "Rendering video…" : "Save as video"}
            </button>
          )}
        </div>
        {error ? <p className="hud-error mt-2">{error}</p> : null}
      </div>
    </div>
  );
}
