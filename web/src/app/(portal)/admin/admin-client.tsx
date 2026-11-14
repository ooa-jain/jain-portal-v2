"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, KeyRound, Loader2, Mail, Plus, Search, Send, Trash2, Undo2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import {
  approveAccess, approveEdit, deleteNotification, deleteUser, impersonate, revokeAccess, saveSettings, saveUser,
  sendNotification, sendReminders, setUserAdmin, setUserPassword, setUserPermission,
} from "@/app/actions/admin";
import { deleteSubmission } from "@/app/actions/submissions";
import { IeaTable } from "@/components/iea-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { EmptyRow, Notice } from "@/components/ui/page";
import { Switch } from "@/components/ui/switch";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DEPARTMENTS, IEA_SCHOOLS, IEA_YEARS, MODULES, MODULE_KEYS, FORM_MODULE_KEYS } from "@/lib/constants";
import type { AccessRequest, ActionResult, GlobalSettings, IeaSubmission, PortalNotification, PortalUser, Submission } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

/** Run a server action, show the outcome, and reload the page data. */
function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionResult>, success: string, after?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      toast.success(success);
      after?.();
      router.refresh();
    });
  return { pending, run };
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-56 flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
      <Input aria-label={placeholder} placeholder={placeholder} className="pl-8" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ── Readiness / closure submissions ─────────────────────────────────

export function SubmissionsAdmin({ submissions }: { submissions: Submission[] }) {
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("");
  const [status, setStatus] = useState("");
  const [campus, setCampus] = useState("");
  const { pending, run } = useAction();

  const campuses = useMemo(() => [...new Set(submissions.map((s) => s.identity.campus).filter(Boolean))].sort(), [submissions]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions.filter((s) => {
      if (module && s.form_type !== module) return false;
      if (status && (status === "draft") !== s._draft) return false;
      if (campus && s.identity.campus !== campus) return false;
      if (!q) return true;
      const i = s.identity;
      return [i.dept, i.hodName, i.hodEmail, i.semester, i.submitterEmail].some((v) => v.toLowerCase().includes(q));
    });
  }, [submissions, query, module, status, campus]);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <SearchBox value={query} onChange={setQuery} placeholder="Search department, HOD, semester or email" />
        <Select aria-label="Module" className="w-auto" value={module} onChange={(e) => setModule(e.target.value)}>
          <option value="">All modules</option>
          {FORM_MODULE_KEYS.map((key) => <option key={key} value={key}>{MODULES[key].label}</option>)}
        </Select>
        <Select aria-label="Campus" className="w-auto" value={campus} onChange={(e) => setCampus(e.target.value)}>
          <option value="">All campuses</option>
          {campuses.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select aria-label="Status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          <option value="final">Submitted</option>
          <option value="draft">Draft</option>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {submissions.length}</span>
      </div>
      <Table>
        <THead>
          <tr><TH>Department</TH><TH>Module</TH><TH>Semester</TH><TH>Campus</TH><TH>HOD</TH><TH>Status</TH><TH className="text-right">Faculty</TH><TH className="text-right">Edits</TH><TH>Updated</TH><TH className="text-right">Actions</TH></tr>
        </THead>
        <TBody>
          {filtered.map((s) => (
            <TR key={s._id}>
              <TD><Link href={`/${s.form_type}/form/${s._id}`} className="font-semibold text-primary hover:underline">{s.identity.dept || "Untitled"}</Link></TD>
              <TD>{MODULES[s.form_type].short}</TD>
              <TD className="whitespace-nowrap">{s.identity.semester || "—"}</TD>
              <TD>{s.identity.campus || "—"}</TD>
              <TD>{s.identity.hodName || "—"}<span className="block text-xs text-muted-foreground">{s.identity.submitterEmail}</span></TD>
              <TD>
                <span className="flex flex-wrap gap-1">
                  <Badge variant={s._draft ? "warning" : "success"}>{s._draft ? "Draft" : "Submitted"}</Badge>
                  {s.edit_request?.status === "pending" && <Badge variant="destructive">Edit requested</Badge>}
                </span>
              </TD>
              <TD className="text-right tabular-nums">{s.faculty_submission_count ?? 0}</TD>
              <TD className="text-right tabular-nums">{s.edit_count}</TD>
              <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(s.timestamp)}</TD>
              <TD>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" asChild><a href={`/api/export/${s._id}`} aria-label="Download Excel" title="Download Excel"><Download /></a></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete submission" title="Delete" disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`Delete the ${MODULES[s.form_type].label} submission from ${s.identity.dept || "this department"} and its faculty responses? This cannot be undone.`)) return;
                      run(() => deleteSubmission(s._id), "Submission deleted.");
                    }}>
                    <Trash2 />
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
          {filtered.length === 0 && <EmptyRow colSpan={10}>No submissions match these filters.</EmptyRow>}
        </TBody>
      </Table>
    </Card>
  );
}

