import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/change-password-form";
import { DepartmentForm } from "@/components/department-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";

export const metadata: Metadata = { title: "Profile & Password" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Profile & Password" description={`${user.name} · ${user.email}`} />
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
