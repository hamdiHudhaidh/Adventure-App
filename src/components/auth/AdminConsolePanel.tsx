"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/hooks";
import type { Role } from "@/lib/auth/types";
import Panel from "../hud/Panel";
import { IconReset } from "../hud/icons";
import { useToast } from "../hud/Toasts";
import Avatar from "./Avatar";

/** Admin-only console: users database + demo tools. Later features add tabs. */
export default function AdminConsolePanel({
  onClose,
  onResetDemo,
  tabs,
}: {
  onClose: () => void;
  onResetDemo: () => void;
  tabs?: { id: string; label: string; content: ReactNode }[];
}) {
  const { auth, users, user: me } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState(tabs?.[0]?.id ?? "users");
  const [form, setForm] = useState({ username: "", name: "", password: "", role: "player" as Role });
  const [error, setError] = useState<string | null>(null);
  const allTabs = [...(tabs ?? []), { id: "users", label: "Users", content: null }];

  const run = (fn: () => void) => {
    try {
      fn();
    } catch (err) {
      toast({ title: "Not allowed", body: err instanceof Error ? err.message : String(err), tone: "alert" });
    }
  };

  return (
    <Panel title="Admin" kicker="Game master console" onClose={onClose} wide>
      {allTabs.length > 1 ? (
        <div className="hud-chips-row" role="tablist">
          {allTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`hud-filter ${tab === t.id ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {tab !== "users" ? (
        allTabs.find((t) => t.id === tab)?.content
      ) : (
        <>
          <h3 className="hud-section-title mt-0">Users database · {users.length}</h3>
          <ul className="user-list">
            {users.map((u) => (
              <li key={u.id}>
                <Avatar user={u} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {u.name} {u.id === me?.id ? <span className="text-zinc-500">(you)</span> : null}
                  </p>
                  <p className="truncate text-xs text-zinc-500">@{u.username}</p>
                </div>
                <select
                  className="hud-input hud-select-sm"
                  value={u.role}
                  aria-label={`Role for ${u.name}`}
                  onChange={(e) => run(() => auth.updateUser(u.id, { role: e.target.value as Role }))}
                >
                  <option value="player">Player</option>
                  <option value="admin">Admin</option>
                </select>
                {u.id !== me?.id ? (
                  <button
                    type="button"
                    className="hud-btn hud-btn-ghost hud-btn-sm"
                    onClick={() => run(() => auth.removeUser(u.id))}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          <h3 className="hud-section-title">Create account</h3>
          <form
            className="grid grid-cols-2 gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              try {
                const u = await auth.createUser(form);
                toast({ title: "Account created", body: `${u.name} · ${u.role}` });
                setForm({ username: "", name: "", password: "", role: "player" });
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
              }
            }}
          >
            <label className="hud-field">
              <span>Username</span>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoCapitalize="none"
                required
              />
            </label>
            <label className="hud-field">
              <span>Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="hud-field">
              <span>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="hud-field">
              <span>Role</span>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="player">Player</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            {error ? <p className="hud-error col-span-2">{error}</p> : null}
            <button type="submit" className="hud-btn hud-btn-primary col-span-2">
              Create account
            </button>
          </form>

          <div className="hud-divider" />
          <button type="button" className="hud-btn hud-btn-ghost w-full" onClick={onResetDemo}>
            <IconReset size={16} /> Reset demo content (keeps accounts)
          </button>
        </>
      )}
    </Panel>
  );
}
