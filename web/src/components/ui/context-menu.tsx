"use client";

import * as React from "react";
import { ContextMenu as P } from "radix-ui";
import { cn } from "@/lib/utils";

const ContextMenu = P.Root;
const ContextMenuTrigger = P.Trigger;
const ContextMenuGroup = P.Group;
const ContextMenuPortal = P.Portal;

function ContextMenuContent({ className, ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content className={cn("z-50 min-w-[8rem] overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", className)} {...props} />
    </P.Portal>
  );
}

function ContextMenuItem({ className, inset, ...props }: React.ComponentProps<typeof P.Item> & { inset?: boolean }) {
  return <P.Item className={cn("relative flex cursor-default select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", className)} {...props} />;
}

function ContextMenuLabel({ className, inset, ...props }: React.ComponentProps<typeof P.Label> & { inset?: boolean }) {
  return <P.Label className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", inset && "pl-8", className)} {...props} />;
}

function ContextMenuSeparator({ className, ...props }: React.ComponentProps<typeof P.Separator>) {
  return <P.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

function ContextMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
}

export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuGroup, ContextMenuPortal };
