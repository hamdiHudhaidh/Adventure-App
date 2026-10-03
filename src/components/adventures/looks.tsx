import type { AdventureLook, MarkerGlyph } from "@/lib/data/types";

export const GLYPHS: { id: MarkerGlyph; label: string; path: string }[] = [
  { id: "diamond", label: "Diamond", path: "M12 2l8 10-8 10-8-10z M12 7l4 5-4 5-4-5z" },
  { id: "crest", label: "Crest", path: "M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z M12 7v10 M8 11h8" },
  { id: "flame", label: "Flame", path: "M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 2-5 3-6 0 3 1 4 2 4 0-4 0-7 1-10z" },
  { id: "compass", label: "Compass", path: "M12 2a10 10 0 110 20 10 10 0 010-20z M15.5 8.5l-2 5-5 2 2-5z" },
  { id: "crown", label: "Crown", path: "M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z M5 19h14" },
  { id: "eye", label: "Eye", path: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 110 6 3 3 0 010-6z" },
];

export const COLORS: { id: string; label: string }[] = [
  { id: "#f5ff00", label: "Neon" },
  { id: "#ffb547", label: "Ember" },
  { id: "#4de8ff", label: "Oasis" },
  { id: "#ff4d6d", label: "Crimson" },
  { id: "#9dff4d", label: "Venom" },
  { id: "#c38bff", label: "Phantom" },
];

export function Glyph({ glyph, size = 22, color = "currentColor" }: { glyph: MarkerGlyph; size?: number; color?: string }) {
  const g = GLYPHS.find((x) => x.id === glyph) ?? GLYPHS[0];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} aria-hidden>
      <path d={g.path} strokeLinejoin="round" />
    </svg>
  );
}

/** Small preview of how the adventure will look on the map. */
export function LookBadge({ look, size = 44 }: { look: AdventureLook; size?: number }) {
  return (
    <span
      className="adv-badge"
      style={{ width: size, height: size, ["--adv" as string]: look.color }}
      aria-hidden
    >
      <Glyph glyph={look.glyph} size={size * 0.52} color={look.color} />
    </span>
  );
}
