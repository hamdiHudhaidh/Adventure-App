// Turns picked files into stored media + location info.
import { putBlob } from "./data/media";
import type { LngLat, MediaRef } from "./data/types";
import { readExif } from "./exif";
import { MAX_VIDEO_BYTES, prepareImage } from "./image";

export type PreparedUpload = {
  name: string;
  media: MediaRef;
  exifLngLat: LngLat | null;
  takenAt: string | null;
};

export async function prepareUpload(file: File): Promise<PreparedUpload> {
  const isVideo = file.type.startsWith("video/");
  if (isVideo) {
    if (file.size > MAX_VIDEO_BYTES) throw new Error(`${file.name}: video is larger than 80 MB`);
    const blobId = await putBlob(file);
    return {
      name: file.name,
      media: { kind: "video", source: "local", blobId, mime: file.type },
      exifLngLat: null,
      takenAt: file.lastModified ? new Date(file.lastModified).toISOString() : null,
    };
  }
  const exif = await readExif(file); // before downscale (canvas strips EXIF)
  const blob = await prepareImage(file);
  const blobId = await putBlob(blob);
  return {
    name: file.name,
    media: { kind: "image", source: "local", blobId, mime: blob.type || "image/jpeg" },
    exifLngLat: exif.lngLat,
    takenAt: exif.takenAt,
  };
}
