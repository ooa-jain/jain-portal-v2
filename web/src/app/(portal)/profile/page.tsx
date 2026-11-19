import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { collections } from "@/lib/db";
import { str } from "@/lib/utils";
import { ChangePasswordForm } from "@/components/change-password-form";
import { DepartmentForm } from "@/components/department-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";

export const metadata: Metadata = { title: "Profile & Password" };

export default async function ProfilePage() {
  const user = await requireUser();
  const doc = user.isFaculty ? await collections.users().findOne({ email: user.email }) : null;
  const createdBy = doc ? str(doc.invited_by_name) || str(doc.invited_by) : "";
  return (
    <>
      <PageHeader title="Profile & Password" description={`${user.name} · ${user.email}`} />
      {user.isFaculty && (
        <Card>
          <CardHeader>
            <CardTitle>Your faculty login</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-8 gap-y-3 text-[13.5px] sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Department</dt><dd className="font-semibold text-primary">{user.department || "Not set"}</dd></div>
              <div><dt className="text-muted-foreground">Role</dt><dd className="font-semibold text-primary">Faculty</dd></div>
              <div>
                <dt className="text-muted-foreground">Created through</dt>
                <dd className="font-semibold text-primary">
                  {createdBy ? `${createdBy}${str(doc?.auth_provider) === "faculty_link" ? "'s checklist link" : " (HOD)"}` : "The Office of Academic Affairs"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[12.5px] text-muted-foreground">To change your department, ask your HOD or the Office of Academic Affairs.</p>
          </CardContent>
        </Card>
      )}
      {!user.isFaculty && !user.isDemo && (
        <Card>
          <CardHeader>
            <CardTitle>Department</CardTitle>
            <CardDescription>Pre-fills your forms and decides which department&apos;s submissions and documents you see.</CardDescription>
          </CardHeader>
          <CardContent>
            <DepartmentForm current={user.department} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Used to sign in with your email address.</CardDescription>
        </CardHeader>
        <CardContent>
          {user.impersonatedBy || user.isDemo ? (
            <p className="text-[13.5px] text-muted-foreground">The password cannot be changed from this account.</p>
          ) : (
            <ChangePasswordForm hasPassword={user.hasPassword} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
