"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { asset } from "../basePath";
import { getBlobUrl } from "./media";
import { getRepository } from "./repository";
import type { AppState, MediaRef } from "./types";

export function useAppState(): AppState {
  const repo = getRepository();
  return useSyncExternalStore(repo.subscribe, repo.getSnapshot, repo.getServerSnapshot);
}

export function useRepository() {
  return getRepository();
}

/** Resolve a MediaRef (static asset or IndexedDB blob) to a usable URL. */
export function useMediaUrl(media: MediaRef | null | undefined): string | null {
  const staticUrl = media?.source === "static" ? asset(media.src) : null;
  const blobId = media?.source === "local" ? media.blobId : null;
  const [blobUrl, setBlobUrl] = useState<{ id: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!blobId) return;
    let alive = true;
    void getBlobUrl(blobId).then((url) => {
      if (alive) setBlobUrl({ id: blobId, url });
    });
    return () => {
      alive = false;
    };
  }, [blobId]);

  if (staticUrl) return staticUrl;
  if (blobId && blobUrl?.id === blobId) return blobUrl.url;
  return null;
}
