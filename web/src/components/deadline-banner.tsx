"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { requestExtension } from "@/app/actions/requests";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/page";
import { MODULES } from "@/lib/constants";
import type { ModuleAccess } from "@/lib/types";
import { formatDeadline } from "@/lib/utils";

function RequestDialog({ access }: { access: ModuleAccess }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const label = MODULES[access.key].label;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Request late access</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request late access</DialogTitle>
          <DialogDescription>
            The deadline for {label} has passed. Tell the Office of Academic Affairs why you need more time; you will be
            able to submit once an admin approves.
          </DialogDescription>
        </DialogHeader>
        <Textarea aria-label="Reason" rows={4} placeholder="Reason for the request" value={comment} onChange={(e) => setComment(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await requestExtension(access.key, comment);
                if (!result.ok) return void toast.error(result.error);
                toast.success("Request sent to the Office of Academic Affairs.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Shows the module deadline and, once it has passed, the late-access state. */
export function DeadlineBanner({ access, isAdmin }: { access: ModuleAccess; isAdmin: boolean }) {
  const label = MODULES[access.key].label;
  if (!access.deadline) return null;
  const when = `${formatDeadline(access.deadline)} (IST)`;

  if (!access.deadlinePassed) {
    return <Notice tone="info" title={`Deadline: ${when}`}>Submit {label} before this time. Drafts can be saved any time until then.</Notice>;
  }
  if (isAdmin) {
    return <Notice tone="warning" title={`Deadline passed: ${when}`}>As an admin you can still create and edit submissions.</Notice>;
  }
  if (access.hasOverride) {
    return <Notice tone="success" title="Late access granted">The deadline ({when}) has passed, but an admin has allowed you to submit.</Notice>;
  }
  if (access.request?.status === "pending") {
    return (
      <Notice tone="warning" title="Late access requested">
        The deadline ({when}) has passed. Your request is waiting for approval by the Office of Academic Affairs.
      </Notice>
    );
  }
  return (
    <Notice tone="danger" title={`Deadline passed: ${when}`} action={<RequestDialog access={access} />}>
      New submissions and edits are closed. You can still view and export what you submitted.
    </Notice>
  );
}
