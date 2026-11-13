import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { getSubmissionByToken } from "@/lib/data";
import { env } from "@/lib/env";

const MAX_BYTES = 16 * 1024 * 1024;
const ALLOWED = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".txt",
  ".png", ".jpg", ".jpeg", ".webp", ".zip",
]);

function fail(error: string, status = 400) {
  return Response.json({ ok: false, error }, { status });
}

/** Evidence upload. Allowed for signed-in users, or faculty holding a valid share link. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return fail("Invalid upload.");

  const user = await getCurrentUser();
  if (!user) {
    const token = String(form.get("share_token") ?? "");
    if (!token || !(await getSubmissionByToken(token))) return fail("Please sign in to upload files.", 401);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("No file selected.");
  if (file.size > MAX_BYTES) return fail("The file is larger than 16 MB.");

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED.has(ext)) return fail("This file type is not allowed. Upload a PDF, Office document, image or ZIP.");

  const base = path
    .basename(file.name, path.extname(file.name))
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .slice(0, 80) || "file";
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const name = `${stamp}_${base}${ext}`;

  const dir = path.resolve(env.uploadDir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  // Same URL shape as the old portal, so links already stored in submissions keep working.
  return Response.json({ ok: true, url: `/static/uploads/${name}` });
}
