// Tiny IndexedDB blob store for user photos/videos (localStorage is too small).
// Swap for Supabase Storage later: putBlob -> upload, getBlobUrl -> public URL.

import { BASE_PATH } from "../basePath";
import { newId } from "./ids";

const DB_NAME = `adventure-media${BASE_PATH || ""}`;
const STORE = "blobs";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

const urlCache = new Map<string, string>();

export async function putBlob(blob: Blob): Promise<string> {
  const id = newId("blob");
  await tx("readwrite", (s) => s.put(blob, id));
  return id;
}

export async function getBlobUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  try {
    const blob = await tx<Blob | undefined>("readonly", (s) => s.get(id));
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  } catch {
    return null;
  }
}

export async function deleteBlob(id: string) {
  const cached = urlCache.get(id);
  if (cached) URL.revokeObjectURL(cached);
  urlCache.delete(id);
  try {
    await tx("readwrite", (s) => s.delete(id));
  } catch {
    /* ignore */
  }
}
