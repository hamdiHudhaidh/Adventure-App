/** Base path the static export is served from (e.g. "/Adventure-App"). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix a /public asset path with the deploy base path. */
export function asset(path: string) {
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
