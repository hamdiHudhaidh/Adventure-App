"use client";

import type { ReactNode } from "react";

export type DockItem = {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number | string;
};

/** Vertical game-menu dock (left edge on iPad, bottom row on phones). */
export default function Dock({
  items,
  active,
  onSelect,
}: {
  items: DockItem[];
  active: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="hud-dock pointer-events-auto" aria-label="Adventure menu">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`hud-dock-btn ${active === item.id ? "is-active" : ""}`}
          onClick={() => onSelect(item.id)}
          aria-pressed={active === item.id}
        >
          <span className="hud-dock-icon">{item.icon}</span>
          <span className="hud-dock-label">{item.label}</span>
          {item.badge ? <span className="hud-dock-badge">{item.badge}</span> : null}
        </button>
      ))}
    </nav>
  );
}
