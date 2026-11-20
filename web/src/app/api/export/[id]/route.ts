import { getCurrentUser } from "@/lib/auth";
import { canViewSubmission, getSubmission, listFacultySubmissions } from "@/lib/data";
import { buildWorkbook, xlsxResponse } from "@/lib/excel";

/** Full export of one submission with its faculty checklists. */
export async function GET(_request: Request, ctx: RouteContext<"/api/export/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Please sign in.", { status: 401 });
  const { id } = await ctx.params;
  const sub = await getSubmission(id);
  if (!sub || !canViewSubmission(user, sub)) return new Response("Not found", { status: 404 });

  const faculty = await listFacultySubmissions(sub._id);
  const buffer = await buildWorkbook([{ ...sub, faculty }]);
  const label = sub.form_type === "closure" ? "Closure" : "Readiness";
  return xlsxResponse(buffer, `Sem${label}_${sub.identity.dept.slice(0, 40) || "Department"}.xlsx`);
}
