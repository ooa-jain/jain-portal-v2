import type { Metadata } from "next";
import { listNotifications } from "@/lib/data";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui/page";
import { NotificationsAdmin } from "../admin-client";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications and reminders" description="Post announcements to everyone's bell, and email reminders to people who have not submitted." />
      <NotificationsAdmin notifications={await listNotifications(50)} mailEnabled={env.mail !== null} cronEnabled={Boolean(env.cronSecret)} />
    </>
  );
}
