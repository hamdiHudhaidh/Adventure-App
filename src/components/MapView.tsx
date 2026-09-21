"use client";

import { useEffect, useRef, useState } from "react";
import adventureStyle from "@/lib/adventureMapStyle.json";

const WORLD_CENTER: [number, number] = [20, 0];
const WORLD_ZOOM = 2.2;
const MAPLIBRE_JS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

// Pin tile URL so we don't depend on TileJSON fetch succeeding on every network
const TILE_URL =
  "https://tiles.openfreemap.org/planet/20260913_164504_pt/{z}/{x}/{y}.pbf";

type MapLibreNS = {
  Map: new (options: Record<string, unknown>) => {
    addControl: (control: unknown, position?: string) => void;
    on: (event: string, handler: (e?: { error?: { message?: string } }) => void) => void;
    remove: () => void;
  };
  NavigationControl: new (options?: Record<string, unknown>) => unknown;
};

declare global {
  interface Window {
    maplibregl?: MapLibreNS;
  }
}

function ensureCss() {
  if (document.getElementById("maplibre-css")) return;
  const link = document.createElement("link");
  link.id = "maplibre-css";
  link.rel = "stylesheet";
  link.href = MAPLIBRE_CSS;
  document.head.appendChild(link);
}

function loadMapLibre(): Promise<MapLibreNS> {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("maplibre-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () =>
        window.maplibregl
          ? resolve(window.maplibregl)
          : reject(new Error("MapLibre failed to initialize")),
      );
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load MapLibre script")),
      );
      return;
    }
    const script = document.createElement("script");
    script.id = "maplibre-js";
    script.src = MAPLIBRE_JS;
    script.async = true;
    script.onload = () =>
      window.maplibregl
        ? resolve(window.maplibregl)
        : reject(new Error("MapLibre failed to initialize"));
    script.onerror = () => reject(new Error("Failed to load MapLibre script"));
    document.body.appendChild(script);
  });
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ remove: () => void } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        ensureCss();
        const maplibregl = await loadMapLibre();
        if (cancelled || !containerRef.current) return;

        const style = {
          ...adventureStyle,
          sources: {
            openmaptiles: {
              type: "vector",
              tiles: [TILE_URL],
              maxzoom: 14,
              attribution:
                '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
            },
          },
        };

        const map = new maplibregl.Map({
          container: containerRef.current,
          style,
          center: WORLD_CENTER,
          zoom: WORLD_ZOOM,
          minZoom: 1.5,
          maxZoom: 18,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          fadeDuration: 0,
          failIfMajorPerformanceCaveat: false,
        });

        map.addControl(
          new maplibregl.NavigationControl({
            showCompass: false,
            visualizePitch: false,
          }),
          "bottom-right",
        );

        map.on("load", () => {
          if (!cancelled) setStatus("ready");
        });

        map.on("error", (event) => {
          const message = event?.error?.message || "Map failed to load tiles";
          // Ignore benign tile misses; surface real style/worker failures
          if (/AJAXError|Failed to fetch|worker|WebGL|style/i.test(message)) {
            if (!cancelled) {
              setStatus("error");
              setError(message);
            }
          }
        });

        mapRef.current = map;
      } catch (err: unknown) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Map failed to start");
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-[#0a0a0a]">
      <div
        ref={containerRef}
        className="adventure-map h-full w-full bg-[#0a0a0a]"
        role="application"
        aria-label="Adventure world map"
      />
      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0a]/70 font-[family-name:var(--font-game)] text-sm tracking-[0.18em] text-[#F5FF00] uppercase">
          Loading map…
        </div>
      ) : null}
      {status === "error" && error ? (
        <div className="absolute inset-x-4 bottom-6 z-20 rounded-md border border-red-400/40 bg-zinc-950/90 px-4 py-3 text-center text-sm text-red-300 backdrop-blur">
          {error}
        </div>
      ) : null}
    </div>
  );
}
