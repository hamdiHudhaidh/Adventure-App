"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import MapHud, { MapLoadingOverlay, type MapViewport } from "./MapHud";
import { MapContext, type MapHandle } from "./map/MapContext";
import type { MapInstance, MapLibreNS } from "./map/maplibre";
import PlacementOverlay from "./map/PlacementOverlay";
import Dock, { type DockItem } from "./hud/Dock";
import { IconMemories, IconShield, IconUser } from "./hud/icons";
import { ToastProvider, useToast } from "./hud/Toasts";
import Avatar from "./auth/Avatar";
import AccountPanel from "./auth/AccountPanel";
import AdminConsolePanel from "./auth/AdminConsolePanel";
import AuthSheet from "./auth/AuthSheet";
import MediaView from "./photos/MediaView";
import PhotoClusters from "./photos/PhotoClusters";
import PhotoLibraryPanel from "./photos/PhotoLibraryPanel";
import PhotoViewer from "./photos/PhotoViewer";
import { boundsOf, type PhotoCluster } from "@/lib/cluster";
import { useAuth } from "@/lib/auth/hooks";
import { canEditContent, isAdmin } from "@/lib/auth/permissions";
import { useAppState, useRepository } from "@/lib/data/hooks";
import { deleteBlob } from "@/lib/data/media";
import type { LngLat, Photo } from "@/lib/data/types";
import { prepareUpload, type PreparedUpload } from "@/lib/upload";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
});

const INITIAL_VIEW: MapViewport = { zoom: 2.2, lat: 0, lng: 20 };
const HOME: { center: LngLat; zoom: number } = { center: [46.35, 24.78], zoom: 8.4 };

type PanelState =
  | { type: "library" }
  | { type: "cluster"; cluster: PhotoCluster }
  | { type: "account" }
  | { type: "admin" }
  | null;

