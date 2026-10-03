"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import MapHud, { MapLoadingOverlay, type MapViewport } from "./MapHud";
import { MapContext, type MapHandle } from "./map/MapContext";
import type { MapInstance, MapLibreNS } from "./map/maplibre";
import PlacementOverlay from "./map/PlacementOverlay";
import Dock, { type DockItem } from "./hud/Dock";
import { IconCompass, IconFlag, IconMemories, IconShield, IconUser } from "./hud/icons";
import AdventureDossier from "./adventures/AdventureDossier";
import AdventureEditor from "./adventures/AdventureEditor";
import AdventureMarker from "./adventures/AdventureMarker";
import AdventuresPanel from "./adventures/AdventuresPanel";
import { LookBadge } from "./adventures/looks";
import MissionTracker from "./steps/MissionTracker";
import StepList from "./steps/StepList";
import StepMarkers from "./steps/StepMarkers";
import StepsDesigner from "./steps/StepsDesigner";
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
import type { AdventureStep, LngLat, Photo } from "@/lib/data/types";
import { completedSet, rewardText } from "@/lib/steps";
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
  | { type: "adventures" }
  | { type: "mission"; highlightId?: string }
  | { type: "designer"; adventureId: string; stepId: string | null }
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
  const [openAdventureId, setOpenAdventureId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ photoId: string; adventureId?: string } | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [pickStep, setPickStep] = useState<{ adventureId: string; step: AdventureStep } | null>(null);
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

  const visibleAdventures = state.adventures.filter((a) => admin || a.status !== "draft");
  const membersOf = (adventureId: string) => state.memberships.filter((m) => m.adventureId === adventureId);
  const isMember = (adventureId: string) =>
    !!user && state.memberships.some((m) => m.adventureId === adventureId && m.userId === user.id);
  const adventureForPhoto = (photoId: string) => visibleAdventures.find((a) => a.photoId === photoId);
  const openAdventure = visibleAdventures.find((a) => a.id === openAdventureId) ?? null;
  const editorPhoto = editor ? photos.find((p) => p.id === editor.photoId) : undefined;
  const editorAdventure = editor?.adventureId ? state.adventures.find((a) => a.id === editor.adventureId) : undefined;

  // Progress is tracked per party. Until teams exist a party is one player.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const partyIdFor = (_adventureId: string) => user?.id ?? null;
  const doneFor = (adventureId: string) => {
    const party = partyIdFor(adventureId);
    return party ? completedSet(state.progress, adventureId, party) : new Set<string>();
  };
  const myAdventures = visibleAdventures.filter((a) => isMember(a.id) && a.steps.length);
  const trackedAdventure = myAdventures.find((a) => a.id === trackId) ?? myAdventures[0] ?? null;
  const designerAdventure =
    panel?.type === "designer" ? state.adventures.find((a) => a.id === panel.adventureId) ?? null : null;
  const routeAdventure =
    designerAdventure ??
    (pickStep ? state.adventures.find((a) => a.id === pickStep.adventureId) : null) ??
    visibleAdventures.find((a) => a.id === routeId) ??
    trackedAdventure;

  const completeStep = (adventureId: string, step: AdventureStep, how: "gps" | "manual") => {
    const party = partyIdFor(adventureId);
    if (!party || !user) return;
    repo.progress.complete(adventureId, party, step.id, user.name);
    toast({
      title: `Step complete · ${step.title}`,
      body: step.rewards.length ? `Rewards: ${step.rewards.map(rewardText).join(" · ")}` : how === "gps" ? "Checked in by GPS." : undefined,
      tone: "reward",
    });
  };

  const onStepMarker = (step: AdventureStep) => {
    if (!routeAdventure) return;
    if (panel?.type === "designer") return setPanel({ ...panel, stepId: step.id });
    if (isMember(routeAdventure.id)) {
      setTrackId(routeAdventure.id);
      return setPanel({ type: "mission", highlightId: step.id });
    }
    toast({ title: step.title, body: step.instruction || step.placeName });
  };

  const dockItems: DockItem[] = [
    ...(myAdventures.length ? [{ id: "mission", label: "Mission", icon: <IconCompass /> }] : []),
    { id: "adventures", label: "Adventures", icon: <IconFlag />, badge: visibleAdventures.length || undefined },
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

        {visibleAdventures.map((a) => {
          const photo = photos.find((p) => p.id === a.photoId);
          if (!photo) return null;
          return (
            <AdventureMarker
              key={a.id}
              adventure={a}
              lngLat={photo.lngLat}
              members={membersOf(a.id).length}
              joined={isMember(a.id)}
              onOpen={() => setOpenAdventureId(a.id)}
            />
          );
        })}

        {routeAdventure ? (
          <StepMarkers
            key={routeAdventure.id}
            adventure={routeAdventure}
            done={doneFor(routeAdventure.id)}
            selectedId={
              panel?.type === "designer" ? panel.stepId : panel?.type === "mission" ? panel.highlightId ?? null : null
            }
            onSelect={onStepMarker}
          />
        ) : null}

        <MapHud viewport={viewport} status={status} />

        <div className="pointer-events-none absolute inset-0 z-[1100]">
          {routeAdventure && !current && !pickStep ? (
            <button
              type="button"
              className="route-chip pointer-events-auto"
              style={{ ["--adv" as string]: routeAdventure.look.color }}
              onClick={() => {
                const pts = routeAdventure.steps.filter((x) => x.lngLat).map((x) => ({ lngLat: x.lngLat! }));
                if (pts.length && handle) {
                  handle.map.fitBounds(boundsOf(pts), { padding: 110, maxZoom: 14, duration: 1100 });
                }
              }}
            >
              <LookBadge look={routeAdventure.look} size={22} />
              <span>Route · {routeAdventure.name}</span>
            </button>
          ) : null}

          {!current && !pickStep ? (
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

          {panel?.type === "mission" && trackedAdventure && !pickStep ? (
            <MissionTracker
              adventures={myAdventures}
              activeId={trackedAdventure.id}
              onActiveChange={(id) => {
                setTrackId(id);
                setRouteId(id);
              }}
              done={doneFor(trackedAdventure.id)}
              highlightId={panel.highlightId}
              partyLabel={user?.name ?? ""}
              onComplete={(step) => completeStep(trackedAdventure.id, step, "manual")}
              onLocateStep={(step) => step.lngLat && flyTo(step.lngLat, 13)}
              onClose={() => setPanel(null)}
            />
          ) : null}

          {designerAdventure && panel?.type === "designer" && admin && !pickStep ? (
            <StepsDesigner
              adventure={designerAdventure}
              selectedId={panel.stepId}
              onSelect={(stepId) => {
                setPanel({ ...panel, stepId });
                const st = designerAdventure.steps.find((x) => x.id === stepId);
                if (st?.lngLat) flyTo(st.lngLat, 11);
              }}
              onChange={(steps) => repo.adventures.setSteps(designerAdventure.id, steps)}
              onPickLocation={(step) => {
                setPickStep({ adventureId: designerAdventure.id, step });
                if (step.lngLat) flyTo(step.lngLat, 13);
              }}
              onClose={() => setPanel(null)}
            />
          ) : null}

          {panel?.type === "adventures" && !current ? (
            <AdventuresPanel
              adventures={visibleAdventures}
              photos={photos}
              memberships={state.memberships}
              userId={user?.id ?? null}
              isAdmin={admin}
              onClose={() => setPanel(null)}
              onOpen={(a) => {
                const photo = photos.find((p) => p.id === a.photoId);
                if (photo) flyTo(photo.lngLat, 12);
                setOpenAdventureId(a.id);
              }}
              footer={
                admin ? (
                  <p className="hud-note">To create one: open a photo → “Attach adventure”.</p>
                ) : null
              }
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

        {pickStep ? (
          <PlacementOverlay
            title={`Place step · ${pickStep.step.title}`}
            hint="Pan the map so the reticle sits on the step location."
            confirmLabel="Set step here"
            center={[viewport.lng, viewport.lat]}
            onCancel={() => setPickStep(null)}
            onConfirm={(lngLat) => {
              const adv = state.adventures.find((a) => a.id === pickStep.adventureId);
              if (adv) {
                repo.adventures.setSteps(
                  adv.id,
                  adv.steps.map((x) => (x.id === pickStep.step.id ? { ...x, lngLat } : x)),
                );
              }
              setPanel({ type: "designer", adventureId: pickStep.adventureId, stepId: pickStep.step.id });
              setPickStep(null);
              toast({ title: "Step placed", body: pickStep.step.title, tone: "reward" });
            }}
          />
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
            extra={(p) => {
              const adv = adventureForPhoto(p.id);
              if (adv) {
                return (
                  <button
                    type="button"
                    className="adv-inline"
                    style={{ ["--adv" as string]: adv.look.color }}
                    onClick={() => {
                      setViewer(null);
                      setOpenAdventureId(adv.id);
                    }}
                  >
                    <LookBadge look={adv.look} size={34} />
                    <span className="min-w-0">
                      <span className="hud-kicker block">Adventure</span>
                      <span className="adv-inline-name">{adv.name}</span>
                    </span>
                  </button>
                );
              }
              return admin ? (
                <button
                  type="button"
                  className="hud-btn hud-btn-ghost mt-4 w-full"
                  onClick={() => {
                    setViewer(null);
                    setEditor({ photoId: p.id });
                  }}
                >
                  <IconFlag size={16} /> Attach adventure
                </button>
              ) : null;
            }}
          />
        ) : null}

        {openAdventure ? (
          <AdventureDossier
            adventure={openAdventure}
            photo={photos.find((p) => p.id === openAdventure.photoId)}
            members={membersOf(openAdventure.id)}
            joined={isMember(openAdventure.id)}
            isAdmin={admin}
            onClose={() => setOpenAdventureId(null)}
            onJoin={() => {
              if (!user) return setAuthOpen(true);
              repo.adventures.join(openAdventure.id, user);
              toast({ title: "You joined", body: openAdventure.name, tone: "reward" });
            }}
            onLeave={() => {
              if (!user) return;
              repo.adventures.leave(openAdventure.id, user.id);
              toast({ title: "Left adventure", body: openAdventure.name });
            }}
            onEdit={() => {
              setEditor({ photoId: openAdventure.photoId, adventureId: openAdventure.id });
              setOpenAdventureId(null);
            }}
            onLocate={() => {
              const photo = photos.find((p) => p.id === openAdventure.photoId);
              setOpenAdventureId(null);
              setRouteId(openAdventure.id);
              const pts = openAdventure.steps.filter((x) => x.lngLat).map((x) => ({ lngLat: x.lngLat! }));
              if (pts.length > 1 && handle) {
                handle.map.fitBounds(boundsOf(pts), { padding: 110, maxZoom: 14, duration: 1100 });
              } else if (photo) flyTo(photo.lngLat, 13);
            }}
          >
            <div className="brief-steps">
              <div className="flex items-center justify-between gap-2">
                <p className="hud-kicker">Steps · {openAdventure.steps.length}</p>
                <div className="flex gap-2">
                  {isMember(openAdventure.id) && openAdventure.steps.length ? (
                    <button
                      type="button"
                      className="hud-btn hud-btn-sm"
                      onClick={() => {
                        setTrackId(openAdventure.id);
                        setRouteId(openAdventure.id);
                        setOpenAdventureId(null);
                        setPanel({ type: "mission" });
                      }}
                    >
                      Track mission
                    </button>
                  ) : null}
                  {admin ? (
                    <button
                      type="button"
                      className="hud-btn hud-btn-sm"
                      onClick={() => {
                        setOpenAdventureId(null);
                        setPanel({ type: "designer", adventureId: openAdventure.id, stepId: null });
                      }}
                    >
                      Design steps
                    </button>
                  ) : null}
                </div>
              </div>
              <StepList adventure={openAdventure} done={doneFor(openAdventure.id)} compact />
            </div>
          </AdventureDossier>
        ) : null}

        {editor && editorPhoto && admin ? (
          <AdventureEditor
            photo={editorPhoto}
            initial={editorAdventure}
            onCancel={() => setEditor(null)}
            onDelete={
              editorAdventure
                ? () => {
                    repo.adventures.remove(editorAdventure.id);
                    setEditor(null);
                    toast({ title: "Adventure deleted" });
                  }
                : undefined
            }
            onSave={(input) => {
              if (editorAdventure) {
                repo.adventures.update(editorAdventure.id, input);
                setOpenAdventureId(editorAdventure.id);
                toast({ title: "Adventure saved", body: input.name });
              } else if (user) {
                const created = repo.adventures.create(input, user.id);
                setOpenAdventureId(created.id);
                toast({ title: "Adventure attached", body: input.name, tone: "reward" });
              }
              setEditor(null);
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
