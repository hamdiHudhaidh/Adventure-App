import type { Role, User } from "./types";

export function hasRole(user: User | null | undefined, role: Role) {
  if (!user) return false;
  return role === "player" ? true : user.role === role;
}

export const isAdmin = (user: User | null | undefined) => hasRole(user, "admin");

/** Admins can edit anything; everyone else only their own content. */
export function canEditContent(user: User | null | undefined, authorId: string) {
  return !!user && (user.role === "admin" || user.id === authorId);
}
