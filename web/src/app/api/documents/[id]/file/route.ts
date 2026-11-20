import { getCurrentUser } from "@/lib/auth";
import { collections } from "@/lib/db";
import { readStoredFile } from "@/lib/doc-store";
import { canViewDocument, normalizeDocument } from "@/lib/documents";
import { toObjectId } from "@/lib/data";
import { str } from "@/lib/utils";

const INLINE = new Set(["application/pdf", "image/png", "image/jpeg"]);

/** Download a library document (or an older version with ?v=). Department members and admins only. */
export async function GET(request: Request, ctx: RouteContext<"/api/documents/[id]/file">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Please sign in.", { status: 401 });
  const _id = toObjectId((await ctx.params).id);
  const raw = _id ? await collections.documents().findOne({ _id }, { projection: { text: 0 } }) : null;
  if (!raw || !canViewDocument(user, normalizeDocument(raw))) return new Response("Not found", { status: 404 });

  const wanted = Number(new URL(request.url).searchParams.get("v"));
  let filePath = str(raw.file_path);
  let fileName = str(raw.file_name);
  if (wanted && wanted !== Number(raw.version)) {
    const old = (Array.isArray(raw.history) ? raw.history : []).find((h: Record<string, unknown>) => Number(h.version) === wanted);
    if (!old) return new Response("Not found", { status: 404 });
    filePath = str(old.file_path);
    fileName = str(old.file_name);
  }
  const data = await readStoredFile(filePath);
  if (!data) return new Response("File missing", { status: 404 });

  const mime = str(raw.mime) || "application/octet-stream";
  const safeName = fileName.replace(/[^\w.\- ()]+/g, "_") || "document";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${INLINE.has(mime) ? "inline" : "attachment"}; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
