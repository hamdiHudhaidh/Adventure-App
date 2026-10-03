import type { MediaRef } from "../data/types";

export type Role = "admin" | "player";

export type User = {
  id: string;
  username: string;
  name: string;
  role: Role;
  avatar: MediaRef | null;
  createdAt: string;
};

export type Session = { userId: string; signedInAt: string };
