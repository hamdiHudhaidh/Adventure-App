"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Toast = { id: number; title: string; body?: string; tone?: "info" | "reward" | "alert" };

const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = ++counter;
    setToasts((list) => [...list.slice(-2), { ...t, id }]);
    window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4200);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="hud-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`hud-toast hud-toast-${t.tone ?? "info"}`}>
            <p className="hud-toast-title">{t.title}</p>
            {t.body ? <p className="hud-toast-body">{t.body}</p> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