function AdventureMapInner() {
  const [viewport, setViewport] = useState<MapViewport>(INITIAL_VIEW);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [handle, setHandle] = useState<MapHandle | null>(null);
  const [panel, setPanel] = useState<PanelState>(null);
  const [viewer, setViewer] = useState<{ ids: string[]; index: number } | null>(null);
  const [pending, setPending] = useState<PreparedUpload[]>([]);
  const [uploading, setUploading] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const introDone = useRef(false);
  const { user, auth } = useAuth();
  const admin = isAdmin(user);
  const author = user ? { authorId: user.id, authorName: user.name } : null;

  const state = useAppState();
  const repo = useRepository();
  const toast = useToast();
  const photos = state.photos;

  const onMapReady = useCallback((map: MapInstance | null, gl: MapLibreNS | null) => {
    setHandle(map && gl ? { map, gl } : null);
  }, []);

  // Cinematic intro: world view -> the photos around Riyadh.
  useEffect(() => {
    if (!handle || introDone.current) return;
    introDone.current = true;
    const t = window.setTimeout(
      () => handle.map.flyTo({ center: HOME.center, zoom: HOME.zoom, speed: 0.9, curve: 1.5 }),
      700,
    );
    return () => window.clearTimeout(t);
  }, [handle]);

  const sideOffset = useCallback(
    (): [number, number] =>
      panel && window.innerWidth > 640 ? [-Math.min(220, window.innerWidth * 0.2), 0] : [0, 0],
    [panel],
  );

  const flyTo = useCallback(
    (lngLat: LngLat, zoom = 14) => {
      handle?.map.flyTo({
        center: lngLat,
        zoom: Math.max(zoom, handle.map.getZoom()),
        speed: 1.2,
        offset: sideOffset(),
      });
    },
    [handle, sideOffset],
  );

  const zoomToPhotos = useCallback(
    (list: Photo[]) => {
      if (!handle || !list.length) return;
      if (list.length === 1) return flyTo(list[0].lngLat, 15);
      const wide = window.innerWidth > 640 && panel;
      handle.map.fitBounds(boundsOf(list), {
        padding: { top: 120, bottom: 120, left: 120, right: wide ? 480 : 80 },
        maxZoom: 17,
        duration: 1200,
      });
    },
    [handle, flyTo, panel],
  );

  const handleFiles = async (files: File[]) => {
    if (!author) {
      setAuthOpen(true);
      return;
    }
    setUploading(files.length);
    let placed = 0;
    const needPin: PreparedUpload[] = [];
    const failures: string[] = [];
    for (const file of files) {
      try {
        const up = await prepareUpload(file);
        if (up.exifLngLat) {
          repo.photos.add({
            ...author,
            lngLat: up.exifLngLat,
            locationSource: "exif",
            media: up.media,
            caption: "",
            placeName: "",
            takenAt: up.takenAt,
          });
          placed++;
        } else {
          needPin.push(up);
        }
      } catch (err) {
        failures.push(err instanceof Error ? err.message : file.name);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (placed) toast({ title: `${placed} photo${placed > 1 ? "s" : ""} placed`, body: "Location read from photo GPS.", tone: "reward" });
    if (failures.length) toast({ title: "Some files were skipped", body: failures.join(" · "), tone: "alert" });
    if (needPin.length) {
      setPanel(null);
      setPending((p) => [...p, ...needPin]);
      toast({ title: `${needPin.length} photo${needPin.length > 1 ? "s need" : " needs"} a pin`, body: "No GPS found — drop a pin for each." });
    }
  };

  const viewerPhotos = useMemo(
    () => (viewer ? viewer.ids.map((id) => photos.find((p) => p.id === id)).filter((p): p is Photo => !!p) : []),
    [viewer, photos],
  );

  const openViewer = (list: Photo[], index: number) => setViewer({ ids: list.map((p) => p.id), index });

  const dockItems: DockItem[] = [
    { id: "library", label: "Photos", icon: <IconMemories />, badge: photos.length || undefined },
    ...(admin ? [{ id: "admin", label: "Admin", icon: <IconShield /> }] : []),
    {
      id: "account",
      label: user ? user.name.split(" ")[0].slice(0, 9) : "Sign in",
      icon: user ? <Avatar user={user} size={22} /> : <IconUser />,
    },
  ];

  const current = pending[0];

  return (
    <MapContext.Provider value={handle}>
      <div className="relative h-full w-full overflow-hidden bg-[#050506]">
        <MapView
          onViewportChange={setViewport}
          onStatusChange={(nextStatus, nextError) => {
            setStatus(nextStatus);
            setError(nextError);
          }}
          onMapReady={onMapReady}
        />

        <PhotoClusters
          photos={photos}
          selectedId={viewerPhotos[viewer?.index ?? 0]?.id ?? null}
          onSelectCluster={(cluster) => {
            if (cluster.photos.length === 1) {
              openViewer(cluster.photos, 0);
            } else {
              setPanel({ type: "cluster", cluster });
            }
          }}
        />

        <MapHud viewport={viewport} status={status} />

        <div className="pointer-events-none absolute inset-0 z-[1100]">
          {!current ? (
            <Dock
              items={dockItems}
              active={panel?.type ?? null}
              onSelect={(id) => {
                if (id === "account" && !user) return setAuthOpen(true);
                setPanel((p) => (p?.type === id ? null : ({ type: id } as PanelState)));
              }}
            />
          ) : null}

          {panel?.type === "account" && user ? (
            <AccountPanel
              user={user}
              onClose={() => setPanel(null)}
              onSignOut={() => {
                auth.signOut();
                setPanel(null);
                toast({ title: "Signed out" });
              }}
            />
          ) : null}

          {panel?.type === "admin" && admin ? (
            <AdminConsolePanel
              onClose={() => setPanel(null)}
              onResetDemo={() => {
                repo.reset();
                setViewer(null);
                toast({ title: "Demo content reset", body: "Sample photos restored." });
              }}
            />
          ) : null}

          {uploading > 0 ? (
            <div className="hud-upload-chip">Processing {uploading} file{uploading > 1 ? "s" : ""}…</div>
          ) : null}

          {panel?.type === "library" && !current ? (
            <PhotoLibraryPanel
              title="Photo Map"
              kicker={`${photos.length} photos · tap a pin to view`}
              photos={photos}
              onClose={() => setPanel(null)}
              onOpen={openViewer}
              onAddFiles={handleFiles}
              canUpload={!!user}
              uploadHint="Sign in to add your photos to the map."
              footerExtra={
                !user ? (
                  <button type="button" className="hud-btn hud-btn-primary w-full" onClick={() => setAuthOpen(true)}>
                    Sign in
                  </button>
                ) : null
              }
            />
          ) : null}

          {panel?.type === "cluster" && !current ? (
            <PhotoLibraryPanel
              key={panel.cluster.id}
              title={panel.cluster.cover.placeName || "Photos here"}
              kicker={`${panel.cluster.photos.length} photos in this area`}
              photos={panel.cluster.photos
                .map((p) => photos.find((x) => x.id === p.id))
                .filter((p): p is Photo => !!p)}
              onClose={() => setPanel(null)}
              onOpen={openViewer}
              onZoom={() => zoomToPhotos(panel.cluster.photos)}
            />
          ) : null}
        </div>

        {current ? (
          <PlacementOverlay
            title={`Drop a pin · ${pending.length} left`}
            hint={`No GPS in “${current.name}”. Pan the map under the reticle.`}
            center={[viewport.lng, viewport.lat]}
            onCancel={() => {
              pending.forEach((p) => p.media.source === "local" && void deleteBlob(p.media.blobId));
              setPending([]);
            }}
            extraActions={
              <button
                type="button"
                className="hud-btn hud-btn-ghost"
                onClick={() => {
                  if (current.media.source === "local") void deleteBlob(current.media.blobId);
                  setPending((p) => p.slice(1));
                }}
              >
                Skip
              </button>
            }
            onConfirm={(lngLat) => {
              if (!author) return;
              repo.photos.add({
                ...author,
                lngLat,
                locationSource: "pin",
                media: current.media,
                caption: "",
                placeName: "",
                takenAt: current.takenAt,
              });
              setPending((p) => p.slice(1));
              toast({ title: "Photo pinned", tone: "reward" });
            }}
          >
            <MediaView media={current.media} alt="" className="placement-thumb" />
          </PlacementOverlay>
        ) : null}

        {viewer && viewerPhotos.length ? (
          <PhotoViewer
            photos={viewerPhotos}
            index={Math.min(viewer.index, viewerPhotos.length - 1)}
            onIndexChange={(index) => setViewer((v) => (v ? { ...v, index } : v))}
            onClose={() => setViewer(null)}
            onLocate={(p) => {
              setViewer(null);
              flyTo(p.lngLat, 15);
            }}
            canEdit={(p) => canEditContent(user, p.authorId)}
            onSave={(p, patch) => repo.photos.update(p.id, patch)}
            onDelete={(p) => {
              repo.photos.remove(p.id);
              toast({ title: "Photo deleted" });
            }}
          />
        ) : null}

        {authOpen ? (
          <AuthSheet
            onClose={() => setAuthOpen(false)}
            onDone={(message) => {
              setAuthOpen(false);
              toast({ title: message, tone: "reward" });
            }}
          />
        ) : null}

        <MapLoadingOverlay visible={status === "loading"} error={error} />
      </div>
    </MapContext.Provider>
  );
}

export default function AdventureMap() {
  return (
    <ToastProvider>
      <AdventureMapInner />
    </ToastProvider>
  );
}
