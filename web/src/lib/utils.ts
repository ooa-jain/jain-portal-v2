import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The old portal stored UTC timestamps without a zone suffix; keep that format. */
export function nowStamp(): string {
  return new Date().toISOString().replace("Z", "");
}

/** Parse a stored timestamp (with or without a zone suffix) as UTC. */
export function parseStamp(value: string | undefined | null): Date | null {
  if (!value) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | undefined | null): string {
  const date = parseStamp(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function formatDateTime(value: string | undefined | null): string {
  const date = parseStamp(value);
  if (!date) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}
