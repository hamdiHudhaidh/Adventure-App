// Minimal EXIF reader (JPEG only): GPS position + DateTimeOriginal.
// Must run on the ORIGINAL file — canvas downscaling strips EXIF.

import type { LngLat } from "./data/types";

export type ExifInfo = { lngLat: LngLat | null; takenAt: string | null };

const NONE: ExifInfo = { lngLat: null, takenAt: null };

export async function readExif(file: File): Promise<ExifInfo> {
  if (!/jpe?g$/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) return NONE;
  try {
    const buf = await file.slice(0, 512 * 1024).arrayBuffer();
    return parseJpeg(new DataView(buf));
  } catch {
    return NONE;
  }
}

function parseJpeg(view: DataView): ExifInfo {
  if (view.getUint16(0) !== 0xffd8) return NONE;
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset);
    const size = view.getUint16(offset + 2);
    if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966 /* "Exif" */) {
      return parseTiff(view, offset + 10);
    }
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break;
    offset += 2 + size;
  }
  return NONE;
}

function parseTiff(view: DataView, tiff: number): ExifInfo {
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (o: number) => view.getUint16(tiff + o, little);
  const u32 = (o: number) => view.getUint32(tiff + o, little);

  type Entry = { tag: number; type: number; count: number; valueOffset: number; entryOffset: number };
  const readIfd = (ifdOffset: number): Entry[] => {
    const n = u16(ifdOffset);
    const entries: Entry[] = [];
    for (let i = 0; i < n; i++) {
      const e = ifdOffset + 2 + i * 12;
      entries.push({ tag: u16(e), type: u16(e + 2), count: u32(e + 4), valueOffset: u32(e + 8), entryOffset: e + 8 });
    }
    return entries;
  };

  const ascii = (e: Entry) => {
    const start = e.count <= 4 ? e.entryOffset : e.valueOffset;
    let s = "";
    for (let i = 0; i < e.count - 1; i++) s += String.fromCharCode(view.getUint8(tiff + start + i));
    return s;
  };
  const rationals = (e: Entry) => {
    const out: number[] = [];
    for (let i = 0; i < e.count; i++) {
      const num = u32(e.valueOffset + i * 8);
      const den = u32(e.valueOffset + i * 8 + 4);
      out.push(den ? num / den : 0);
    }
    return out;
  };

  const ifd0 = readIfd(u32(4));
  let takenAt: string | null = null;
  let lngLat: LngLat | null = null;

  const exifPtr = ifd0.find((e) => e.tag === 0x8769);
  if (exifPtr) {
    const dt = readIfd(exifPtr.valueOffset).find((e) => e.tag === 0x9003);
    if (dt) {
      const m = ascii(dt).match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (m) takenAt = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).toISOString();
    }
  }

  const gpsPtr = ifd0.find((e) => e.tag === 0x8825);
  if (gpsPtr) {
    const gps = readIfd(gpsPtr.valueOffset);
    const get = (tag: number) => gps.find((e) => e.tag === tag);
    const latRef = get(1);
    const lat = get(2);
    const lngRef = get(3);
    const lng = get(4);
    if (lat && lng) {
      const toDeg = ([d = 0, m = 0, s = 0]: number[]) => d + m / 60 + s / 3600;
      let la = toDeg(rationals(lat));
      let lo = toDeg(rationals(lng));
      if (latRef && ascii(latRef) === "S") la = -la;
      if (lngRef && ascii(lngRef) === "W") lo = -lo;
      if (Number.isFinite(la) && Number.isFinite(lo) && !(la === 0 && lo === 0)) lngLat = [lo, la];
    }
  }

  return { lngLat, takenAt };
}
