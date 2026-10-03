"use client";

import type { User } from "@/lib/auth/types";
import MediaView from "../photos/MediaView";

export default function Avatar({ user, size = 32 }: { user: Pick<User, "name" | "avatar" | "role"> | null; size?: number }) {
  const initials = (user?.name ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={`avatar ${user?.role === "admin" ? "is-admin" : ""}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {user?.avatar ? <MediaView media={user.avatar} alt="" className="avatar-img" /> : initials}
    </span>
  );
}