// ── IEA ─────────────────────────────────────────────────────────────

export function IeaAdmin({ submissions }: { submissions: IeaSubmission[] }) {
  const [query, setQuery] = useState("");
  const [school, setSchool] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions.filter((s) => {
      if (school && s.school !== school) return false;
      if (status && (status === "final") !== s.submitted) return false;
      return !q || [s.department, s.school, s.level, s.submitterName, s.submitterEmail].some((v) => v.toLowerCase().includes(q));
    });
  }, [submissions, query, school, status]);

  const exportHref = `/api/iea/export?${new URLSearchParams({ ...(school ? { school } : {}), ...(year ? { year } : {}) })}`;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <SearchBox value={query} onChange={setQuery} placeholder="Search department, school or person" />
        <Select aria-label="School" className="w-auto max-w-64" value={school} onChange={(e) => setSchool(e.target.value)}>
          <option value="">All schools</option>
          {Object.keys(IEA_SCHOOLS).map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select aria-label="Status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          <option value="final">Submitted</option>
          <option value="draft">Draft</option>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} of {submissions.length}</span>
        <span className="ml-auto flex items-center gap-2">
          <Select aria-label="Export year" className="w-auto" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All years</option>
            {IEA_YEARS.map((y) => <option key={y}>{y}</option>)}
          </Select>
          <Button variant="outline" asChild>
            <a href={exportHref} download><Download />Export {school ? "school" : "all"}</a>
          </Button>
        </span>
      </div>
      <IeaTable submissions={filtered} canWrite={false} showOwner adminView emptyText="No IEA submissions match these filters." />
    </Card>
  );
}

// ── Users ───────────────────────────────────────────────────────────

