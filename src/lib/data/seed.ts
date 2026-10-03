import { PLACES } from "./places";
import type { Adventure, AppState, LngLat, Membership, Photo } from "./types";

export const SCHEMA_VERSION = 1;

const nudge = ([lng, lat]: LngLat, dx: number, dy: number): LngLat => [lng + dx, lat + dy];

function sample(
  id: string,
  src: string,
  lngLat: LngLat,
  placeName: string,
  caption: string,
  takenAt: string,
  authorName: string,
): Photo {
  return {
    id,
    authorId: `player-${authorName.toLowerCase()}`,
    authorName,
    createdAt: takenAt,
    takenAt,
    lngLat,
    locationSource: "exif",
    media: { kind: "image", source: "static", src },
    caption,
    placeName,
    sample: true,
  };
}

export const seedPhotos: Photo[] = [
  sample("ph-masmak-1", "/seed/masmak.svg", PLACES.masmak.lngLat, PLACES.masmak.name, "Rally point under the old gate", "2026-10-01T06:10:00.000Z", "Khalid"),
  sample("ph-masmak-2", "/seed/masmak.svg", nudge(PLACES.masmak.lngLat, 0.0016, 0.0009), PLACES.masmak.name, "Role cards handed out", "2026-10-01T06:25:00.000Z", "Sara"),
  sample("ph-masmak-3", "/seed/fireside.svg", nudge(PLACES.masmak.lngLat, -0.0012, 0.0014), "Deira, Riyadh", "Coffee before we roll out", "2026-10-01T05:55:00.000Z", "Rayan"),
  sample("ph-wadi-1", "/seed/wadi.svg", PLACES.wadiHanifah.lngLat, PLACES.wadiHanifah.name, "Team cairn in the wadi", "2026-10-01T07:20:00.000Z", "Sara"),
  sample("ph-wadi-2", "/seed/wadi.svg", nudge(PLACES.wadiHanifah.lngLat, 0.002, -0.0015), PLACES.wadiHanifah.name, "Palms and shade", "2026-10-01T07:31:00.000Z", "Nahla"),
  sample("ph-turaif-1", "/seed/turaif.svg", PLACES.turaif.lngLat, PLACES.turaif.name, "Mud-brick walls at night", "2026-10-01T08:35:00.000Z", "Rayan"),
  sample("ph-turaif-2", "/seed/turaif.svg", nudge(PLACES.turaif.lngLat, -0.0011, -0.0008), PLACES.turaif.name, "The riddle wall", "2026-10-01T08:50:00.000Z", "Omar"),
  sample("ph-dunes-1", "/seed/dunes.svg", PLACES.redSands.lngLat, PLACES.redSands.name, "Three flags, sixty minutes", "2026-10-01T10:05:00.000Z", "Khalid"),
  sample("ph-dunes-2", "/seed/dunes.svg", nudge(PLACES.redSands.lngLat, 0.004, 0.002), PLACES.redSands.name, "Drivers on the ridge", "2026-10-01T10:20:00.000Z", "Fahad"),
  sample("ph-edge-1", "/seed/edge.svg", PLACES.edge.lngLat, PLACES.edge.name, "Edge of the World", "2026-10-01T11:40:00.000Z", "Sara"),
  sample("ph-camp-1", "/seed/fireside.svg", PLACES.camp.lngLat, PLACES.camp.name, "Fireside and the montage", "2026-10-01T13:15:00.000Z", "Rayan"),
];

export const FIRST_ADVENTURE_ID = "adv-sands-of-diriyah";

export const seedAdventures: Adventure[] = [
  {
    id: FIRST_ADVENTURE_ID,
    photoId: "ph-turaif-1",
    name: "Sands of Diriyah",
    brief: {
      codename: "OP. MUD & STARS",
      summary:
        "A one-day convoy adventure around Riyadh: forts, wadis, red dunes and the Edge of the World. Learn a little history, play a clear role in your team, and end the day around the fire watching your recap film.",
      objective: "Three teams, four roles, five hours. Reach the fireside with every chronicle page.",
    },
    look: { glyph: "crest", color: "#ffb547" },
    status: "open",
    createdBy: "seed",
    createdAt: "2026-09-20T09:00:00.000Z",
  },
  {
    id: "adv-crimson-run",
    photoId: "ph-dunes-1",
    name: "Crimson Run",
    brief: {
      codename: "OP. RED SANDS",
      summary: "A high-energy dune race. Drivers navigate, runners grab the flags, the lore reader cracks the final clue.",
      objective: "Collect three flags across the dunes before sunset.",
    },
    look: { glyph: "flame", color: "#ff4d6d" },
    status: "open",
    createdBy: "seed",
    createdAt: "2026-09-21T09:00:00.000Z",
  },
];

export const seedMemberships: Membership[] = [
  { adventureId: FIRST_ADVENTURE_ID, userId: "player-khalid", userName: "Khalid", joinedAt: "2026-09-25T10:00:00.000Z" },
  { adventureId: FIRST_ADVENTURE_ID, userId: "player-sara", userName: "Sara", joinedAt: "2026-09-25T11:00:00.000Z" },
  { adventureId: FIRST_ADVENTURE_ID, userId: "player-rayan", userName: "Rayan", joinedAt: "2026-09-25T12:00:00.000Z" },
];

export function createSeedState(): AppState {
  return {
    schema: SCHEMA_VERSION,
    photos: structuredClone(seedPhotos),
    adventures: structuredClone(seedAdventures),
    memberships: structuredClone(seedMemberships),
  };
}
