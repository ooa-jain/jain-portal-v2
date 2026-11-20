"use server";

import { revalidatePath } from "next/cache";
import { collections } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MODULES, isModuleKey } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";
import { nowStamp } from "@/lib/utils";

/** Ask for late-submission access to a module after its deadline. */
export async function requestExtension(moduleKey: string, comment: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };
  if (!isModuleKey(moduleKey)) return { ok: false, error: "Unknown module." };
  if (!comment.trim()) return { ok: false, error: "Give a short reason for the request." };

  await collections.accessRequests().updateOne(
    // One request per person per module; the stored label matches the old portal's records.
    { user_email: user.email, module: MODULES[moduleKey].label },
    {
      $set: {
        user_name: user.name,
        comment: comment.trim().slice(0, 2000),
        status: "pending",
        admin_comment: "",
        timestamp: nowStamp(),
      },
    },
    { upsert: true },
  );
  revalidatePath("/", "layout");
  return { ok: true };
}
