// Domain model for the Adventure App.
// These shapes mirror the planned Supabase tables so the local mock
// repository can be swapped for Supabase later without touching the UI.

export type LngLat = [number, number];

export type MediaRef =
  | { kind: "image" | "video"; source: "static"; src: string }
  | { kind: "image" | "video"; source: "local"; blobId: string; mime: string };

/** How a photo got its map position. */
export type LocationSource = "exif" | "pin" | "gps";

export type Photo = {
  id: string;
  authorId: string;
  authorName: string;
  /** When it was uploaded. */
  createdAt: string;
  /** When it was taken (EXIF DateTimeOriginal) if known. */
  takenAt: string | null;
  lngLat: LngLat;
  locationSource: LocationSource;
  media: MediaRef;
  caption: string;
  placeName: string;
  sample?: boolean;
};

export type MarkerGlyph = "diamond" | "crest" | "flame" | "compass" | "crown" | "eye";

/** The unique look of an adventure on the map. */
export type AdventureLook = { glyph: MarkerGlyph; color: string };

export type AdventureBrief = {
  codename: string;
  summary: string;
  objective: string;
};

export type AdventureStatus = "draft" | "open" | "active" | "completed";

export type RewardKind = "item" | "xp" | "badge";

export type Reward = { id: string; kind: RewardKind; label: string; amount: number };

export type AdventureStep = {
  id: string;
  title: string;
  instruction: string;
  /** Map location for the step, or null for "anywhere" steps. */
  lngLat: LngLat | null;
  placeName: string;
  /** Check-in radius in metres when the step has a location. */
  radiusM: number;
  /** Step ids that must be completed first. */
  prerequisites: string[];
  rewards: Reward[];
};

export type Adventure = {
  id: string;
  /** The picture this adventure is attached to (its cover + map position). */
  photoId: string;
  name: string;
  brief: AdventureBrief;
  look: AdventureLook;
  status: AdventureStatus;
  createdBy: string;
  createdAt: string;
  steps: AdventureStep[];
};

/** A completed step for a party (a player now; a team in a later branch). */
export type StepProgress = {
  adventureId: string;
  partyId: string;
  stepId: string;
  completedAt: string;
  completedBy: string;
};

export type Membership = {
  adventureId: string;
  userId: string;
  userName: string;
  joinedAt: string;
};

export type AppState = {
  schema: number;
  photos: Photo[];
  adventures: Adventure[];
  memberships: Membership[];
  progress: StepProgress[];
};
