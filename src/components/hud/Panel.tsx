"use client";

import type { ReactNode } from "react";
import { IconClose } from "./icons";

/**
 * Game-menu side panel. Right-hand drawer on iPad/desktop, bottom sheet on
 * narrow phones. Scrolls internally so the map underneath stays put.
 */
export default function Panel({
  title,
  kicker,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  kicker?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      className={`hud-panel pointer-events-auto ${wide ? "hud-panel-wide" : ""}`}
      aria-label={title}
    >
      <header className="hud-panel-header">
        <div className="min-w-0">
          {kicker ? <p className="hud-kicker truncate">{kicker}</p> : null}
          <h2 className="hud-title truncate">{title}</h2>
        </div>
        <button type="button" className="hud-icon-btn" onClick={onClose} aria-label="Close panel">
          <IconClose size={18} />
        </button>
      </header>
      <div className="hud-panel-body">{children}</div>
      {footer ? <footer className="hud-panel-footer">{footer}</footer> : null}
    </section>
  );
}
