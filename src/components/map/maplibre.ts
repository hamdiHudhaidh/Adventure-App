// Minimal typings for the MapLibre build loaded from the CDN (see MapView.tsx).
// We only type what the app uses so the CDN global stays the single runtime.

export type LngLat = [number, number];

export type MapMouseEvent = {
  lngLat: { lng: number; lat: number };
  point: { x: number; y: number };
  originalEvent?: Event;
};

export type MapEventHandler = (e?: { error?: { message?: string } } & Partial<MapMouseEvent>) => void;

export type GeoJSONSource = {
  setData: (data: unknown) => void;
};

export type MapInstance = {
  addControl: (control: unknown, position?: string) => void;
  on: (event: string, handler: MapEventHandler) => void;
  off: (event: string, handler: MapEventHandler) => void;
  once: (event: string, handler: MapEventHandler) => void;
  remove: () => void;
  resize: () => void;
  getZoom: () => number;
  getCenter: () => { lng: number; lat: number };
  flyTo: (options: Record<string, unknown>) => void;
  easeTo: (options: Record<string, unknown>) => void;
  fitBounds: (bounds: [LngLat, LngLat], options?: Record<string, unknown>) => void;
  project: (lngLat: LngLat) => { x: number; y: number };
  addSource: (id: string, source: Record<string, unknown>) => void;
  getSource: (id: string) => GeoJSONSource | undefined;
  removeSource: (id: string) => void;
  addLayer: (layer: Record<string, unknown>, beforeId?: string) => void;
  getLayer: (id: string) => unknown;
  removeLayer: (id: string) => void;
  setPaintProperty: (layer: string, prop: string, value: unknown) => void;
  isStyleLoaded: () => boolean;
  getCanvas: () => HTMLCanvasElement;
};

export type MarkerInstance = {
  setLngLat: (lngLat: LngLat) => MarkerInstance;
  addTo: (map: MapInstance) => MarkerInstance;
  remove: () => void;
  getElement: () => HTMLElement;
};

export type MapLibreNS = {
  Map: new (options: Record<string, unknown>) => MapInstance;
  NavigationControl: new (options?: Record<string, unknown>) => unknown;
  ScaleControl: new (options?: Record<string, unknown>) => unknown;
  Marker: new (options?: Record<string, unknown>) => MarkerInstance;
};

declare global {
  interface Window {
    maplibregl?: MapLibreNS;
  }
}
