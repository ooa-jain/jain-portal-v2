import * as React from "react";
import { cn } from "@/lib/utils";

/** Page title row with optional actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-primary">{title}</h1>
        {description && <p className="mt-0.5 max-w-3xl text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  default: "border-l-primary",
  success: "border-l-success",
  warning: "border-l-accent",
  danger: "border-l-destructive",
};

/** KPI tile. */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className={cn("rounded-md border border-l-4 bg-card px-4 py-3", TONES[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums leading-none text-primary">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const NOTICE = {
  info: "border-ring/30 bg-secondary text-primary",
  warning: "border-accent/50 bg-warning-soft text-warning",
  danger: "border-destructive/30 bg-destructive-soft text-destructive",
  success: "border-success/30 bg-success-soft text-success",
};

/** Inline message bar. */
export function Notice({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: keyof typeof NOTICE;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-[13px]", NOTICE[tone])}>
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-[13px] text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
