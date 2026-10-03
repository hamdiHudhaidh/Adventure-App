"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/hooks";
import { IconClose } from "../hud/icons";

export type AuthMode = "signin" | "setup";

/** Sign-in / first-run admin setup sheet. Later branches add a sign-up tab. */
export default function AuthSheet({
  initialMode,
  onClose,
  onDone,
  extraModes,
}: {
  initialMode?: AuthMode | string;
  onClose: () => void;
  onDone: (message: string) => void;
  /** Later features can add tabs (e.g. player sign-up). */
  extraModes?: { id: string; label: string; render: (done: (msg: string) => void) => ReactNode }[];
}) {
  const { auth, hasAdmin } = useAuth();
  const [mode, setMode] = useState<string>(initialMode ?? (hasAdmin ? "signin" : "setup"));
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modes = [
    { id: "signin", label: "Sign in" },
    ...(!hasAdmin ? [{ id: "setup", label: "Admin setup" }] : []),
    ...(extraModes ?? []).map((m) => ({ id: m.id, label: m.label })),
  ];
  const extra = extraModes?.find((m) => m.id === mode);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "setup") {
        const u = await auth.setupAdmin({ username, name, password });
        onDone(`Admin account ready · ${u.name}`);
      } else {
        const u = await auth.signIn(username, password, remember);
        onDone(`Welcome back, ${u.name}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div className="hud-modal-backdrop pointer-events-auto" onClick={onClose}>
      <div className="hud-sheet auth-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="hud-panel-header">
          <div>
            <p className="hud-kicker">Adventure access</p>
            <h2 className="hud-title">{modes.find((m) => m.id === mode)?.label}</h2>
          </div>
          <button type="button" className="hud-icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={18} />
          </button>
        </header>
        <div className="hud-panel-body">
          {modes.length > 1 ? (
            <div className="hud-segment mb-4" role="tablist">
              {modes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === m.id}
                  className={mode === m.id ? "is-active" : ""}
                  onClick={() => {
                    setMode(m.id);
                    setError(null);
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          ) : null}

          {extra ? (
            extra.render(onDone)
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {mode === "setup" ? (
                <p className="hud-note">
                  No admin exists on this device yet. The account you create here becomes the
                  adventure admin (game master).
                </p>
              ) : null}
              <label className="hud-field">
                <span>Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  required
                />
              </label>
              {mode === "setup" ? (
                <label className="hud-field">
                  <span>Display name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </label>
              ) : null}
              <label className="hud-field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "setup" ? "new-password" : "current-password"}
                  required
                />
              </label>
              {mode === "signin" ? (
                <label className="hud-check">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Keep me signed in on this device</span>
                </label>
              ) : null}
              {error ? <p className="hud-error">{error}</p> : null}
              <button type="submit" className="hud-btn hud-btn-primary mt-1" disabled={busy}>
                {busy ? "Working…" : mode === "setup" ? "Create admin account" : "Sign in"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
