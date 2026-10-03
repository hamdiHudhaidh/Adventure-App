import { PLACES } from "./places";
import type { ActivityEntry, Adventure, AdventureStep, AppState, LngLat, Membership, Photo, Reward, StepProgress, Team } from "./types";

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

let rid = 0;
const r = (kind: Reward["kind"], label: string, amount = 1): Reward => ({ id: `rw-${++rid}`, kind, label, amount });

function step(
  id: string,
  title: string,
  instruction: string,
  place: { name: string; lngLat: LngLat } | null,
  prerequisites: string[],
  rewards: Reward[],
): AdventureStep {
  return {
    id,
    title,
    instruction,
    lngLat: place ? place.lngLat : null,
    placeName: place?.name ?? "",
    radiusM: 300,
    prerequisites,
    rewards,
  };
}

const diriyahSteps: AdventureStep[] = [
  step("st-rally", "Rally at Masmak", "Meet under the old gate. Receive your role cards and form the convoy.", PLACES.masmak, [], [r("badge", "Caravan formed"), r("item", "Role card")]),
  step("st-wadi", "Bonds of the Wadi", "Build a cairn together and name your car.", PLACES.wadiHanifah, ["st-rally"], [r("item", "Cairn stone"), r("xp", "XP", 100)]),
  step("st-sands", "Run the Red Sands", "Drivers navigate, runners grab three flags before the timer ends.", PLACES.redSands, ["st-rally"], [r("item", "Crimson flag"), r("xp", "XP", 150)]),
  step("st-chronicle", "The Lost Chronicle", "Quiet hour at At-Turaif. Lore readers decode the riddle — no phones.", PLACES.turaif, ["st-wadi"], [r("item", "Chronicle page"), r("xp", "XP", 200)]),
  step("st-edge", "Race to the Edge", "All teams race to the cliff marker. Bring the flag and the chronicle.", PLACES.edge, ["st-sands", "st-chronicle"], [r("badge", "Edge runner"), r("xp", "XP", 300)]),
  step("st-fireside", "Fireside", "Cook together, share stories and watch the recap film.", PLACES.camp, ["st-edge"], [r("badge", "Storyteller")]),
];

const crimsonSteps: AdventureStep[] = [
  step("st-cr-1", "Engines on", "Check tyre pressure and pick your navigator.", null, [], [r("item", "Map scroll")]),
  step("st-cr-2", "First flag", "Grab the first flag on the ridge.", { name: "Red Sands ridge", lngLat: [46.2555, 24.5862] }, ["st-cr-1"], [r("xp", "XP", 100)]),
  step("st-cr-3", "Sunset sprint", "Last flag before sunset.", { name: "Red Sand Dunes", lngLat: [46.2405, 24.5752] }, ["st-cr-2"], [r("badge", "Dune racer")]),
];

const diriyahTeams: Team[] = [
  { id: "tm-falcon", name: "Falcons", color: "#f5ff00" },
  { id: "tm-oryx", name: "Oryx", color: "#5be7ff" },
  { id: "tm-scorpion", name: "Scorpions", color: "#ff4d6d" },
];

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
    steps: diriyahSteps,
    capacity: 12,
    teams: diriyahTeams,
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
    steps: crimsonSteps,
    capacity: 6,
    teams: [
      { id: "tm-red", name: "Red", color: "#ff4d6d" },
      { id: "tm-gold", name: "Gold", color: "#ffb547" },
    ],
  },
];

// Test-run family (see Notion "Test Run"): three cars, one seat left in each.
const crew: [string, string, string][] = [
  ["Khalid", "tm-falcon", "09:00"],
  ["Omar", "tm-falcon", "09:05"],
  ["Nahla", "tm-falcon", "09:10"],
  ["Sara", "tm-oryx", "10:00"],
  ["Hanouf", "tm-oryx", "10:05"],
  ["Nora", "tm-oryx", "10:10"],
  ["Rayan", "tm-scorpion", "11:00"],
  ["Meme", "tm-scorpion", "11:05"],
  ["AJ", "tm-scorpion", "11:10"],
];

export const seedMemberships: Membership[] = crew.map(([name, teamId, time]) => ({
  adventureId: FIRST_ADVENTURE_ID,
  userId: `player-${name.toLowerCase()}`,
  userName: name,
  joinedAt: `2026-09-25T${time}:00.000Z`,
  teamId,
}));

// A run already under way, so live control has something to show.
const seedProgress: StepProgress[] = [
  { adventureId: FIRST_ADVENTURE_ID, partyId: "tm-falcon", stepId: "st-rally", completedAt: "2026-10-01T06:20:00.000Z", completedBy: "Khalid" },
  { adventureId: FIRST_ADVENTURE_ID, partyId: "tm-falcon", stepId: "st-wadi", completedAt: "2026-10-01T07:25:00.000Z", completedBy: "Omar" },
  { adventureId: FIRST_ADVENTURE_ID, partyId: "tm-oryx", stepId: "st-rally", completedAt: "2026-10-01T06:22:00.000Z", completedBy: "Sara" },
];

const seedActivity: ActivityEntry[] = seedProgress.map((p, i) => ({
  id: `ev-seed-${i}`,
  adventureId: p.adventureId,
  partyId: p.partyId,
  actor: p.completedBy,
  kind: "step",
  text: `completed “${diriyahSteps.find((x) => x.id === p.stepId)?.title}”`,
  at: p.completedAt,
}));

export function createSeedState(): AppState {
  return {
    schema: SCHEMA_VERSION,
    photos: structuredClone(seedPhotos),
    adventures: structuredClone(seedAdventures),
    memberships: structuredClone(seedMemberships),
    progress: structuredClone(seedProgress),
    controls: [],
    activity: structuredClone(seedActivity),
    positions: [],
    notices: [],
  };
}
