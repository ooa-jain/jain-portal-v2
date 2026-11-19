import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { CurrentUser } from "@/lib/auth";
import { collections } from "@/lib/db";
import { normalizeFaculty, normalizeSubmission } from "@/lib/data";
import { MODULES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

/**
 * A faculty member's checklists: the links their department's HODs shared
 * that they have not answered yet, and the ones they have submitted.
 */
export async function FacultyChecklists({ user, limit }: { user: CurrentUser; limit?: number }) {
  const [shared, mine] = await Promise.all([
    user.department
      ? collections.submissions().find({ "identity.dept": user.department, share_token: { $exists: true, $ne: "" } }).sort({ timestamp: -1 }).limit(50).toArray()
      : Promise.resolve([]),
    collections.facultySubmissions().find({ faculty_email: user.email }).sort({ timestamp: -1 }).toArray(),
  ]);
  const links = shared.map(normalizeSubmission);
  const responses = mine.map(normalizeFaculty);
  const answered = new Set(responses.map((r) => r.parent_submission_id));
  const toFill = links.filter((l) => !answered.has(l._id));

  // One row per link answered, with the courses it covered.
  const byParent = new Map<string, { first: (typeof responses)[number]; courses: string[]; token: string }>();
  for (const r of responses) {
    const entry = byParent.get(r.parent_submission_id);
    if (entry) entry.courses.push(r.course_code);
    else byParent.set(r.parent_submission_id, { first: r, courses: [r.course_code], token: "" });
  }
  const tokens = new Map(links.map((l) => [l._id, l.share_token]));
  const missing = [...byParent.keys()].filter((id) => !tokens.has(id));
  if (missing.length) {
    const { toObjectId } = await import("@/lib/data");
    const ids = missing.map(toObjectId).filter((id) => id !== null);
    const parents = await collections.submissions().find({ _id: { $in: ids } }, { projection: { share_token: 1 } }).toArray();
    for (const p of parents) tokens.set(String(p._id), String(p.share_token ?? ""));
  }
  const submitted = [...byParent.entries()].map(([id, v]) => ({ ...v, token: tokens.get(id) ?? "" }));
  const cut = <T,>(rows: T[]) => (limit ? rows.slice(0, limit) : rows);

  return (
    <>
      <Card>
        <div className="flex items-center justify-between border-b bg-accent-soft px-4 py-3">
          <h2 className="text-[15px] font-bold text-primary">To be filled</h2>
          <span className="text-[13px] text-muted-foreground">{toFill.length ? `${toFill.length} waiting` : "All done"}</span>
        </div>
        {toFill.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13.5px] text-muted-foreground">
            {user.department ? "Nothing waiting. New checklists from your HOD appear here." : "Your department is not set yet. Ask your HOD."}
          </p>
        ) : (
          <ul className="divide-y">
            {cut(toFill).map((l) => (
              <li key={l._id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-primary">Faculty {MODULES[l.form_type].short} Checklist</span>
                  <span className="block text-[12.5px] text-muted-foreground">
                    {[l.identity.semester, l.identity.hodName && `HOD ${l.identity.hodName}`, l.identity.hodDeadline && `submit by ${l.identity.hodDeadline}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <Badge variant="warning">To fill</Badge>
                <Button size="sm" asChild>
                  <Link href={`/checklists/${encodeURIComponent(l.share_token)}`}>Fill <ArrowRight /></Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b bg-accent-soft px-4 py-3">
          <h2 className="text-[15px] font-bold text-primary">Submitted</h2>
          <span className="text-[13px] text-muted-foreground">{submitted.length} checklist{submitted.length === 1 ? "" : "s"}</span>
        </div>
        {submitted.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13.5px] text-muted-foreground">You have not submitted a checklist yet.</p>
        ) : (
          <ul className="divide-y">
            {cut(submitted).map(({ first, courses, token }) => (
              <li key={first.parent_submission_id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-primary">
                    Faculty {MODULES[first.form_type]?.short ?? ""} Checklist · {[first.semester, first.ac_year].filter((v, i, a) => v && !(i === 1 && a[0].includes(v))).join(" ")}
                  </span>
                  <span className="block text-[12.5px] text-muted-foreground">
                    {courses.join(", ")} · {formatDateTime(first.timestamp)}{first.hod_name ? ` · HOD ${first.hod_name}` : ""}
                  </span>
                </span>
                {first.hod_review_status === "reviewed" ? (
                  <Badge variant="success"><Check className="size-3" /> Reviewed</Badge>
                ) : first.hod_review_status === "needs_changes" ? (
                  <Badge variant="destructive">Needs changes</Badge>
                ) : (
                  <Badge variant="muted">With HOD</Badge>
                )}
                {token ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/checklists/${encodeURIComponent(token)}`}>Open <ArrowRight /></Link>
                  </Button>
                ) : (
                  <span className="text-[12px] text-muted-foreground">Link removed</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
