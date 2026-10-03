// Data-access layer.
//
// The UI only talks to `AdventureRepository`. Today it is backed by
// localStorage (state) + IndexedDB (media blobs) so everything works offline
// on an iPad without any backend. To move to Supabase later, implement the
// same interface with `@supabase/supabase-js` calls and swap `getRepository()`.

import { BASE_PATH } from "../basePath";
import { newId } from "./ids";
import { deleteBlob } from "./media";
import { createSeedState, SCHEMA_VERSION } from "./seed";
import type {
  Adventure,
  AdventureBrief,
  AdventureLook,
  AdventureStatus,
  AdventureStep,
  AppState,
  LngLat,
  LocationSource,
  MediaRef,
  Photo,
} from "./types";

export type AdventureInput = {
  photoId: string;
  name: string;
  brief: AdventureBrief;
  look: AdventureLook;
  status: AdventureStatus;
};

export type NewPhotoInput = {
  lngLat: LngLat;
  locationSource: LocationSource;
  media: MediaRef;
  caption: string;
  placeName: string;
  takenAt: string | null;
  authorId: string;
  authorName: string;
};

export interface AdventureRepository {
  getSnapshot(): AppState;
  getServerSnapshot(): AppState;
  subscribe(listener: () => void): () => void;
  reset(): void;
  photos: {
    add(input: NewPhotoInput): Photo;
    update(id: string, patch: Partial<Pick<Photo, "caption" | "placeName" | "lngLat" | "locationSource">>): void;
    remove(id: string): void;
  };
  adventures: {
    create(input: AdventureInput, createdBy: string): Adventure;
    update(id: string, patch: Partial<AdventureInput>): void;
    remove(id: string): void;
    join(adventureId: string, user: { id: string; name: string }): void;
    leave(adventureId: string, userId: string): void;
    setSteps(adventureId: string, steps: AdventureStep[]): void;
  };
  progress: {
    complete(adventureId: string, partyId: string, stepId: string, completedBy: string): void;
    undo(adventureId: string, partyId: string, stepId: string): void;
    resetParty(adventureId: string, partyId: string): void;
  };
}

const STORAGE_KEY = `adventure-app${BASE_PATH || ""}:state`;

/** Fill in any keys a newer branch added so old saves keep working. */
function hydrate(raw: unknown): AppState {
  const seed = createSeedState();
  if (!raw || typeof raw !== "object") return seed;
  const saved = raw as Partial<AppState>;
  const merged = { ...seed, ...saved, schema: SCHEMA_VERSION } as AppState;
  // Older saves: give each adventure the fields added by later branches.
  merged.adventures = merged.adventures.map((a) => ({
    ...a,
    steps: a.steps ?? structuredClone(seed.adventures.find((x) => x.id === a.id)?.steps ?? []),
  }));
  return merged;
}

function createLocalRepository(): AdventureRepository {
  const serverSnapshot = createSeedState();
  let state: AppState | null = null;
  const listeners = new Set<() => void>();

  const load = (): AppState => {
    if (typeof window === "undefined") return serverSnapshot;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return hydrate(raw ? JSON.parse(raw) : null);
    } catch {
      return createSeedState();
    }
  };

  const emit = () => listeners.forEach((l) => l());

  const commit = (next: AppState) => {
    state = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn("Could not persist adventure state", err);
    }
    emit();
  };

  const current = () => {
    if (!state) state = load();
    return state;
  };

  const mutate = (fn: (s: AppState) => AppState) => commit(fn(current()));

  if (typeof window !== "undefined") {
    // Keep multiple tabs (e.g. player + admin) in sync.
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY) return;
      state = load();
      emit();
    });
  }

  return {
    getSnapshot: current,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      current().photos.forEach((p) => {
        if (p.media.source === "local") void deleteBlob(p.media.blobId);
      });
      commit(createSeedState());
    },
    photos: {
      add(input) {
        const photo: Photo = { id: newId("ph"), createdAt: new Date().toISOString(), ...input };
        mutate((s) => ({ ...s, photos: [...s.photos, photo] }));
        return photo;
      },
      update(id, patch) {
        mutate((s) => ({
          ...s,
          photos: s.photos.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      },
      remove(id) {
        const target = current().photos.find((p) => p.id === id);
        if (target?.media.source === "local") void deleteBlob(target.media.blobId);
        mutate((s) => ({
          ...s,
          photos: s.photos.filter((p) => p.id !== id),
          // An adventure lives on its picture; removing the picture removes it.
          adventures: s.adventures.filter((a) => a.photoId !== id),
        }));
      },
    },
    adventures: {
      create(input, createdBy) {
        const adventure: Adventure = {
          id: newId("adv"),
          createdBy,
          createdAt: new Date().toISOString(),
          steps: [],
          ...input,
        };
        mutate((s) => ({ ...s, adventures: [...s.adventures, adventure] }));
        return adventure;
      },
      update(id, patch) {
        mutate((s) => ({
          ...s,
          adventures: s.adventures.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
      },
      remove(id) {
        mutate((s) => ({
          ...s,
          adventures: s.adventures.filter((a) => a.id !== id),
          memberships: s.memberships.filter((m) => m.adventureId !== id),
          progress: s.progress.filter((p) => p.adventureId !== id),
        }));
      },
      join(adventureId, user) {
        mutate((s) =>
          s.memberships.some((m) => m.adventureId === adventureId && m.userId === user.id)
            ? s
            : {
                ...s,
                memberships: [
                  ...s.memberships,
                  { adventureId, userId: user.id, userName: user.name, joinedAt: new Date().toISOString() },
                ],
              },
        );
      },
      leave(adventureId, userId) {
        mutate((s) => ({
          ...s,
          memberships: s.memberships.filter((m) => !(m.adventureId === adventureId && m.userId === userId)),
        }));
      },
      setSteps(adventureId, steps) {
        const ids = new Set(steps.map((x) => x.id));
        mutate((s) => ({
          ...s,
          adventures: s.adventures.map((a) =>
            a.id === adventureId
              ? { ...a, steps: steps.map((x) => ({ ...x, prerequisites: x.prerequisites.filter((p) => ids.has(p)) })) }
              : a,
          ),
          progress: s.progress.filter((p) => p.adventureId !== adventureId || ids.has(p.stepId)),
        }));
      },
    },
    progress: {
      complete(adventureId, partyId, stepId, completedBy) {
        mutate((s) =>
          s.progress.some((p) => p.adventureId === adventureId && p.partyId === partyId && p.stepId === stepId)
            ? s
            : {
                ...s,
                progress: [
                  ...s.progress,
                  { adventureId, partyId, stepId, completedBy, completedAt: new Date().toISOString() },
                ],
              },
        );
      },
      undo(adventureId, partyId, stepId) {
        mutate((s) => ({
          ...s,
          progress: s.progress.filter(
            (p) => !(p.adventureId === adventureId && p.partyId === partyId && p.stepId === stepId),
          ),
        }));
      },
      resetParty(adventureId, partyId) {
        mutate((s) => ({
          ...s,
          progress: s.progress.filter((p) => !(p.adventureId === adventureId && p.partyId === partyId)),
        }));
      },
    },
  };
}

let repo: AdventureRepository | null = null;

export function getRepository(): AdventureRepository {
  if (!repo) repo = createLocalRepository();
  return repo;
}