/** Shows a password once, with a copy button. */
function PasswordReveal({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Password for {email}</DialogTitle>
          <DialogDescription>
            Give this to the user now. It is not shown again; if it is lost, set a new one. They can change it after
            signing in, from their Home page.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border bg-[#f9fafb] p-3">
          <code className="flex-1 font-mono text-[18px] font-semibold tracking-wide text-primary">{password}</code>
          <Button variant="outline" size="sm" onClick={async () => {
            try { await navigator.clipboard.writeText(password); toast.success("Password copied."); } catch { toast.error("Copy it by hand."); }
          }}>
            <Copy />Copy
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PasswordMode = "none" | "generate" | "set";

function PasswordChoice({ mode, setMode, password, setPassword, noneLabel }: {
  mode: PasswordMode; setMode: (m: PasswordMode) => void; password: string; setPassword: (v: string) => void; noneLabel: string;
}) {
  const options: { value: PasswordMode; label: string; hint: string }[] = [
    { value: "generate", label: "Generate a password", hint: "Shown once after saving, for you to hand over." },
    { value: "set", label: "Type a password", hint: "At least 8 characters, letters and numbers." },
    { value: "none", label: noneLabel, hint: "They sign in with their university Google account." },
  ];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[13px] font-semibold text-[#344054]">Email and password sign-in</legend>
      {options.map((o) => (
        <label key={o.value} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-[13px] ${mode === o.value ? "border-primary bg-secondary" : ""}`}>
          <input type="radio" name="password-mode" className="mt-0.5 accent-[var(--primary)]" checked={mode === o.value} onChange={() => setMode(o.value)} />
          <span>
            <span className="block font-semibold text-primary">{o.label}</span>
            <span className="block text-xs text-muted-foreground">{o.hint}</span>
          </span>
        </label>
      ))}
      {mode === "set" && (
        <Input aria-label="New password" type="text" autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
      )}
    </fieldset>
  );
}

function AddUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const empty = { name: "", email: "", department: "", isAdmin: false };
  const [form, setForm] = useState(empty);
  const [mode, setMode] = useState<PasswordMode>("generate");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState<{ email: string; password: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button><Plus />Register user</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register a user</DialogTitle>
            <DialogDescription>
              Create an account with a department and role. Give it a password to allow email and password sign-in;
              every university account can also sign in with Google.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await saveUser({ ...form, passwordMode: mode, password });
                if (!result.ok) return void toast.error(result.error);
                toast.success("User registered.");
                setOpen(false);
                if (result.password) setReveal({ email: form.email.trim().toLowerCase(), password: result.password });
                setForm(empty);
                setPassword("");
                setMode("generate");
                router.refresh();
              });
            }}
          >
            <Field label="Full name" required>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="University email" required>
              <Input required type="email" placeholder="name@jainuniversity.ac.in" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Department">
              <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="">Let them choose at first sign-in</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <PasswordChoice mode={mode} setMode={setMode} password={password} setPassword={setPassword} noneLabel="No password (Google only)" />
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3 text-[13px]">
              <span>
                <span className="block font-semibold">Admin access</span>
                <span className="block text-xs text-muted-foreground">Can see every submission and change settings.</span>
              </span>
              <Switch checked={form.isAdmin} onCheckedChange={(isAdmin) => setForm({ ...form, isAdmin })} />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />}Register user</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {reveal && <PasswordReveal {...reveal} onClose={() => setReveal(null)} />}
    </>
  );
}

function PasswordDialog({ user }: { user: PortalUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PasswordMode>("generate");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await setUserPassword(user.email, mode === "set" ? password : "", mode === "none");
      if (!result.ok) return void toast.error(result.error);
      toast.success(mode === "none" ? "Password removed; Google sign-in only." : "Password updated.");
      setOpen(false);
      setPassword("");
      if (result.password) setReveal(result.password);
      router.refresh();
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title={user.has_password ? "Reset password" : "Set a password"} aria-label={`${user.has_password ? "Reset" : "Set"} password for ${user.email}`}>
            <KeyRound />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{user.has_password ? "Reset password" : "Set a password"}</DialogTitle>
            <DialogDescription>
              For {user.name || user.email}. {user.locked ? "This account is locked after wrong attempts; saving a new password unlocks it." : ""}
            </DialogDescription>
          </DialogHeader>
          <PasswordChoice mode={mode} setMode={setMode} password={password} setPassword={setPassword}
            noneLabel={user.has_password ? "Remove the password (Google only)" : "Keep Google only"} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={pending || (mode === "none" && !user.has_password)} onClick={save}>
              {pending && <Loader2 className="animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {reveal && <PasswordReveal email={user.email} password={reveal} onClose={() => setReveal(null)} />}
    </>
  );
}

export function UsersAdmin({ users, currentEmail, fixedAdmins }: { users: PortalUser[]; currentEmail: string; fixedAdmins: string[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const { pending, run } = useAction();
  const [viewing, startView] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (role && (role === "admin") !== u.is_admin) return false;
      return !q || [u.name, u.email, u.department].some((v) => v.toLowerCase().includes(q));
    });
  }, [users, query, role]);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <SearchBox value={query} onChange={setQuery} placeholder="Search name, email or department" />
        <Select aria-label="Role" className="w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} of {users.length}</span>
        <span className="ml-auto"><AddUserDialog /></span>
      </div>
      <Table>
        <THead>
          <tr>
            <TH>User</TH><TH>Department</TH><TH>Sign-in</TH><TH>Last sign-in</TH>
            {MODULE_KEYS.map((k) => <TH key={k}>{MODULES[k].short}</TH>)}
            <TH>Late access</TH><TH>Admin</TH><TH className="text-right">Actions</TH>
          </tr>
        </THead>
        <TBody>
          {filtered.map((u) => {
            const self = u.email === currentEmail;
            const fixed = fixedAdmins.includes(u.email);
            const late = MODULE_KEYS.filter((k) => u[MODULES[k].overrideField]);
            return (
              <TR key={u._id}>
                <TD>
                  <span className="font-semibold">{u.name || "—"}</span>
                  <span className="block text-xs text-muted-foreground">{u.email}</span>
                </TD>
                <TD className="min-w-40 max-w-52 text-[13px]">{u.department || <span className="text-muted-foreground">Not set</span>}</TD>
                <TD>
                  <span className="flex flex-col items-start gap-1">
                    {u.has_password ? <Badge>Password</Badge> : null}
                    <Badge variant="muted">Google</Badge>
                    {u.locked && <Badge variant="destructive">Locked</Badge>}
                  </span>
                </TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">{u.last_login ? formatDateTime(u.last_login) : "Never"}</TD>
                {MODULE_KEYS.map((k) => (
                  <TD key={k}>
                    <Switch aria-label={`${MODULES[k].label} access for ${u.email}`} checked={u.is_admin || u[MODULES[k].permissionField]} disabled={pending || u.is_admin}
                      onCheckedChange={(v) => run(() => setUserPermission(u.email, k, v), "Access updated.")} />
                  </TD>
                ))}
                <TD>
                  {late.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                    <span className="flex flex-wrap gap-1">
                      {late.map((k) => (
                        <button key={k} type="button" disabled={pending} title={`Remove late access to ${MODULES[k].label}`}
                          className="inline-flex items-center gap-1 rounded-sm bg-success-soft px-1.5 py-0.5 text-[11px] font-semibold uppercase text-success hover:bg-destructive-soft hover:text-destructive"
                          onClick={() => run(() => revokeAccess(u.email, k), "Late access removed.")}>
                          {MODULES[k].short}<X className="size-3" />
                        </button>
                      ))}
                    </span>
                  )}
                </TD>
                <TD>
                  <Switch aria-label={`Admin access for ${u.email}`} checked={u.is_admin} disabled={pending || self || fixed}
                    onCheckedChange={(v) => run(() => setUserAdmin(u.email, v), v ? "Admin access granted." : "Admin access removed.")} />
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <PasswordDialog user={u} />
                    <Button variant="outline" size="icon" aria-label={`View the portal as ${u.email}`} disabled={self || viewing} title="View the portal as this user"
                      onClick={() => startView(async () => {
                        const result = await impersonate(u.email);
                        if (result && !result.ok) toast.error(result.error);
                      })}>
                      <UserRound />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${u.email}`} title="Delete user" disabled={pending || self}
                      onClick={() => {
                        if (!window.confirm(`Delete the account for ${u.email}? Their submissions are kept. They can sign in again with Google, which creates a new account.`)) return;
                        run(() => deleteUser(u._id), "User deleted.");
                      }}>
                      <Trash2 />
                    </Button>
                  </div>
                </TD>
              </TR>
            );
          })}
          {filtered.length === 0 && <EmptyRow colSpan={10}>No users match this search.</EmptyRow>}
        </TBody>
      </Table>
    </Card>
  );
}

// ── Requests ────────────────────────────────────────────────────────

function ApproveAccessDialog({ request }: { request: AccessRequest }) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const { pending, run } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Check />Approve</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve late access</DialogTitle>
          <DialogDescription>
            {request.user_name || request.user_email} will be able to submit {request.module} after the deadline. They are told by email.
          </DialogDescription>
        </DialogHeader>
        <Textarea aria-label="Remarks" rows={3} placeholder="Remarks for the requester (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={pending} onClick={() => run(() => approveAccess(request._id, comment), "Late access approved.", () => setOpen(false))}>
            {pending && <Loader2 className="animate-spin" />}Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RequestsAdmin({ access, edits }: { access: AccessRequest[]; edits: Submission[] }) {
  const { pending, run } = useAction();
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Late-submission access ({access.filter((r) => r.status === "pending").length} pending)</CardTitle>
          <CardDescription>Approving lets the person submit that module after its deadline. Revoking removes it again.</CardDescription>
        </CardHeader>
        <Table>
          <THead><tr><TH>Requested by</TH><TH>Module</TH><TH>Reason</TH><TH>Status</TH><TH>Requested</TH><TH className="text-right">Actions</TH></tr></THead>
          <TBody>
            {access.map((r) => (
              <TR key={r._id}>
                <TD><span className="font-semibold">{r.user_name || "—"}</span><span className="block text-xs text-muted-foreground">{r.user_email}</span></TD>
                <TD>{r.module}</TD>
                <TD className="max-w-md">{r.comment || "—"}{r.admin_comment && <span className="block text-xs text-muted-foreground">Admin: {r.admin_comment}</span>}</TD>
                <TD><Badge variant={r.status === "approved" ? "success" : "warning"}>{r.status}</Badge></TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.timestamp)}</TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    {r.status !== "approved" && r.module_key && <ApproveAccessDialog request={r} />}
                    {r.module_key && (
                      <Button variant="outline" size="sm" disabled={pending}
                        onClick={() => run(() => revokeAccess(r.user_email, r.module_key), r.status === "approved" ? "Late access revoked." : "Request declined.")}>
                        <Undo2 />{r.status === "approved" ? "Revoke" : "Decline"}
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
            {access.length === 0 && <EmptyRow colSpan={6}>No late-access requests.</EmptyRow>}
          </TBody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit approvals ({edits.filter((s) => s.edit_request?.status === "pending").length} pending)</CardTitle>
          <CardDescription>Requests to change a submitted form after the free edits are used. Each approval allows one more edit.</CardDescription>
        </CardHeader>
        <Table>
          <THead><tr><TH>Submission</TH><TH>Requested by</TH><TH>Reason</TH><TH className="text-right">Edits used</TH><TH>Status</TH><TH>Requested</TH><TH className="text-right">Actions</TH></tr></THead>
          <TBody>
            {edits.map((s) => (
              <TR key={s._id}>
                <TD>
                  <Link href={`/${s.form_type}/form/${s._id}`} className="font-semibold text-primary hover:underline">{s.identity.dept || "Untitled"}</Link>
                  <span className="block text-xs text-muted-foreground">{MODULES[s.form_type].label} · {s.identity.semester}</span>
                </TD>
                <TD>{s.identity.submitterName || "—"}<span className="block text-xs text-muted-foreground">{s.identity.submitterEmail}</span></TD>
                <TD className="max-w-md">{s.edit_request?.comment || "—"}</TD>
                <TD className="text-right tabular-nums">{s.edit_count}</TD>
                <TD><Badge variant={s.edit_request?.status === "approved" ? "success" : "warning"}>{s.edit_request?.status}</Badge></TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(s.edit_request?.timestamp)}</TD>
                <TD className="text-right">
                  {s.edit_request?.status === "pending" && (
                    <Button size="sm" disabled={pending} onClick={() => run(() => approveEdit(s._id), "Edit approved.")}><Check />Approve</Button>
                  )}
                </TD>
              </TR>
            ))}
            {edits.length === 0 && <EmptyRow colSpan={7}>No edit requests.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
    </>
  );
}

// ── Notifications and reminders ─────────────────────────────────────

export function NotificationsAdmin({
  notifications, mailEnabled, cronEnabled,
}: { notifications: PortalNotification[]; mailEnabled: boolean; cronEnabled: boolean }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all_pending");
  const [department, setDepartment] = useState("");
  const { pending, run } = useAction();
  const [sending, startSending] = useTransition();

  function remind() {
    if (target === "specific_dept" && !department) return void toast.error("Choose a department.");
    if (!window.confirm("Send reminder emails now to everyone in this group whose submission is pending?")) return;
    startSending(async () => {
      const result = await sendReminders(target, department);
      if (!result.ok) return void toast.error(result.error);
      toast.success(result.sent === 0 ? "No one in this group has a pending submission." : `${result.sent} reminder email(s) sent.`);
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Post an announcement</CardTitle>
          <CardDescription>Appears in every user&apos;s notification bell and on their dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field label="Title" required><Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Message" required><Textarea rows={3} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} /></Field>
          <div>
            <Button disabled={pending} onClick={() => run(() => sendNotification(title, body), "Announcement posted.", () => { setTitle(""); setBody(""); })}>
              {pending ? <Loader2 className="animate-spin" /> : <Send />}Post announcement
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email reminders</CardTitle>
          <CardDescription>Emails people who have not yet made a final submission. Those who have submitted are skipped.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!mailEnabled && <Notice tone="warning" title="Email is not set up">Set EMAIL_USER and EMAIL_PASS in the server&apos;s .env to send reminders.</Notice>}
          <Field label="Send to">
            <Select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="all_pending">Everyone with any pending module</option>
              {MODULE_KEYS.map((k) => <option key={k} value={`pending_${k}`}>Pending: {MODULES[k].label}</option>)}
              <option value="specific_dept">One department</option>
            </Select>
          </Field>
          {target === "specific_dept" && (
            <Field label="Department" required>
              <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </Select>
            </Field>
          )}
          <div>
            <Button variant="secondary" disabled={sending || !mailEnabled} onClick={remind}>
              {sending ? <Loader2 className="animate-spin" /> : <Mail />}Send reminders now
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Automatic reminders (2 days and 1 hour before each deadline) are {cronEnabled ? "enabled, provided the server's scheduled job is running" : "off: set CRON_SECRET and add the scheduled job described in the README"}.
          </p>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader><CardTitle>Posted announcements</CardTitle></CardHeader>
        <Table>
          <THead><tr><TH>Title</TH><TH>Message</TH><TH>Type</TH><TH>Posted</TH><TH className="text-right">Actions</TH></tr></THead>
          <TBody>
            {notifications.map((n) => (
              <TR key={n._id}>
                <TD className="font-semibold">{n.title}</TD>
                <TD className="max-w-xl">{n.body}</TD>
                <TD><Badge variant={n.type === "broadcast" ? "muted" : "default"}>{n.type === "broadcast" ? "Automatic" : "Manual"}</Badge></TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(n.created_at)}</TD>
                <TD className="text-right">
                  <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete announcement" disabled={pending}
                    onClick={() => run(() => deleteNotification(n._id), "Announcement deleted.")}><Trash2 /></Button>
                </TD>
              </TR>
            ))}
            {notifications.length === 0 && <EmptyRow colSpan={5}>No announcements posted.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

// ── Settings ────────────────────────────────────────────────────────

export function SettingsAdmin({ settings }: { settings: GlobalSettings }) {
  const [form, setForm] = useState({
    readiness_enabled: settings.readiness_enabled,
    closure_enabled: settings.closure_enabled,
    iea_enabled: settings.iea_enabled,
    readiness_deadline: settings.readiness_deadline,
    closure_deadline: settings.closure_deadline,
    iea_deadline: settings.iea_deadline,
    enabled_years: settings.enabled_years,
    enabled_semesters: settings.enabled_semesters,
  });
  const [newYear, setNewYear] = useState("");
  const { pending, run } = useAction();

  function addYear() {
    const year = newYear.trim();
    if (!/^\d{4}-\d{2}$/.test(year)) return void toast.error("Use the format 2026-27.");
    if (!form.enabled_years.includes(year)) setForm({ ...form, enabled_years: [...form.enabled_years, year].sort() });
    setNewYear("");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Modules and deadlines</CardTitle>
          <CardDescription>
            A module that is switched off is hidden from everyone except admins. After a deadline, only people with approved late access can submit. Times are India time (IST).
          </CardDescription>
        </CardHeader>
        <Table>
          <THead><tr><TH>Module</TH><TH>Open</TH><TH>Deadline (IST)</TH><TH className="text-right">Clear</TH></tr></THead>
          <TBody>
            {MODULE_KEYS.map((key) => {
              const meta = MODULES[key];
              return (
                <TR key={key}>
                  <TD><span className="font-semibold text-primary">{meta.label}</span><span className="block text-xs text-muted-foreground">{meta.description}</span></TD>
                  <TD><Switch aria-label={`${meta.label} open`} checked={form[meta.enabledKey]} onCheckedChange={(v) => setForm({ ...form, [meta.enabledKey]: v })} /></TD>
                  <TD>
                    <Input type="datetime-local" aria-label={`${meta.label} deadline`} className="w-56" value={form[meta.deadlineKey]}
                      onChange={(e) => setForm({ ...form, [meta.deadlineKey]: e.target.value.slice(0, 16) })} />
                  </TD>
                  <TD className="text-right">
                    <Button variant="ghost" size="sm" disabled={!form[meta.deadlineKey]} onClick={() => setForm({ ...form, [meta.deadlineKey]: "" })}>No deadline</Button>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Semesters offered in forms</CardTitle>
          <CardDescription>These fill the Semester and Academic year lists on the readiness and closure forms.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-foreground/80">Academic years</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {form.enabled_years.map((year) => (
                <li key={year} className="inline-flex items-center gap-1 rounded-sm border bg-secondary py-0.5 pl-2 pr-1 text-[13px] font-medium text-primary">
                  {year}
                  <button type="button" aria-label={`Remove ${year}`} className="rounded-sm p-0.5 hover:bg-primary/10"
                    onClick={() => setForm({ ...form, enabled_years: form.enabled_years.filter((y) => y !== year) })}>
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input aria-label="Add academic year" placeholder="2028-29" className="w-32" value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addYear(); } }} />
              <Button type="button" variant="secondary" onClick={addYear}><Plus />Add year</Button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/80">Semesters</p>
            <div className="mt-2 flex gap-5">
              {["Even", "Odd"].map((sem) => (
                <label key={sem} className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={form.enabled_semesters.includes(sem)}
                    onChange={(e) => setForm({
                      ...form,
                      enabled_semesters: e.target.checked ? [...form.enabled_semesters, sem] : form.enabled_semesters.filter((s) => s !== sem),
                    })} />
                  {sem}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button disabled={pending}
          onClick={() => run(() => saveSettings({ ...form, enabled_semesters: form.enabled_semesters as ("Even" | "Odd")[] }), "Settings saved.")}>
          {pending && <Loader2 className="animate-spin" />}
          Save settings
        </Button>
      </div>
    </div>
  );
}
