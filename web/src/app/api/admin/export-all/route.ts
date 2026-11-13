import { getCurrentUser } from "@/lib/auth";
import { listAllSubmissions, listFacultyForParents } from "@/lib/data";
import { buildWorkbook, xlsxResponse } from "@/lib/excel";
import { isModuleKey } from "@/lib/constants";

/** Admin: every submission (optionally one module) in a single workbook. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Admin access is required.", { status: 403 });

  const type = new URL(request.url).searchParams.get("type");
  let subs = await listAllSubmissions();
  if (isModuleKey(type)) subs = subs.filter((s) => s.form_type === type);

  const faculty = await listFacultyForParents(subs.map((s) => s._id));
  const buffer = await buildWorkbook(subs.map((s) => ({ ...s, faculty: faculty.get(s._id) ?? [] })));
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return xlsxResponse(buffer, `JainSarathi_${isModuleKey(type) ? type : "ALL"}_${stamp}.xlsx`);
}
