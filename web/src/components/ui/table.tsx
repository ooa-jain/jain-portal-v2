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
  return <thead className="border-y bg-muted" {...props} />;
}
function TBody(props: React.ComponentProps<"tbody">) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}
function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b transition-colors hover:bg-muted", className)} {...props} />;
}
function TH({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn("h-10 whitespace-nowrap px-[18px] text-left text-[12.5px] font-semibold text-muted-foreground", className)}
      {...props}
    />
  );
}
function TD({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-[18px] py-3 align-middle", className)} {...props} />;
}

export { Table, THead, TBody, TR, TH, TD };
