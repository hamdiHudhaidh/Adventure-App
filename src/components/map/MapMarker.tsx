"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LngLat, MarkerInstance } from "./maplibre";
import { useMapHandle } from "./MapContext";

/**
 * Renders React children as a MapLibre DOM marker. MapLibre keeps it glued to
 * the coordinate while panning/zooming; React owns the content via a portal.
 */
export default function MapMarker({
  lngLat,
  children,
  anchor = "bottom",
  zIndex,
}: {
  lngLat: LngLat;
  children: ReactNode;
  anchor?: "center" | "bottom" | "top" | "left" | "right";
  zIndex?: number;
}) {
  const handle = useMapHandle();
  const [el] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const node = document.createElement("div");
    node.className = "map-marker";
    return node;
  });
  const markerRef = useRef<MarkerInstance | null>(null);
  const [lng, lat] = lngLat;
  const latest = useRef<LngLat>(lngLat);

  useEffect(() => {
    latest.current = [lng, lat];
    markerRef.current?.setLngLat([lng, lat]);
  }, [lng, lat]);

  useEffect(() => {
    if (!handle || !el) return;
    const marker = new handle.gl.Marker({ element: el, anchor })
      .setLngLat(latest.current)
      .addTo(handle.map);
    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [handle, el, anchor]);

  useEffect(() => {
    const node = markerRef.current?.getElement();
    if (node) node.style.zIndex = zIndex !== undefined ? String(zIndex) : "";
  }, [zIndex, handle]);

  if (!handle || !el) return null;
  return createPortal(children, el);
}
