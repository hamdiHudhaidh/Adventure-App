"use client";

import { useSyncExternalStore } from "react";
import { getAuth } from "./service";

export function useAuth() {
  const auth = getAuth();
  const snap = useSyncExternalStore(auth.subscribe, auth.getSnapshot, auth.getServerSnapshot);
  return { ...snap, auth };
}
