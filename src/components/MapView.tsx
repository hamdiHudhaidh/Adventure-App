"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  GeoJSON,
  useMapEvents,
  Marker,
} from "react-leaflet";
import L from "leaflet";
import type { Feature, FeatureCollection, GeoJsonObject, Point } from "geojson";
import type { Layer, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";

const WORLD_CENTER: [number, number] = [20, 0];
const WORLD_ZOOM = 2;

const NEON_YELLOW = "#F5FF00";
const LAND_GREY = "#3f3f46";
const LAND_GREY_DIM = "#27272a";

const URLS = {
  countries:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
  regions:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces_lines.geojson",
  cities:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_populated_places.geojson",
} as const;

const countryStyle: PathOptions = {
  color: NEON_YELLOW,
  weight: 1.4,
  opacity: 0.95,
  fillColor: LAND_GREY,
  fillOpacity: 1,
  dashArray: "2 7",
};

const regionLineStyle: PathOptions = {
  color: NEON_YELLOW,
  weight: 1,
  opacity: 0.75,
  fillOpacity: 0,
  dashArray: "1 5",
};

function propName(props: Record<string, unknown> | null | undefined): string {
  if (!props) return "";
  const keys = ["NAME_EN", "NAME", "name_en", "name", "NAMEASCII", "ADMIN"];
  for (const key of keys) {
    const value = props[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function bindLabel(
  layer: Layer,
  text: string,
  kind: "country" | "region" | "city",
) {
  if (!text) return;
  layer.bindTooltip(text, {
    permanent: true,
    direction: "center",
    className: `map-label map-label--${kind}`,
    opacity: 1,
  });
}

function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (event) => onZoom(event.target.getZoom()),
    load: (event) => onZoom(event.target.getZoom()),
  });
  return null;
}

function CityMarkers({
  cities,
  zoom,
}: {
  cities: FeatureCollection;
  zoom: number;
}) {
  const visible = useMemo(() => {
    if (zoom < 6) return [];
    // More cities as you zoom in
    const maxRank = zoom >= 9 ? 8 : zoom >= 7 ? 5 : 3;
    return cities.features.filter((feature) => {
      const rank = Number(feature.properties?.SCALERANK ?? 99);
      return rank <= maxRank && feature.geometry?.type === "Point";
    });
  }, [cities, zoom]);

  if (zoom < 6) return null;

  return (
    <>
      {visible.map((feature, index) => {
        const geometry = feature.geometry as Point;
        const [lng, lat] = geometry.coordinates;
        const name = propName(feature.properties as Record<string, unknown>);
        if (!name) return null;
        const icon = L.divIcon({
          className: "map-city-marker",
          html: `<span class="map-label map-label--city">${name}</span>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        return (
          <Marker
            key={`${name}-${index}`}
            position={[lat, lng]}
            icon={icon}
            interactive={false}
          />
        );
      })}
    </>
  );
}

export default function MapView() {
  const [zoom, setZoom] = useState(WORLD_ZOOM);
  const [countries, setCountries] = useState<GeoJsonObject | null>(null);
  const [regions, setRegions] = useState<GeoJsonObject | null>(null);
  const [cities, setCities] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [countriesRes, regionsRes, citiesRes] = await Promise.all([
          fetch(URLS.countries),
          fetch(URLS.regions),
          fetch(URLS.cities),
        ]);
        if (!countriesRes.ok || !regionsRes.ok || !citiesRes.ok) {
          throw new Error("Failed to load map detail layers");
        }
        const [countriesJson, regionsJson, citiesJson] = await Promise.all([
          countriesRes.json(),
          regionsRes.json(),
          citiesRes.json(),
        ]);
        if (cancelled) return;
        setCountries(countriesJson);
        setRegions(regionsJson);
        setCities(citiesJson as FeatureCollection);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load map");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const showRegions = zoom >= 4;
  const showCountryLabels = zoom <= 6;
  const countryDetailStyle: PathOptions = {
    ...countryStyle,
    weight: zoom >= 5 ? 1.8 : 1.4,
    dashArray: "2 7",
    fillColor: zoom >= 5 ? LAND_GREY_DIM : LAND_GREY,
  };

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
      <ZoomWatcher onZoom={setZoom} />

      {countries ? (
        <GeoJSON
          key={`countries-${showCountryLabels ? "labeled" : "plain"}`}
          data={countries}
          style={() => countryDetailStyle}
          onEachFeature={(feature: Feature, layer: Layer) => {
            layer.off("click");
            if (showCountryLabels) {
              bindLabel(
                layer,
                propName(feature.properties as Record<string, unknown>),
                "country",
              );
            }
          }}
        />
      ) : null}

      {showRegions && regions ? (
        <GeoJSON
          key={`regions-${zoom}`}
          data={regions}
          style={() => ({
            ...regionLineStyle,
            weight: zoom >= 7 ? 1.2 : 0.9,
            opacity: zoom >= 7 ? 0.9 : 0.65,
          })}
          onEachFeature={(_feature, layer) => {
            layer.off("click");
          }}
        />
      ) : null}

      {cities ? <CityMarkers cities={cities} zoom={zoom} /> : null}
    </MapContainer>
  );
}
