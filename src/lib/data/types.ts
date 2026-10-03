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
  /** When set, players are asked to capture media here for the recap film. */
  capture?: StepCapture | null;
};

export type StepCapture = { kind: "photo" | "video" | "any"; prompt: string };

export type Team = { id: string; name: string; color: string };

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
  /** Maximum number of players. */
  capacity: number;
  /** Players are split across these teams (at least one). */
  teams: Team[];
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
  teamId: string | null;
};

export type AppState = {
  schema: number;
  photos: Photo[];
  adventures: Adventure[];
  memberships: Membership[];
  progress: StepProgress[];
  controls: AdventureControl[];
  activity: ActivityEntry[];
  positions: PlayerPosition[];
  notices: Notice[];
  captures: Capture[];
  recaps: Recap[];
  deliveries: Delivery[];
};

/** Media a player captured at a step, for the recap film. */
export type Capture = {
  id: string;
  adventureId: string;
  stepId: string;
  partyId: string;
  userId: string;
  userName: string;
  media: MediaRef;
  at: string;
};

export type RecapClip = {
  id: string;
  captureId: string | null;
  media: MediaRef;
  caption: string;
  /** Seconds on screen. */
  duration: number;
  /** Video only: start offset in seconds. */
  trimStart: number;
};

export type RecapCut = { title: string; subtitle: string; clips: RecapClip[] };

export type ReleasedRecap = RecapCut & { version: number; releasedAt: string; releasedBy: string };

export type Recap = {
  adventureId: string;
  draft: RecapCut;
  released: ReleasedRecap | null;
  updatedAt: string;
};

/** In-app delivery of a released recap to one participant. */
export type Delivery = {
  id: string;
  adventureId: string;
  userId: string;
  version: number;
  deliveredAt: string;
  seenAt: string | null;
};

/** Live flow control set by the admin while an adventure runs. */
export type AdventureControl = {
  adventureId: string;
  /** Whole adventure paused: no check-ins. */
  paused: boolean;
  /** Individual steps paused for everyone. */
  pausedSteps: string[];
  /** Steps force-unlocked for a party, ignoring prerequisites. */
  unlocks: { partyId: string; stepId: string }[];
};

export type ActivityKind = "join" | "step" | "admin" | "notice" | "location";

export type ActivityEntry = {
  id: string;
  adventureId: string;
  partyId: string | null;
  actor: string;
  text: string;
  kind: ActivityKind;
  at: string;
};

export type PlayerPosition = {
  userId: string;
  userName: string;
  adventureId: string;
  lngLat: LngLat;
  at: string;
  simulated?: boolean;
};

/** Admin message to a team (partyId) or to everyone in the adventure (null). */
export type Notice = {
  id: string;
  adventureId: string;
  partyId: string | null;
  from: string;
  text: string;
  at: string;
};
