"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/hooks";
import type { MediaRef } from "@/lib/data/types";
import AvatarPicker from "./AvatarPicker";

/** Player sign-up: name + profile picture (+ username/password for this device). */
export default function SignUpForm({ onDone }: { onDone: (message: string) => void }) {
  const { auth } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<MediaRef | null>(null);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touchedUser, setTouchedUser] = useState(false);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const u = await auth.signUp({ name, username, password, avatar }, remember);
          onDone(`Welcome, ${u.name}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not create the account");
          setBusy(false);
        }
      }}
    >
      <AvatarPicker value={avatar} onChange={setAvatar} name={name} />
      <label className="hud-field">
        <span>Your name</span>
        <input
          value={name}
          maxLength={32}
          autoComplete="name"
          required
          onChange={(e) => {
            setName(e.target.value);
            if (!touchedUser) setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]+/g, "").slice(0, 24));
          }}
        />
      </label>
      <label className="hud-field">
        <span>Username</span>
        <input
          value={username}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          required
          onChange={(e) => {
            setTouchedUser(true);
            setUsername(e.target.value);
          }}
        />
      </label>
      <label className="hud-field">
        <span>Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} required />
      </label>
      <label className="hud-check">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <span>Keep me signed in on this device</span>
      </label>
      {error ? <p className="hud-error">{error}</p> : null}
      <button type="submit" className="hud-btn hud-btn-primary mt-1" disabled={busy}>
        {busy ? "Creating…" : "Create player account"}
      </button>
      <p className="hud-note">Players can add their own pictures to the map and join adventures. Accounts live on this device for now.</p>
    </form>
  );
}
