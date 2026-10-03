"use client";

export type MapViewport = {
  zoom: number;
  lat: number;
  lng: number;
};

export type MapLoadStatus = "loading" | "ready" | "error";

function formatCoord(lat: number, lng: number) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}  ${Math.abs(lng).toFixed(2)}°${ew}`;
}

function formatZoom(zoom: number) {
  return zoom.toFixed(1);
}

function atlasMode(zoom: number) {
  if (zoom < 3.2) return "World";
  if (zoom < 6) return "Region";
  if (zoom < 10) return "Territory";
  return "Local";
}

export default function MapHud({
  viewport,
  status,
}: {
  viewport: MapViewport;
  status: MapLoadStatus;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1000]">
      <div className="hud-vignette" />
      <div className="hud-scanlines" />

      <div className="hud-corner hud-corner-tl" />
      <div className="hud-corner hud-corner-tr" />
      <div className="hud-corner hud-corner-bl" />
      <div className="hud-corner hud-corner-br" />

      <header className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="hud-chip">
          <span className="hud-chip-mark" aria-hidden />
          <span>Adventure · {atlasMode(viewport.zoom)}</span>
        </div>
        <div className="hud-chip hud-chip-data">
          <span className="hidden sm:inline">{formatCoord(viewport.lat, viewport.lng)}</span>
          <span className="hud-chip-sep hidden sm:block" aria-hidden />
          <span>Z {formatZoom(viewport.zoom)}</span>
        </div>
      </header>

      <footer className="absolute inset-x-0 bottom-0 hidden items-end justify-center px-5 py-4 sm:flex sm:px-6">
        <div className="hud-chip hud-chip-quiet">
          {status === "ready" ? "Pan · Zoom to explore" : "Acquiring signal"}
        </div>
      </footer>
    </div>
  );
}

export function MapLoadingOverlay({
  visible,
  error,
}: {
  visible: boolean;
  error: string | null;
}) {
  if (!visible && !error) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center bg-[#050506]/62">
      {error ? (
        <div className="pointer-events-auto mx-4 max-w-md rounded-sm border border-red-400/35 bg-zinc-950/90 px-4 py-3 text-center text-sm text-red-300 backdrop-blur">
          {error}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="hud-radar" aria-hidden />
          <p className="font-[family-name:var(--font-game)] text-xs tracking-[0.28em] text-[#F5FF00] uppercase">
            Loading map
          </p>
        </div>
      )}
    </div>
  );
}
