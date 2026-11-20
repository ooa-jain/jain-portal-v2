import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { collections } from "./db";
import { env } from "./env";

/** Library files live outside the public uploads folder and are only served after an access check. */
function root() {
  return path.resolve(env.uploadDir, "library");
}

export function sha256(data: Uint8Array) {
  return createHash("sha256").update(data).digest("hex");
}

export async function storeFile(data: Uint8Array, ext: string): Promise<string> {
  const now = new Date();
  const folder = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const name = `${randomBytes(12).toString("hex")}${ext}`;
  await mkdir(path.join(root(), folder), { recursive: true });
  await writeFile(path.join(root(), folder, name), data);
  return `${folder}/${name}`;
}

export async function readStoredFile(relative: string): Promise<Buffer | null> {
  if (!/^\d{4}-\d{2}\/[0-9a-f]{24}\.[a-z]{3,4}$/.test(relative)) return null;
  try {
    return await readFile(path.join(root(), relative));
  } catch {
    return null;
  }
}

let indexed = false;
/** One current document per slot, and fast duplicate lookups. Created once per process. */
export async function ensureDocumentIndexes() {
  if (indexed) return;
  const docs = collections.documents();
  await docs.createIndex({ dept: 1, course_code: 1, semester: 1, doc_type: 1 }, { unique: true, name: "one_per_slot" });
  await docs.createIndex({ sha256: 1 }, { name: "by_hash" });
  await docs.createIndex({ "history.sha256": 1 }, { name: "by_old_hash" });
  indexed = true;
}
