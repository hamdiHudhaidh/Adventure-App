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
import type { AppState, LngLat, LocationSource, MediaRef, Photo } from "./types";

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
}

const STORAGE_KEY = `adventure-app${BASE_PATH || ""}:state`;

/** Fill in any keys a newer branch added so old saves keep working. */
function hydrate(raw: unknown): AppState {
  const seed = createSeedState();
  if (!raw || typeof raw !== "object") return seed;
  const saved = raw as Partial<AppState>;
  return { ...seed, ...saved, schema: SCHEMA_VERSION } as AppState;
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
        mutate((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== id) }));
      },
    },
  };
}

let repo: AdventureRepository | null = null;

export function getRepository(): AdventureRepository {
  if (!repo) repo = createLocalRepository();
  return repo;
}
