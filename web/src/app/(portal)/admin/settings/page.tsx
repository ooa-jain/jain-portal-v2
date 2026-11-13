import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import { PageHeader } from "@/components/ui/page";
import { SettingsAdmin } from "../admin-client";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Open or close modules, set deadlines, and choose the semesters offered in forms." />
      <SettingsAdmin settings={await getSettings()} />
    </>
  );
}
