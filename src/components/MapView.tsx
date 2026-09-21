"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import adventureStyle from "@/lib/adventureMapStyle.json";

const WORLD_CENTER: [number, number] = [20, 0];
const WORLD_ZOOM = 2.2;

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: adventureStyle as StyleSpecification,
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      minZoom: 1.5,
      maxZoom: 18,
      attributionControl: {
        compact: true,
      },
      dragRotate: false,
      pitchWithRotate: false,
      fadeDuration: 0,
    });

    map.addControl(
      new NavigationControl({
        showCompass: false,
        visualizePitch: false,
      }),
      "bottom-right",
    );

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="adventure-map h-full w-full bg-[#0a0a0a]"
      role="application"
      aria-label="Adventure world map"
    />
  );
}
