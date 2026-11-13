import * as React from "react";
import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-[13px]", className)} {...props} />
    </div>
  );
}
function THead(props: React.ComponentProps<"thead">) {
  return <thead className="border-b bg-muted/60" {...props} />;
}
function TBody(props: React.ComponentProps<"tbody">) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}
function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b transition-colors even:bg-muted/30 hover:bg-secondary/60", className)} {...props} />;
}
function TH({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn("h-9 whitespace-nowrap border-r px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0", className)}
      {...props}
    />
  );
}
function TD({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-2 align-middle", className)} {...props} />;
}

export { Table, THead, TBody, TR, TH, TD };
