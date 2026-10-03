"use client";

import type { ReactNode } from "react";
import type { User } from "@/lib/auth/types";
import Panel from "../hud/Panel";
import Avatar from "./Avatar";

export default function AccountPanel({
  user,
  onClose,
  onSignOut,
  children,
}: {
  user: User;
  onClose: () => void;
  onSignOut: () => void;
  children?: ReactNode;
}) {
  return (
    <Panel
      title="Account"
      kicker={user.role === "admin" ? "Admin · game master" : "Player"}
      onClose={onClose}
      footer={
        <button type="button" className="hud-btn w-full" onClick={onSignOut}>
          Sign out
        </button>
      }
    >
      <div className="flex items-center gap-4">
        <Avatar user={user} size={64} />
        <div className="min-w-0">
          <p className="hud-title mt-0 truncate">{user.name}</p>
          <p className="text-sm text-zinc-400">@{user.username}</p>
          <p className="mt-1">
            <span className={`role-badge ${user.role === "admin" ? "" : "is-player"}`}>{user.role}</span>
          </p>
        </div>
      </div>
      {children}
    </Panel>
  );
}
