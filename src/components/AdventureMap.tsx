"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-zinc-400">
      Loading map…
    </div>
  ),
});

export default function AdventureMap() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-center justify-between px-4 py-3">
        <div className="pointer-events-auto rounded-md border border-[#F5FF00]/40 bg-zinc-950/80 px-3 py-1.5 text-sm font-semibold tracking-wide text-[#F5FF00] shadow-[0_0_12px_rgba(245,255,0,0.25)] backdrop-blur">
          Adventure App · Map
        </div>
      </header>
      <MapView />
    </div>
  );
}
