"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a] font-[family-name:var(--font-game)] text-sm tracking-[0.18em] text-[#F5FF00] uppercase">
      Loading map…
    </div>
  ),
});

export default function AdventureMap() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a]">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-center justify-between px-4 py-3">
        <div className="pointer-events-auto rounded-md border border-[#F5FF00]/45 bg-[#121212]/85 px-3 py-1.5 font-[family-name:var(--font-game)] text-xs font-semibold tracking-[0.2em] text-[#F5FF00] uppercase shadow-[0_0_14px_rgba(245,255,0,0.28)] backdrop-blur-md">
          Adventure App · Map
        </div>
      </header>
      <MapView />
    </div>
  );
}
