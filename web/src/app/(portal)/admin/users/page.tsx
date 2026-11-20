import type { Metadata } from "next";
import type { Filter, Document } from "mongodb";
import { requireAdmin } from "@/lib/auth";
import { collections } from "@/lib/db";
import { getSettings, normalizeUser } from "@/lib/data";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui/page";
import { UsersAdmin } from "../admin-client";

export const metadata: Metadata = { title: "Users and access" };

const PAGE_SIZE = 100;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Users and access: searched and paged in the database, 100 at a time. */
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const role = typeof params.role === "string" && ["admin", "faculty", "user"].includes(params.role) ? params.role : "";
  const page = Math.max(1, Math.min(100000, Number(params.page) || 1));

  const settings = await getSettings();
  const fixedAdmins = [...env.adminEmails];
  const adminList = [...new Set([...fixedAdmins, ...settings.admin_emails])];
  const adminSet = new Set(adminList);

  const filter: Filter<Document> = {};
  if (q) {
    const pattern = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ email: pattern }, { name: pattern }, { department: pattern }];
  }
  const adminMatch = { $or: [{ is_admin: true }, { role: "admin" }, { email: { $in: adminList } }] };
  if (role === "admin") filter.$and = [adminMatch];
  if (role === "faculty") filter.role = "faculty";
  if (role === "user") filter.$and = [{ role: { $ne: "faculty" } }, { is_admin: { $ne: true } }, { role: { $ne: "admin" } }, { email: { $nin: adminList } }];

  const users = collections.users();
  const [docs, total] = await Promise.all([
    users.find(filter).sort({ created_at: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).toArray(),
    // No search or filter: the collection's own count is instant even with 500,000 accounts.
    Object.keys(filter).length ? users.countDocuments(filter) : users.estimatedDocumentCount(),
  ]);
  return (
    <>
      <PageHeader title="Users and access" description="Who can sign in, which modules they can use, and who is an admin." />
      <UsersAdmin
        users={docs.map((d) => normalizeUser(d, adminSet))}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        initialQuery={q}
        initialRole={role}
        currentEmail={me.email}
        fixedAdmins={fixedAdmins}
      />
    </>
  );
}
