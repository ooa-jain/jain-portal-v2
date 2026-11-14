import * as React from "react";
import { cn } from "@/lib/utils";

/** White panel with a hairline border and a title row. */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("overflow-hidden rounded-2xl border border-white/80 bg-card text-card-foreground shadow-[0_10px_30px_-18px_rgba(35,38,63,.35)]", className)} {...props} />;
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-0.5 px-[18px] pt-4 pb-3", className)} {...props} />;
}
function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-[15px] font-bold leading-tight text-primary", className)} {...props} />;
}
function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-[13px] text-muted-foreground", className)} {...props} />;
}
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-[18px] pb-[18px]", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
