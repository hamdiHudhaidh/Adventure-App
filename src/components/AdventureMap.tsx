"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import MapHud, { MapLoadingOverlay, type MapViewport } from "./MapHud";
import { MapContext, type MapHandle } from "./map/MapContext";
import type { MapInstance, MapLibreNS } from "./map/maplibre";
import PlacementOverlay from "./map/PlacementOverlay";
import Dock, { type DockItem } from "./hud/Dock";
import { IconCompass, IconFlag, IconGps, IconMemories, IconPlay, IconShield, IconTarget, IconUser } from "./hud/icons";
import AdventureDossier from "./adventures/AdventureDossier";
import AdventureEditor from "./adventures/AdventureEditor";
import AdventureMarker from "./adventures/AdventureMarker";
import AdventuresPanel from "./adventures/AdventuresPanel";
import { LookBadge } from "./adventures/looks";
import MissionTracker from "./steps/MissionTracker";
import StepList from "./steps/StepList";
import StepMarkers from "./steps/StepMarkers";
import StepsDesigner from "./steps/StepsDesigner";
import TeamsSection from "./teams/TeamsSection";
import LiveControlPanel from "./live/LiveControlPanel";
import PlayerMarkers from "./live/PlayerMarkers";
import FilmsPanel from "./recap/FilmsPanel";
import RecapEditor from "./recap/RecapEditor";
import RecapPlayer from "./recap/RecapPlayer";
import type { FilmInput } from "./recap/renderer";
import { ToastProvider, useToast } from "./hud/Toasts";
import Avatar from "./auth/Avatar";
import AccountPanel from "./auth/AccountPanel";
import AdminConsolePanel from "./auth/AdminConsolePanel";
import AuthSheet from "./auth/AuthSheet";
import ProfileSection from "./auth/ProfileSection";
import SignUpForm from "./auth/SignUpForm";
import MediaView from "./photos/MediaView";
import PhotoClusters from "./photos/PhotoClusters";
import PhotoLibraryPanel from "./photos/PhotoLibraryPanel";
import PhotoViewer from "./photos/PhotoViewer";
import { boundsOf, type PhotoCluster } from "@/lib/cluster";
import { useAuth } from "@/lib/auth/hooks";
import { canEditContent, isAdmin } from "@/lib/auth/permissions";
import { useAppState, useRepository } from "@/lib/data/hooks";
import { deleteBlob } from "@/lib/data/media";
import type { Adventure, AdventureStep, LngLat, Photo, RecapCut } from "@/lib/data/types";
import { completedSet, controlSets, rewardText, stepState } from "@/lib/steps";
import { joinBlockReason } from "@/lib/teams";
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
  | { type: "myPhotos" }
  | { type: "live" }
  | { type: "recap"; adventureId: string }
  | { type: "films" }
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
  const [authOpen, setAuthOpenRaw] = useState<false | "signin" | "signup">(false);
  const setAuthOpen = (open: boolean | "signin" | "signup") =>
    setAuthOpenRaw(open === true ? "signin" : open);
  const [openAdventureId, setOpenAdventureId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ photoId: string; adventureId?: string } | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [film, setFilm] = useState<{ input: FilmInput; kicker: string } | null>(null);
  const seenNotices = useRef<Set<string> | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [pickStep, setPickStep] = useState<{ adventureId: string; step: AdventureStep } | null>(null);
  const introDone = useRef(false);
  const { user, auth, users } = useAuth();
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
      setAuthOpen("signup");
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

  // Progress is shared by a team; a player without a team is their own party.
  const membershipFor = (adventureId: string) =>
    user ? state.memberships.find((m) => m.adventureId === adventureId && m.userId === user.id) : undefined;
  const partyIdFor = (adventureId: string) => membershipFor(adventureId)?.teamId ?? user?.id ?? null;
  const teamFor = (adventureId: string) => {
    const teamId = membershipFor(adventureId)?.teamId;
    return state.adventures.find((a) => a.id === adventureId)?.teams.find((t) => t.id === teamId);
  };
  const joinAdventure = (adventureId: string, teamId?: string) => {
    if (!user) {
      toast({ title: "Create an account to join", body: "Just a name and a profile picture." });
      return setAuthOpen("signup");
    }
    const adv = state.adventures.find((a) => a.id === adventureId);
    try {
      repo.adventures.join(adventureId, user, teamId);
      const team = adv?.teams.find((t) => t.id === repo.getSnapshot().memberships.find((m) => m.adventureId === adventureId && m.userId === user.id)?.teamId);
      toast({ title: "You joined", body: `${adv?.name ?? ""}${team ? ` · Team ${team.name}` : ""}`, tone: "reward" });
    } catch (err) {
      toast({ title: "Couldn't join", body: err instanceof Error ? err.message : undefined, tone: "alert" });
    }
  };
  const doneFor = (adventureId: string) => {
    const party = partyIdFor(adventureId);
    return party ? completedSet(state.progress, adventureId, party) : new Set<string>();
  };
  const myAdventures = visibleAdventures.filter((a) => isMember(a.id) && a.steps.length);
  const trackedAdventure = myAdventures.find((a) => a.id === trackId) ?? myAdventures[0] ?? null;
  const liveAdventure =
    panel?.type === "live" && admin
      ? visibleAdventures.find((a) => a.id === liveId) ?? visibleAdventures[0] ?? null
      : null;
  const designerAdventure =
    panel?.type === "designer" ? state.adventures.find((a) => a.id === panel.adventureId) ?? null : null;
  const routeAdventure =
    liveAdventure ??
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

  const controlFor = (adventureId: string) => {
    const adv = state.adventures.find((a) => a.id === adventureId);
    return controlSets(state.controls, adventureId, partyIdFor(adventureId), adv?.steps ?? []);
  };

  // Live location sharing for the tracked adventure (throttled writes).
  useEffect(() => {
    if (!sharing || !user || !("geolocation" in navigator)) return;
    let last = 0;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (Date.now() - last < 10000) return;
        last = Date.now();
        repo.live.setPosition({
          userId: user.id,
          userName: user.name,
          adventureId: sharing,
          lngLat: [pos.coords.longitude, pos.coords.latitude],
        });
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [sharing, user, repo]);

  // Toast new admin messages addressed to me / my team.
  useEffect(() => {
    if (!user) return;
    const mine = state.notices.filter((n) => {
      const m = state.memberships.find((x) => x.adventureId === n.adventureId && x.userId === user.id);
      return m && (n.partyId === null || n.partyId === m.teamId);
    });
    if (!seenNotices.current) {
      seenNotices.current = new Set(mine.map((n) => n.id));
      return;
    }
    for (const n of mine) {
      if (seenNotices.current.has(n.id)) continue;
      seenNotices.current.add(n.id);
      if (n.from !== user.name) toast({ title: `Message · ${n.from}`, body: n.text, tone: "reward" });
    }
  }, [state.notices, state.memberships, user, toast]);

  const simulateCrew = (adv: (typeof state.adventures)[number]) => {
    const photo = photos.find((p) => p.id === adv.photoId);
    const crew = state.memberships.filter((m) => m.adventureId === adv.id);
    for (const m of crew) {
      const done = completedSet(state.progress, adv.id, m.teamId ?? m.userId);
      const { unlocked } = controlSets(state.controls, adv.id, m.teamId ?? m.userId, adv.steps);
      const next = adv.steps.find((x) => x.lngLat && stepState(x, done, unlocked) === "available");
      const lastDone = [...adv.steps].reverse().find((x) => x.lngLat && done.has(x.id));
      const base = next?.lngLat ?? lastDone?.lngLat ?? photo?.lngLat;
      if (!base) continue;
      // Spread players out on the way to their next step.
      const jitter = () => (Math.random() - 0.5) * 0.02;
      repo.live.setPosition({
        userId: m.userId,
        userName: m.userName,
        adventureId: adv.id,
        lngLat: [base[0] + jitter(), base[1] + jitter()],
        simulated: true,
      });
    }
    toast({ title: "Crew positions simulated", body: `${crew.length} players placed near their next step.` });
  };

  const filmFor = (adv: Adventure, cut: RecapCut): FilmInput => ({
    title: cut.title || adv.name,
    subtitle: cut.subtitle,
    clips: cut.clips,
    color: adv.look.color,
    credits: state.memberships.filter((m) => m.adventureId === adv.id).map((m) => m.userName),
    dateLabel: new Date().toLocaleDateString(undefined, { dateStyle: "medium" }),
  });

  const myDeliveries = user ? state.deliveries.filter((d) => d.userId === user.id) : [];
  const unseenFilms = myDeliveries.filter((d) => !d.seenAt).length;

  const addCaptures = async (adv: Adventure, step: AdventureStep, files: File[]) => {
    if (!user) return;
    const party = partyIdFor(adv.id) ?? user.id;
    setUploading(files.length);
    let ok = 0;
    for (const file of files) {
      try {
        const up = await prepareUpload(file);
        repo.captures.add({ adventureId: adv.id, stepId: step.id, partyId: party, userId: user.id, userName: user.name, media: up.media });
        ok++;
      } catch (err) {
        toast({ title: "Capture skipped", body: err instanceof Error ? err.message : file.name, tone: "alert" });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (ok) toast({ title: `${ok} clip${ok > 1 ? "s" : ""} captured`, body: `For the ${adv.name} recap film.`, tone: "reward" });
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
    ...(myDeliveries.length ? [{ id: "films", label: "Films", icon: <IconPlay />, badge: unseenFilms || undefined }] : []),
    { id: "adventures", label: "Adventures", icon: <IconFlag />, badge: visibleAdventures.length || undefined },
    { id: "library", label: "Photos", icon: <IconMemories />, badge: photos.length || undefined },
    ...(admin ? [{ id: "live", label: "Live", icon: <IconTarget /> }] : []),
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
            paused={controlFor(routeAdventure.id).paused}
            unlocked={controlFor(routeAdventure.id).unlocked}
            selectedId={
              panel?.type === "designer" ? panel.stepId : panel?.type === "mission" ? panel.highlightId ?? null : null
            }
            onSelect={onStepMarker}
          />
        ) : null}

        {liveAdventure ? (
          <PlayerMarkers adventure={liveAdventure} positions={state.positions} memberships={state.memberships} users={users} meId={user?.id} />
        ) : trackedAdventure && membershipFor(trackedAdventure.id) ? (
          <PlayerMarkers
            adventure={trackedAdventure}
            positions={state.positions}
            memberships={state.memberships}
            users={users}
            teamFilter={membershipFor(trackedAdventure.id)?.teamId ?? null}
            meId={user?.id}
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
            >
              <ProfileSection
                key={user.id}
                user={user}
                photoCount={photos.filter((p) => p.authorId === user.id).length}
                adventures={visibleAdventures
                  .filter((a) => isMember(a.id))
                  .map((a) => ({
                    adventure: a,
                    teamName: teamFor(a.id)?.name ?? null,
                    done: a.steps.filter((x) => doneFor(a.id).has(x.id)).length,
                    total: a.steps.length,
                  }))}
                onSave={({ name, avatar }) => {
                  auth.updateUser(user.id, { name, avatar });
                  if (name !== user.name) repo.people.rename(user.id, name);
                  toast({ title: "Profile saved", tone: "reward" });
                }}
                onOpenAdventure={(a) => setOpenAdventureId(a.id)}
                onShowPhotos={() => setPanel({ type: "myPhotos" })}
              />
            </AccountPanel>
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
              paused={controlFor(trackedAdventure.id).paused}
              unlocked={controlFor(trackedAdventure.id).unlocked}
              header={
                <div className="mb-3 flex flex-col gap-2">
                  {controlFor(trackedAdventure.id).allPaused ? (
                    <p className="tracker-paused">❚❚ Paused by the game master — hold position.</p>
                  ) : null}
                  {state.notices
                    .filter(
                      (n) =>
                        n.adventureId === trackedAdventure.id &&
                        (n.partyId === null || n.partyId === membershipFor(trackedAdventure.id)?.teamId),
                    )
                    .slice(-3)
                    .reverse()
                    .map((n) => (
                      <p key={n.id} className="tracker-notice">
                        <b>{n.from}:</b> {n.text}
                      </p>
                    ))}
                  <button
                    type="button"
                    className={`hud-btn hud-btn-sm ${sharing === trackedAdventure.id ? "hud-btn-primary" : ""}`}
                    onClick={() => {
                      if (!user) return;
                      if (sharing === trackedAdventure.id) {
                        setSharing(null);
                        repo.live.clearPosition(user.id, trackedAdventure.id);
                      } else {
                        setSharing(trackedAdventure.id);
                        toast({ title: "Sharing live location", body: "Your team and the game master can see you." });
                      }
                    }}
                  >
                    <IconGps size={14} /> {sharing === trackedAdventure.id ? "Sharing location · stop" : "Share live location"}
                  </button>
                </div>
              }
              highlightId={panel.highlightId}
              partyLabel={teamFor(trackedAdventure.id) ? `Team ${teamFor(trackedAdventure.id)!.name}` : user?.name ?? ""}
              onComplete={(step) => completeStep(trackedAdventure.id, step, "manual")}
              onLocateStep={(step) => step.lngLat && flyTo(step.lngLat, 13)}
              captureCount={(step) =>
                state.captures.filter((c) => c.adventureId === trackedAdventure.id && c.stepId === step.id && c.userId === user?.id).length
              }
              onCapture={(step, files) => void addCaptures(trackedAdventure, step, files)}
              onClose={() => setPanel(null)}
            />
          ) : null}

          {panel?.type === "live" && admin && !pickStep ? (
            <LiveControlPanel
              adventures={visibleAdventures}
              activeId={liveAdventure?.id ?? ""}
              onActiveChange={setLiveId}
              state={state}
              users={users}
              actor={user?.name ?? "Admin"}
              onLocate={(lngLat) => flyTo(lngLat, 14)}
              onSimulate={simulateCrew}
              onClose={() => setPanel(null)}
            />
          ) : null}

          {panel?.type === "recap" && admin ? (() => {
            const adv = state.adventures.find((a) => a.id === panel.adventureId);
            if (!adv) return null;
            return (
              <RecapEditor
                adventure={adv}
                recap={state.recaps.find((r) => r.adventureId === adv.id)}
                captures={state.captures.filter((c) => c.adventureId === adv.id)}
                members={membersOf(adv.id)}
                onSave={(cut) => repo.recap.saveDraft(adv.id, cut)}
                onPreview={(cut) => setFilm({ input: filmFor(adv, cut), kicker: "Preview · draft cut" })}
                onRelease={() => {
                  try {
                    const r = repo.recap.release(adv.id, user?.name ?? "Admin");
                    toast({ title: `Recap released · v${r.version}`, body: `Delivered to ${membersOf(adv.id).length} participants.`, tone: "reward" });
                  } catch (err) {
                    toast({ title: "Can't release", body: err instanceof Error ? err.message : undefined, tone: "alert" });
                  }
                }}
                onClose={() => setPanel(null)}
              />
            );
          })() : null}

          {panel?.type === "films" && user ? (
            <FilmsPanel
              deliveries={myDeliveries}
              adventures={state.adventures}
              recaps={state.recaps}
              onClose={() => setPanel(null)}
              onWatch={(d) => {
                const adv = state.adventures.find((a) => a.id === d.adventureId);
                const released = state.recaps.find((r) => r.adventureId === d.adventureId)?.released;
                if (!adv || !released) return;
                repo.recap.markSeen(d.id);
                setFilm({
                  input: { ...filmFor(adv, released), dateLabel: new Date(released.releasedAt).toLocaleDateString(undefined, { dateStyle: "medium" }) },
                  kicker: `Recap film · v${released.version}`,
                });
              }}
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
              uploadHint="Create a player account (name + profile picture) to add your photos."
              footerExtra={
                !user ? (
                  <div className="flex gap-2">
                    <button type="button" className="hud-btn flex-1" onClick={() => setAuthOpen("signin")}>
                      Sign in
                    </button>
                    <button type="button" className="hud-btn hud-btn-primary flex-1" onClick={() => setAuthOpen("signup")}>
                      Create account
                    </button>
                  </div>
                ) : null
              }
            />
          ) : null}

          {panel?.type === "myPhotos" && user && !current ? (
            <PhotoLibraryPanel
              title="My photos"
              kicker={`${user.name} · ${photos.filter((p) => p.authorId === user.id).length} on the map`}
              photos={photos.filter((p) => p.authorId === user.id)}
              onClose={() => setPanel(null)}
              onOpen={openViewer}
              onAddFiles={handleFiles}
              canUpload
              onZoom={() => zoomToPhotos(photos.filter((p) => p.authorId === user.id))}
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
            joinDisabledReason={joinBlockReason(openAdventure, state.memberships)}
            onJoin={() => joinAdventure(openAdventure.id)}
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
            <TeamsSection
              adventure={openAdventure}
              memberships={state.memberships}
              userId={user?.id ?? null}
              canJoin={openAdventure.status === "open" || openAdventure.status === "active"}
              onJoinTeam={(teamId) => joinAdventure(openAdventure.id, teamId)}
              onSwitchTeam={(teamId) => {
                if (!user) return;
                try {
                  repo.adventures.setTeam(openAdventure.id, user.id, teamId);
                } catch (err) {
                  toast({ title: "Couldn't switch", body: err instanceof Error ? err.message : undefined, tone: "alert" });
                }
              }}
            />
            <div className="brief-steps">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="hud-kicker">Steps · {openAdventure.steps.length}</p>
                <div className="flex flex-wrap gap-2">
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
                    <>
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
                      <button
                        type="button"
                        className="hud-btn hud-btn-sm"
                        onClick={() => {
                          setOpenAdventureId(null);
                          setLiveId(openAdventure.id);
                          setPanel({ type: "live" });
                        }}
                      >
                        Live control
                      </button>
                      <button
                        type="button"
                        className="hud-btn hud-btn-sm"
                        onClick={() => {
                          setOpenAdventureId(null);
                          setPanel({ type: "recap", adventureId: openAdventure.id });
                        }}
                      >
                        Recap film
                      </button>
                    </>
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
            memberCount={editorAdventure ? membersOf(editorAdventure.id).length : 0}
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

        {film ? <RecapPlayer film={film.input} kicker={film.kicker} onClose={() => setFilm(null)} /> : null}

        {authOpen ? (
          <AuthSheet
            initialMode={authOpen === "signup" ? "signup" : undefined}
            extraModes={[{ id: "signup", label: "Create account", render: (done) => <SignUpForm onDone={done} /> }]}
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
