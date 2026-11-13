import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { collections } from "@/lib/db";
import { getSettings, normalizeUser } from "@/lib/data";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui/page";
import { UsersAdmin } from "../admin-client";

export const metadata: Metadata = { title: "Users and access" };

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const [settings, docs] = await Promise.all([getSettings(), collections.users().find().sort({ created_at: -1 }).toArray()]);
  const fixedAdmins = [...env.adminEmails];
  const adminSet = new Set([...fixedAdmins, ...settings.admin_emails]);
  return (
    <>
      <PageHeader title="Users and access" description="Who can sign in, which modules they can use, and who is an admin." />
      <UsersAdmin users={docs.map((d) => normalizeUser(d, adminSet))} currentEmail={me.email} fixedAdmins={fixedAdmins} />
    </>
  );
}
