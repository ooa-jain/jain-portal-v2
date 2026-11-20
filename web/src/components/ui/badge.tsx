import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-secondary text-primary",
        success: "border-success/30 bg-success-soft text-success",
        warning: "border-link/30 bg-warning-soft text-link",
        destructive: "border-destructive/30 bg-destructive-soft text-destructive",
        muted: "border-border bg-muted text-foreground",
        outline: "border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
