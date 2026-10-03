export function formatWhen(iso: string | null | undefined) {
  if (!iso) return "Unknown time";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const SOURCE_LABEL = { exif: "Photo GPS", pin: "Dropped pin", gps: "Device GPS" } as const;
