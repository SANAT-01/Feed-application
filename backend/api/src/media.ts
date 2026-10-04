import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import convert from "heic-convert";

// The "local storage bucket" (README §6.3's S3 stand-in): a plain directory
// backed by a Docker volume, shared read-only with nginx so it can serve
// /media/* directly (standing in for a CDN in front of object storage).
const MEDIA_DIR = process.env.MEDIA_DIR || "/media";

const HEIC_EXTENSIONS = new Set([".heic", ".heif"]);

export async function saveMedia(file: { originalname: string; buffer: Buffer }): Promise<string> {
  await mkdir(MEDIA_DIR, { recursive: true });

  let { buffer, originalname } = file;

  // iPhones save photos as HEIC/HEIF by default. Two separate problems if
  // we store one as-is: nginx's mime.types has no entry for .heic/.heif, so
  // it gets served as text/plain (a browser <img> won't render that
  // regardless of the actual bytes) — and even served with the right
  // content-type, no browser except Safari can decode HEIC natively.
  // Converting to JPEG at upload time is the only fix that holds for every
  // viewer, not just the one who happened to take the photo.
  const ext = path.extname(originalname).toLowerCase();
  if (HEIC_EXTENSIONS.has(ext)) {
    const jpegBuffer = await convert({ buffer, format: "JPEG", quality: 0.9 });
    buffer = Buffer.from(jpegBuffer);
    originalname = `${originalname.slice(0, -ext.length)}.jpg`;
  }

  const key = `${uuid()}-${path.basename(originalname)}`;
  await writeFile(path.join(MEDIA_DIR, key), buffer);
  return `/media/${key}`;
}
