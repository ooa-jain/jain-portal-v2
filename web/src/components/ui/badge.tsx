import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-secondary text-primary",
        success: "border-[#abefc6] bg-success-soft text-[#067647]",
        warning: "border-[#bfdbfe] bg-warning-soft text-[#1d4ed8]",
        destructive: "border-[#fecaca] bg-destructive-soft text-[#b42318]",
        muted: "border-border bg-[#f2f4f7] text-[#344054]",
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
