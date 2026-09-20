"use client";

import { useEffect, useState } from "react";
import { MapContainer, GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";

/** World view — player zooms in from here */
const WORLD_CENTER: [number, number] = [20, 0];
const WORLD_ZOOM = 2;

const NEON_YELLOW = "#F5FF00";
const LAND_GREY = "#3f3f46";

/** Low-res country outlines (no place-name labels) */
const COUNTRIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

const countryStyle: PathOptions = {
  color: NEON_YELLOW,
  weight: 1.25,
  opacity: 0.95,
  fillColor: LAND_GREY,
  fillOpacity: 1,
};

export default function MapView() {
  const [countries, setCountries] = useState<GeoJsonObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(COUNTRIES_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load map data (${res.status})`);
        return res.json();
      })
      .then((data: GeoJsonObject) => {
        if (!cancelled) setCountries(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load map");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950 px-6 text-center text-sm text-red-400">
        {error}
      </div>
    );
  }

  return (
    <MapContainer
      center={WORLD_CENTER}
      zoom={WORLD_ZOOM}
      minZoom={2}
      maxZoom={12}
      className="h-full w-full bg-zinc-950"
      scrollWheelZoom
      zoomControl
      worldCopyJump
      attributionControl={false}
    >
      {countries ? (
        <GeoJSON
          data={countries}
          style={() => countryStyle}
          // No popups / tooltips — keep place names off the map
          onEachFeature={(_feature, layer) => {
            layer.off("click");
          }}
        />
      ) : null}
    </MapContainer>
  );
}
