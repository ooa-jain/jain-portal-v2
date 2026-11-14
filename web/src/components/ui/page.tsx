import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Page title row: a small uppercase eyebrow, a navy title whose first part
 * can carry the yellow brush highlight, an optional "| suffix", and actions.
 */
export function PageHeader({
  title,
  highlight,
  suffix,
  eyebrow = "Office of Academic Affairs",
  description,
  actions,
  className,
}: {
  title?: React.ReactNode;
  /** Words painted with the brush highlight, shown before `title`. */
  highlight?: string;
  /** Shown after a divider, e.g. the academic year. */
  suffix?: React.ReactNode;
  eyebrow?: string | null;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#475467]">{eyebrow}</p>}
        <h1 className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[28px] font-bold leading-tight text-primary">
          {highlight && <span className="hl">{highlight}</span>}
          {/* A plain-text title wears the highlight itself, as on the Board of Studies portal. */}
          {title && (!highlight && typeof title === "string" ? <span className="hl">{title}</span> : <span>{title}</span>)}
          {suffix && (
            <>
              <span className="font-normal text-primary/80">|</span>
              <span>{suffix}</span>
            </>
          )}
        </h1>
        {description && <p className="mt-1 max-w-3xl text-[13.5px] text-[#5b6474]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  default: "",
  success: "text-[#067647]",
  warning: "text-[#1d4ed8]",
  danger: "text-[#b42318]",
};

/** KPI tile: label, a big navy number, one line underneath. */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
  progress,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: keyof typeof TONES;
  /** 0–100: draws a thin bar under the number. */
  progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-card px-4 py-3.5 shadow-[0_10px_30px_-18px_rgba(35,38,63,.35)]">
      <p className="text-[13px] font-semibold text-[#344054]">{label}</p>
      <p className={cn("mt-1.5 text-[28px] font-bold tabular-nums leading-none text-primary", TONES[tone])}>{value}</p>
      {progress !== undefined && (
        <span className="mt-2.5 block h-1.5 rounded-full bg-[#e4e7ec]">
          <span className="block h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </span>
      )}
      {hint && <p className="mt-2 text-[12.5px] text-[#5b6474]">{hint}</p>}
    </div>
  );
}

const NOTICE = {
  info: "border-[#bfdbfe] bg-[#eff6ff] text-[#1e3a8a]",
  warning: "border-[#f2cd73] bg-[#fdf6e3] text-[#7a5e05]",
  danger: "border-[#fecaca] bg-[#fef2f2] text-[#b42318]",
  success: "border-[#abefc6] bg-[#ecfdf3] text-[#067647]",
};

/** Inline message bar with a coloured left edge. */
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
    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border border-l-4 px-4 py-3 text-[13.5px]", NOTICE[tone])}>
      <div className="min-w-0">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className="text-[#344054]">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-[18px] py-10 text-center text-[13.5px] text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
