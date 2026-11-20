"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** A page failed to load: the menu stays, with a way to try again. */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-10 text-center">
      <h1 className="text-xl font-bold text-primary">This page could not be loaded</h1>
      <p className="text-[13.5px] text-muted-foreground">
        Something went wrong on our side. Your saved work is safe. Try again, and if it keeps happening, tell the Office of Academic Affairs
        {error.digest ? ` (reference ${error.digest})` : ""}.
      </p>
      <Button onClick={reset}>
        <RefreshCw /> Try again
      </Button>
    </div>
  );
}
