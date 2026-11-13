import type { Metadata } from "next";
import { listAllIea } from "@/lib/iea";
import { PageHeader } from "@/components/ui/page";
import { IeaAdmin } from "../admin-client";

export const metadata: Metadata = { title: "IEA submissions" };

export default async function AdminIeaPage() {
  return (
    <>
      <PageHeader title="IEA submissions" description="Innovation & Emerging Areas submissions from every school." />
      <IeaAdmin submissions={await listAllIea()} />
    </>
  );
}
