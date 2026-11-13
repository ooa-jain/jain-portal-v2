import * as React from "react";
import { cn } from "@/lib/utils";

/** ERP-style panel: bordered box with a ruled title bar. */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-md border bg-card text-card-foreground", className)} {...props} />;
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-0.5 border-b px-4 py-3", className)} {...props} />;
}
function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-sm font-semibold leading-tight text-primary", className)} {...props} />;
}
function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-[13px] text-muted-foreground", className)} {...props} />;
}
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
