// Auth layer (mock, local-only).
//
// UI code only uses `AuthService`. This local implementation keeps users in
// localStorage with PBKDF2-hashed passwords (WebCrypto) and the session in
// sessionStorage (+ optional "remember me"), so an admin tab and a player tab
// can be signed in side by side on one iPad. Swap for Supabase Auth later
// (signInWithPassword / signUp + a `profiles.role` column).

import { BASE_PATH } from "../basePath";
import { newId } from "../data/ids";
import type { MediaRef } from "../data/types";
import type { Role, Session, User } from "./types";

type StoredUser = User & { salt: string; hash: string };

export type AuthSnapshot = { user: User | null; users: User[]; hasAdmin: boolean };

export interface AuthService {
  getSnapshot(): AuthSnapshot;
  getServerSnapshot(): AuthSnapshot;
  subscribe(listener: () => void): () => void;
  signIn(username: string, password: string, remember: boolean): Promise<User>;
  signOut(): void;
  /** First-run: create the admin account on this device (only if none exists). */
  setupAdmin(input: { username: string; name: string; password: string }): Promise<User>;
  /** Create an account (role chosen by caller; admins can create admins). */
  createUser(input: { username: string; name: string; password: string; role: Role; avatar?: MediaRef | null }): Promise<User>;
  updateUser(id: string, patch: Partial<Pick<User, "name" | "avatar" | "role">>): void;
  removeUser(id: string): void;
}

const PREFIX = `adventure-app${BASE_PATH || ""}:auth`;
const USERS_KEY = `${PREFIX}:users`;
const SESSION_KEY = `${PREFIX}:session`;

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

async function hashPassword(password: string, saltHex: string) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure context required (open the app over https).");
  }
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 120_000 },
    key,
    256,
  );
  return toHex(bits);
}

function newSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

const strip = ({ salt: _s, hash: _h, ...user }: StoredUser): User => {
  void _s;
  void _h;
  return user;
};

function normalizeUsername(u: string) {
  return u.trim().toLowerCase();
}

function createLocalAuth(): AuthService {
  const listeners = new Set<() => void>();
  const server: AuthSnapshot = { user: null, users: [], hasAdmin: false };
  let snapshot: AuthSnapshot | null = null;

  const readUsers = (): StoredUser[] => {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
    } catch {
      return [];
    }
  };
  const writeUsers = (users: StoredUser[]) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const readSession = (): Session | null => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  };

  const compute = (): AuthSnapshot => {
    if (typeof window === "undefined") return server;
    const users = readUsers();
    const session = readSession();
    const found = session ? users.find((u) => u.id === session.userId) : undefined;
    return {
      user: found ? strip(found) : null,
      users: users.map(strip),
      hasAdmin: users.some((u) => u.role === "admin"),
    };
  };

  const emit = () => {
    snapshot = compute();
    listeners.forEach((l) => l());
  };

  const startSession = (user: StoredUser, remember: boolean) => {
    const session: Session = { userId: user.id, signedInAt: new Date().toISOString() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (remember) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  };

  const insertUser = async (input: {
    username: string;
    name: string;
    password: string;
    role: Role;
    avatar?: MediaRef | null;
  }) => {
    const username = normalizeUsername(input.username);
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
      throw new Error("Username: 3–24 letters, numbers, dot, dash or underscore.");
    }
    if (input.password.length < 6) throw new Error("Password must be at least 6 characters.");
    const users = readUsers();
    if (users.some((u) => u.username === username)) throw new Error("That username is taken.");
    const salt = newSalt();
    const stored: StoredUser = {
      id: newId("user"),
      username,
      name: input.name.trim() || username,
      role: input.role,
      avatar: input.avatar ?? null,
      createdAt: new Date().toISOString(),
      salt,
      hash: await hashPassword(input.password, salt),
    };
    writeUsers([...users, stored]);
    return stored;
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === USERS_KEY || e.key === SESSION_KEY) emit();
    });
  }

  return {
    getSnapshot: () => (snapshot ??= compute()),
    getServerSnapshot: () => server,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    async signIn(usernameRaw, password, remember) {
      const username = normalizeUsername(usernameRaw);
      const user = readUsers().find((u) => u.username === username);
      if (!user || (await hashPassword(password, user.salt)) !== user.hash) {
        throw new Error("Wrong username or password.");
      }
      startSession(user, remember);
      emit();
      return strip(user);
    },
    signOut() {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      emit();
    },
    async setupAdmin(input) {
      if (readUsers().some((u) => u.role === "admin")) {
        throw new Error("An admin already exists on this device. Sign in instead.");
      }
      const user = await insertUser({ ...input, role: "admin" });
      startSession(user, true);
      emit();
      return strip(user);
    },
    async createUser(input) {
      const user = await insertUser(input);
      emit();
      return strip(user);
    },
    updateUser(id, patch) {
      const users = readUsers();
      if (patch.role && patch.role !== "admin") {
        const admins = users.filter((u) => u.role === "admin");
        if (admins.length === 1 && admins[0].id === id) throw new Error("Keep at least one admin.");
      }
      writeUsers(users.map((u) => (u.id === id ? { ...u, ...patch } : u)));
      emit();
    },
    removeUser(id) {
      const users = readUsers();
      const target = users.find((u) => u.id === id);
      if (target?.role === "admin" && users.filter((u) => u.role === "admin").length === 1) {
        throw new Error("Keep at least one admin.");
      }
      writeUsers(users.filter((u) => u.id !== id));
      if (readSession()?.userId === id) this.signOut();
      emit();
    },
  };
}

let auth: AuthService | null = null;

export function getAuth(): AuthService {
  if (!auth) auth = createLocalAuth();
  return auth;
}
