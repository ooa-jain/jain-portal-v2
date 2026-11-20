import { getCurrentUser } from "@/lib/auth";
import { listAllIea, ownerFilter } from "@/lib/iea";
import { toObjectId } from "@/lib/data";
import { IEA_SCHOOLS, IEA_YEARS } from "@/lib/constants";
import { buildIeaWorkbook, xlsxResponse } from "@/lib/excel";

/**
 * IEA Excel report. ?year= limits to one academic year.
 * ?sid= one submission (own, or any for admins); ?school= or no filter is admin-only.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Please sign in.", { status: 401 });

  const params = new URL(request.url).searchParams;
  const year = params.get("year") ?? "";
  const sid = params.get("sid") ?? "";
  const school = params.get("school") ?? "";
  if (year && !IEA_YEARS.includes(year)) return new Response("Invalid year", { status: 400 });

  let docs;
  let hint = "";
  if (sid) {
    const _id = toObjectId(sid);
    if (!_id) return new Response("Not found", { status: 404 });
    docs = await listAllIea(user.isAdmin ? { _id } : { _id, ...ownerFilter(user.email) });
    if (docs[0]) hint = `${docs[0].department}_${docs[0].level}`;
  } else {
    if (!user.isAdmin) return new Response("Admin access is required.", { status: 403 });
    if (school && !IEA_SCHOOLS[school]) return new Response("Unknown school", { status: 404 });
    docs = await listAllIea(school ? { school } : {});
    hint = school;
  }
  if (docs.length === 0) return new Response("No submissions found.", { status: 404 });

  const buffer = await buildIeaWorkbook(docs, year || undefined);
  return xlsxResponse(buffer, `IEA_Report${hint ? `_${hint}` : ""}${year ? `_${year}` : "_AllYears"}.xlsx`);
}
