import { getCurrentUser } from "@/lib/auth";
import { canViewSubmission, getSubmission } from "@/lib/data";
import { buildHodChecklistWorkbook, xlsxResponse } from "@/lib/excel";

/** The HOD's own filled form plus a blank faculty checklist template. */
export async function GET(_request: Request, ctx: RouteContext<"/api/export-hod-checklist/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Please sign in.", { status: 401 });
  const { id } = await ctx.params;
  const sub = await getSubmission(id);
  if (!sub || !canViewSubmission(user, sub)) return new Response("Not found", { status: 404 });

  const buffer = await buildHodChecklistWorkbook(sub);
  const label = sub.form_type === "closure" ? "Closure" : "Readiness";
  return xlsxResponse(buffer, `HOD_${label}_${sub.identity.dept.slice(0, 40) || "Department"}.xlsx`);
}
