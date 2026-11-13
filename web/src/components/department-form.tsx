"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateDepartment } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { DEPARTMENTS } from "@/lib/constants";

export function DepartmentForm({ current }: { current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updateDepartment(value);
          if (!result.ok) return void toast.error(result.error);
          toast.success("Department saved.");
          router.refresh();
        });
      }}
    >
      <Select aria-label="Your department" value={value} onChange={(e) => setValue(e.target.value)} className="bg-card sm:max-w-md">
        <option value="">Select your department</option>
        {DEPARTMENTS.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </Select>
      <Button type="submit" disabled={pending || !value || value === current}>
        {pending && <Loader2 className="animate-spin" />}
        Save
      </Button>
    </form>
  );
}
