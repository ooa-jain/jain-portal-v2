import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { collections } from "@/lib/db";
import { getSettings, listAllSubmissions, normalizeUser } from "@/lib/data";
import { env } from "@/lib/env";
import { AdminPanel } from "./admin-panel";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const me = await requireAdmin();
  const [settings, submissions, userDocs] = await Promise.all([
    getSettings(),
    listAllSubmissions(),
    collections.users().find().sort({ created_at: -1 }).toArray(),
  ]);
  const fixedAdmins = [...env.adminEmails];
  const adminSet = new Set([...fixedAdmins, ...settings.admin_emails]);
  const users = userDocs.map((doc) => normalizeUser(doc, adminSet));

  return (
    <AdminPanel
      currentEmail={me.email}
      settings={settings}
      submissions={submissions}
      users={users}
      fixedAdmins={fixedAdmins}
    />
  );
}
