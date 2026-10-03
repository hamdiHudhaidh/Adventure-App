"use client";

import { useEffect, useRef } from "react";
import adventureStyle from "@/lib/adventureMapStyle.json";
import type { MapLoadStatus, MapViewport } from "./MapHud";
import type { MapInstance, MapLibreNS } from "./map/maplibre";

const WORLD_CENTER: [number, number] = [20, 0];
const WORLD_ZOOM = 2.2;
const MAPLIBRE_JS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

// Pin tile URL so we don't depend on TileJSON fetch succeeding on every network
const TILE_URL =
  "https://tiles.openfreemap.org/planet/20260913_164504_pt/{z}/{x}/{y}.pbf";

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

function readViewport(map: MapInstance): MapViewport {
  const center = map.getCenter();
  return { zoom: map.getZoom(), lat: center.lat, lng: center.lng };
}

export default function MapView({
  onViewportChange,
  onStatusChange,
  onMapReady,
}: {
  onViewportChange: (viewport: MapViewport) => void;
  onStatusChange: (status: MapLoadStatus, error: string | null) => void;
  /** Fired once the style has loaded so overlays (pins, routes) can attach. */
  onMapReady?: (map: MapInstance | null, maplibregl: MapLibreNS | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const onViewportChangeRef = useRef(onViewportChange);
  const onStatusChangeRef = useRef(onStatusChange);
  const onMapReadyRef = useRef(onMapReady);
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
    onStatusChangeRef.current = onStatusChange;
    onMapReadyRef.current = onMapReady;
  });

  useEffect(() => {
    let cancelled = false;
    let handleResize: (() => void) | null = null;

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
        map.addControl(
          new maplibregl.ScaleControl({ maxWidth: 110, unit: "metric" }),
          "bottom-left",
        );

        const emitViewport = () => {
          if (!cancelled) onViewportChangeRef.current(readViewport(map));
        };

        map.on("load", () => {
          if (cancelled) return;
          emitViewport();
          onStatusChangeRef.current("ready", null);
          onMapReadyRef.current?.(map, maplibregl);
        });

        map.on("move", emitViewport);

        const handleWindowResize = () => map.resize();
        handleResize = handleWindowResize;
        window.addEventListener("resize", handleWindowResize);

        map.on("error", (event) => {
          const message = event?.error?.message || "Map failed to load tiles";
          if (/AJAXError|Failed to fetch|worker|WebGL|style/i.test(message)) {
            if (!cancelled) onStatusChangeRef.current("error", message);
          }
        });

        mapRef.current = map;
      } catch (err: unknown) {
        if (!cancelled) {
          onStatusChangeRef.current(
            "error",
            err instanceof Error ? err.message : "Map failed to start",
          );
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
      if (handleResize) window.removeEventListener("resize", handleResize);
      onMapReadyRef.current?.(null, null);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="adventure-map h-full w-full bg-[#050506]"
      role="application"
      aria-label="Adventure world map"
    />
  );
}
