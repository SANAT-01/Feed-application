import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

// The "local storage bucket" (README §6.3's S3 stand-in): a plain directory
// backed by a Docker volume, shared read-only with nginx so it can serve
// /media/* directly (standing in for a CDN in front of object storage).
const MEDIA_DIR = process.env.MEDIA_DIR || "/media";

export async function saveMedia(file: { originalname: string; buffer: Buffer }): Promise<string> {
  await mkdir(MEDIA_DIR, { recursive: true });
  const key = `${uuid()}-${path.basename(file.originalname)}`;
  await writeFile(path.join(MEDIA_DIR, key), file.buffer);
  return `/media/${key}`;
}
