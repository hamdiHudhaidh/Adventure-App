"use client";

import { useState } from "react";
import type { User } from "@/lib/auth/types";
import type { Adventure, MediaRef } from "@/lib/data/types";
import { LookBadge } from "../adventures/looks";
import AvatarPicker from "./AvatarPicker";

export type MyAdventure = { adventure: Adventure; teamName: string | null; done: number; total: number };

/** Player profile inside the Account panel: name/picture, my adventures, my photos. */
export default function ProfileSection({
  user,
  adventures,
  photoCount,
  onSave,
  onOpenAdventure,
  onShowPhotos,
}: {
  user: User;
  adventures: MyAdventure[];
  photoCount: number;
  onSave: (patch: { name: string; avatar: MediaRef | null }) => void;
  onOpenAdventure: (a: Adventure) => void;
  onShowPhotos: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState<MediaRef | null>(user.avatar);

  return (
    <div className="mt-5 flex flex-col gap-5">
      {editing ? (
        <form
          className="profile-edit"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSave({ name: name.trim(), avatar });
            setEditing(false);
          }}
        >
          <AvatarPicker value={avatar} onChange={setAvatar} name={name} size={80} />
          <label className="hud-field">
            <span>Name</span>
            <input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} required />
          </label>
          <div className="flex gap-2">
            <button type="button" className="hud-btn flex-1" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="hud-btn hud-btn-primary flex-1">
              Save profile
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="hud-btn"
          onClick={() => {
            setName(user.name);
            setAvatar(user.avatar);
            setEditing(true);
          }}
        >
          Edit name &amp; picture
        </button>
      )}

      <section>
        <h3 className="hud-section-title mt-0">My adventures · {adventures.length}</h3>
        {adventures.length ? (
          <ul className="flex flex-col gap-2">
            {adventures.map(({ adventure: a, teamName, done, total }) => (
              <li key={a.id}>
                <button type="button" className="my-adv" style={{ ["--adv" as string]: a.look.color }} onClick={() => onOpenAdventure(a)}>
                  <LookBadge look={a.look} size={30} />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="adv-card-name block truncate">{a.name}</span>
                    <span className="block text-xs text-zinc-400">
                      {teamName ? `Team ${teamName} · ` : ""}
                      {done}/{total} steps
                    </span>
                  </span>
                  <span className="tracker-bar w-16">
                    <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-400">You haven’t joined an adventure yet — open the Adventures list and tap Join.</p>
        )}
      </section>

      <section>
        <h3 className="hud-section-title mt-0">My photos · {photoCount}</h3>
        <button type="button" className="hud-btn w-full" onClick={onShowPhotos}>
          {photoCount ? "Show my photos" : "Add my first photo"}
        </button>
      </section>
    </div>
  );
}
