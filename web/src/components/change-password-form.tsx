"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto] md:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        if (next !== confirm) return void toast.error("The new passwords do not match.");
        startTransition(async () => {
          const result = await changePassword(current, next);
          if (!result.ok) return void toast.error(result.error);
          toast.success(hasPassword ? "Password changed." : "Password set. You can now sign in with email and password.");
          setCurrent("");
          setNext("");
          setConfirm("");
          router.refresh();
        });
      }}
    >
      {hasPassword ? (
        <Field label="Current password">
          <Input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
      ) : (
        <p className="text-[13px] text-muted-foreground md:self-center">
          You sign in with Google. Set a password to also sign in with your email.
        </p>
      )}
      <Field label="New password">
        <Input type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Field label="Confirm new password">
        <Input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <Button type="submit" disabled={pending || !next || !confirm || (hasPassword && !current)}>
        {pending && <Loader2 className="animate-spin" />}
        {hasPassword ? "Change password" : "Set password"}
      </Button>
    </form>
  );
}
