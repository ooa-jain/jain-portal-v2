import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm font-semibold text-accent">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page does not exist, or you do not have access to it.
      </p>
      <Button asChild className="mt-3">
        <Link href="/">Go to dashboard</Link>
      </Button>
    </main>
  );
}
