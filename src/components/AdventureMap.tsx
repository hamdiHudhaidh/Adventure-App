"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import MapHud, { MapLoadingOverlay, type MapViewport } from "./MapHud";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
});

const INITIAL_VIEW: MapViewport = { zoom: 2.2, lat: 0, lng: 20 };

export default function AdventureMap() {
  const [viewport, setViewport] = useState<MapViewport>(INITIAL_VIEW);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#050506]">
      <MapView
        onViewportChange={setViewport}
        onStatusChange={(nextStatus, nextError) => {
          setStatus(nextStatus);
          setError(nextError);
        }}
      />
      <MapHud viewport={viewport} status={status} />
      <MapLoadingOverlay visible={status === "loading"} error={error} />
    </div>
  );
}
