"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The portal could not complete this request. Your saved work is not affected. Try again in a moment.
      </p>
      <Button className="mt-3" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
