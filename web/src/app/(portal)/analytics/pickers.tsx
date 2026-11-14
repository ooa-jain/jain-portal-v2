"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";
import { DEPARTMENTS } from "@/lib/constants";

function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next}`);
  };
}

export function SemesterPicker({ value, semesters }: { value: string; semesters: string[] }) {
  const set = useSetParam();
  return (
    <Select aria-label="Semester" className="w-auto bg-white" value={value} onChange={(e) => set("semester", e.target.value)}>
      {semesters.map((s) => <option key={s}>{s}</option>)}
    </Select>
  );
}

export function DeptPicker({ value }: { value: string }) {
  const set = useSetParam();
  return (
    <Select aria-label="Department" className="w-auto max-w-72 bg-white" value={value} onChange={(e) => set("dept", e.target.value)}>
      <option value="">All departments</option>
      {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
    </Select>
  );
}
