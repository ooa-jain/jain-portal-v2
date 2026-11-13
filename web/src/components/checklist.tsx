"use client";

import { useRef, useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { STATUS_OPTIONS, type ChecklistSection } from "@/lib/constants";
import type { Checklist, ChecklistAnswer } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Upload an evidence file; returns its URL path, or null after showing the error. */
export async function uploadEvidence(
  file: File,
  shareToken?: string,
  folder?: string,
): Promise<{ url: string; name: string } | null> {
  const body = new FormData();
  body.append("file", file);
  if (shareToken) body.append("share_token", shareToken);
  if (folder) body.append("folder", folder);
  try {
    const response = await fetch("/api/upload-evidence", { method: "POST", body });
    const result = await response.json();
    if (result.ok) return { url: result.url as string, name: (result.filename as string) ?? file.name };
    toast.error(result.error ?? "Upload failed.");
  } catch {
    toast.error("Upload failed. Check your connection and try again.");
  }
  return null;
}

export function UploadButton({
  onUploaded,
  shareToken,
  folder,
  disabled,
  label = "Attach file",
}: {
  onUploaded: (url: string, name: string) => void;
  shareToken?: string;
  folder?: string;
  disabled?: boolean;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          const uploaded = await uploadEvidence(file, shareToken, folder);
          setBusy(false);
          if (uploaded) {
            onUploaded(uploaded.url, uploaded.name);
            toast.success("File attached.");
          }
        }}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => input.current?.click()}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded border border-input bg-card px-3 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
        {label}
      </button>
    </>
  );
}

const STATUS_STYLE: Record<string, string> = {
  Yes: "bg-success text-white border-success",
  No: "bg-destructive text-white border-destructive",
  "N/A": "bg-muted-foreground text-white border-muted-foreground",
};

export function StatusPicker({
  value,
  onChange,
  disabled,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="inline-flex shrink-0 overflow-hidden rounded border border-input">
      {STATUS_OPTIONS.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            // Clicking the selected option again clears the answer.
            onClick={() => onChange(selected ? "" : option)}
            className={cn(
              "h-9 min-w-11 border-r border-input px-3 text-[13px] font-medium last:border-r-0 disabled:cursor-not-allowed",
              selected ? STATUS_STYLE[option] : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (!status) return <span className="text-xs text-muted-foreground">Not answered</span>;
  const style =
    status === "Yes"
      ? "bg-success-soft text-success"
      : status === "No"
        ? "bg-destructive-soft text-destructive"
        : "bg-muted text-muted-foreground";
  return <span className={cn("rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", style)}>{status}</span>;
}

/** Turn any uploaded-file path or URL inside a remark into a link. */
export function RemarkText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(https?:\/\/\S+|\/static\/uploads\/\S+)/g);
  return (
    <span className="break-words text-sm text-muted-foreground">
      {parts.map((part, index) =>
        /^(https?:\/\/|\/static\/uploads\/)/.test(part) ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
            {part.includes("/static/uploads/") ? "View attached file" : part}
          </a>
        ) : (
          part
        ),
      )}
    </span>
  );
}

export function ChecklistEditor({
  sections,
  value,
  onChange,
  disabled,
  shareToken,
  dateItemId,
}: {
  sections: ChecklistSection[];
  value: Checklist;
  onChange: (next: Checklist) => void;
  disabled?: boolean;
  shareToken?: string;
  /** One item may hold a date instead of Yes / No / N/A. */
  dateItemId?: string;
}) {
  const answer = (id: string): ChecklistAnswer => value[id] ?? { status: "", remark: "" };
  const update = (id: string, patch: Partial<ChecklistAnswer>) =>
    onChange({ ...value, [id]: { ...answer(id), ...patch } });

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section) => (
        <section key={section.title}>
          <h3 className="rounded-sm border-l-[3px] border-accent bg-secondary px-3 py-1.5 text-[13px] font-semibold text-primary">{section.title}</h3>
          <ul className="divide-y">
            {section.items.map((item) => {
              const current = answer(item.id);
              return (
                <li key={item.id} className="flex flex-col gap-2 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex gap-3 text-sm">
                      <span className="w-9 shrink-0 font-mono text-xs leading-5 text-muted-foreground">{item.id}</span>
                      <span>{item.text}</span>
                    </p>
                    {item.id === dateItemId ? (
                      <Input
                        type="date"
                        aria-label={item.text}
                        className="sm:w-44"
                        disabled={disabled}
                        value={current.status}
                        onChange={(event) => update(item.id, { status: event.target.value })}
                      />
                    ) : (
                      <StatusPicker
                        name={item.text}
                        value={current.status}
                        disabled={disabled}
                        onChange={(status) => update(item.id, { status })}
                      />
                    )}
                  </div>
                  <div className="flex gap-2 sm:pl-12">
                    <Input
                      aria-label={`Notes for item ${item.id}`}
                      placeholder="Notes or evidence link (optional)"
                      disabled={disabled}
                      value={current.remark}
                      onChange={(event) => update(item.id, { remark: event.target.value })}
                    />
                    <UploadButton
                      disabled={disabled}
                      shareToken={shareToken}
                      onUploaded={(url) => update(item.id, { remark: `${window.location.origin}${url}` })}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ChecklistReadOnly({ sections, value }: { sections: ChecklistSection[]; value: Checklist }) {
  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => (
        <section key={section.title}>
          <h4 className="rounded-sm border-l-[3px] border-accent bg-secondary px-3 py-1.5 text-[13px] font-semibold text-primary">{section.title}</h4>
          <ul className="divide-y">
            {section.items.map((item) => {
              const current = value[item.id] ?? { status: "", remark: "" };
              return (
                <li key={item.id} className="flex flex-col gap-1 py-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <p className="flex gap-3 text-sm">
                      <span className="w-9 shrink-0 font-mono text-xs leading-5 text-muted-foreground">{item.id}</span>
                      <span>{item.text}</span>
                    </p>
                    <StatusBadge status={current.status} />
                  </div>
                  {current.remark && (
                    <div className="pl-12">
                      <RemarkText text={current.remark} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
