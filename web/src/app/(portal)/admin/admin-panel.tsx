"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, LayoutDashboard, ListChecks, Loader2, Plus, Search, Settings, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { deleteUser, saveSettings, saveUser, setUserAdmin, setUserPermissions } from "@/app/actions/admin";
import { deleteSubmission } from "@/app/actions/submissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEPARTMENTS, MODULES, MODULE_KEYS, type ModuleKey } from "@/lib/constants";
import type { ActionResult, GlobalSettings, PortalUser, Submission } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

type Props = {
  currentEmail: string;
  settings: GlobalSettings;
  submissions: Submission[];
  users: PortalUser[];
  fixedAdmins: string[];
};

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

export function AdminPanel(props: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Submissions from every department, users and portal settings.</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/api/admin/export-all" download>
            <Download />
            Export everything (Excel)
          </a>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><LayoutDashboard />Overview</TabsTrigger>
          <TabsTrigger value="submissions"><ListChecks />Submissions</TabsTrigger>
          <TabsTrigger value="users"><Users />Users</TabsTrigger>
          <TabsTrigger value="settings"><Settings />Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><Overview {...props} /></TabsContent>
        <TabsContent value="submissions"><Submissions {...props} /></TabsContent>
        <TabsContent value="users"><UsersTab {...props} /></TabsContent>
        <TabsContent value="settings"><SettingsTab {...props} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────────────

function Overview({ submissions, users }: Props) {
  const final = submissions.filter((s) => !s._draft);
  const stats = [
    { label: "Readiness submitted", value: final.filter((s) => s.form_type === "readiness").length },
    { label: "Closure submitted", value: final.filter((s) => s.form_type === "closure").length },
    { label: "Drafts in progress", value: submissions.length - final.length },
    { label: "Faculty responses", value: submissions.reduce((sum, s) => sum + (s.faculty_submission_count ?? 0), 0) },
    { label: "Registered users", value: users.length },
  ];

  // Latest submission per department and module (the list is newest first).
  const coverage = useMemo(() => {
    const map = new Map<string, Partial<Record<ModuleKey, Submission>>>();
    for (const sub of submissions) {
      const dept = sub.identity.dept;
      if (!dept) continue;
      const row = map.get(dept) ?? {};
      const existing = row[sub.form_type];
      // Prefer a final submission over a newer draft.
      if (!existing || (existing._draft && !sub._draft)) row[sub.form_type] = sub;
      map.set(dept, row);
    }
    return map;
  }, [submissions]);
  const departments = [...new Set([...DEPARTMENTS, ...coverage.keys()])];

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 text-3xl font-semibold text-primary">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>Department status</CardTitle>
          <CardDescription>The latest submission from each department, per module.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-0">
          <Table>
            <THead>
              <tr>
                <TH>Department</TH>
                {MODULE_KEYS.map((key) => <TH key={key}>{MODULES[key].label}</TH>)}
              </tr>
            </THead>
            <TBody>
              {departments.map((dept) => (
                <TR key={dept}>
                  <TD className="font-medium">{dept}</TD>
                  {MODULE_KEYS.map((key) => {
                    const sub = coverage.get(dept)?.[key];
                    return (
                      <TD key={key}>
                        {sub ? (
                          <Link href={`/${key}/form/${sub._id}`} className="inline-flex items-center gap-2 hover:underline">
                            <Badge variant={sub._draft ? "warning" : "success"}>{sub._draft ? "Draft" : "Submitted"}</Badge>
                            <span className="text-xs text-muted-foreground">{sub.identity.semester} · {formatDate(sub.timestamp)}</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not started</span>
                        )}
                      </TD>
                    );
                  })}
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Submissions ─────────────────────────────────────────────────────

function Submissions({ submissions }: Props) {
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("");
  const [status, setStatus] = useState("");
  const { pending, run } = useAction();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions.filter((s) => {
      if (module && s.form_type !== module) return false;
      if (status && (status === "draft") !== s._draft) return false;
      if (!q) return true;
      const i = s.identity;
      return [i.dept, i.campus, i.hodName, i.hodEmail, i.semester, i.submitterEmail].some((v) => v.toLowerCase().includes(q));
    });
  }, [submissions, query, module, status]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input aria-label="Search submissions" placeholder="Search department, HOD, semester or email" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select aria-label="Module" className="md:w-48" value={module} onChange={(e) => setModule(e.target.value)}>
            <option value="">All modules</option>
            {MODULE_KEYS.map((key) => <option key={key} value={key}>{MODULES[key].label}</option>)}
          </Select>
          <Select aria-label="Status" className="md:w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>
            <option value="final">Submitted</option>
            <option value="draft">Draft</option>
          </Select>
        </div>
        <CardDescription>{filtered.length} of {submissions.length} submissions</CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-0">
        <Table>
          <THead>
            <tr>
              <TH>Department</TH><TH>Module</TH><TH>Semester</TH><TH>HOD</TH><TH>Status</TH><TH>Faculty</TH><TH>Updated</TH><TH><span className="sr-only">Actions</span></TH>
            </tr>
          </THead>
          <TBody>
            {filtered.map((s) => (
              <TR key={s._id}>
                <TD>
                  <Link href={`/${s.form_type}/form/${s._id}`} className="font-medium hover:underline">{s.identity.dept || "Untitled"}</Link>
                  <span className="block text-xs text-muted-foreground">{s.identity.campus}</span>
                </TD>
                <TD>{MODULES[s.form_type].short}</TD>
                <TD className="whitespace-nowrap">{s.identity.semester || "—"}</TD>
                <TD>
                  {s.identity.hodName || "—"}
                  <span className="block text-xs text-muted-foreground">{s.identity.submitterEmail}</span>
                </TD>
                <TD><Badge variant={s._draft ? "warning" : "success"}>{s._draft ? "Draft" : "Submitted"}</Badge></TD>
                <TD className="tabular-nums">{s.faculty_submission_count ?? 0}</TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(s.timestamp)}</TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-8" asChild>
                      <a href={`/api/export/${s._id}`} aria-label="Download Excel"><Download /></a>
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Delete submission" disabled={pending}
                      onClick={() => {
                        if (!window.confirm(`Delete the ${MODULES[s.form_type].label} submission from ${s.identity.dept || "this department"} and its faculty responses? This cannot be undone.`)) return;
                        run(() => deleteSubmission(s._id), "Submission deleted.");
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
            {filtered.length === 0 && (
              <TR><TD colSpan={8} className="py-10 text-center text-muted-foreground">No submissions match these filters.</TD></TR>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Users ───────────────────────────────────────────────────────────

function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", department: "", isAdmin: false });
  const { pending, run } = useAction();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus />Add user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
          <DialogDescription>
            Set a person&apos;s department and role before they first sign in with Google. Anyone with a university
            account can also sign in without being added here.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => saveUser(form), "User saved.", () => {
              setOpen(false);
              setForm({ name: "", email: "", department: "", isAdmin: false });
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
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
            <span>
              <span className="block font-medium">Admin access</span>
              <span className="block text-xs text-muted-foreground">Can see every submission and change settings.</span>
            </span>
            <Switch checked={form.isAdmin} onCheckedChange={(isAdmin) => setForm({ ...form, isAdmin })} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />}Save user</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UsersTab({ users, currentEmail, fixedAdmins }: Props) {
  const [query, setQuery] = useState("");
  const { pending, run } = useAction();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? users.filter((u) => [u.name, u.email, u.department].some((v) => v.toLowerCase().includes(q))) : users;
  }, [users, query]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input aria-label="Search users" placeholder="Search name, email or department" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <AddUserDialog />
        </div>
        <CardDescription>{filtered.length} of {users.length} users. Switch a module off to stop that person using it.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-0">
        <Table>
          <THead>
            <tr><TH>User</TH><TH>Department</TH><TH>Last sign-in</TH><TH>Readiness</TH><TH>Closure</TH><TH>Admin</TH><TH><span className="sr-only">Actions</span></TH></tr>
          </THead>
          <TBody>
            {filtered.map((u) => {
              const self = u.email === currentEmail;
              const fixed = fixedAdmins.includes(u.email);
              return (
                <TR key={u._id}>
                  <TD>
                    <span className="font-medium">{u.name || "—"}</span>
                    <span className="block text-xs text-muted-foreground">{u.email}</span>
                  </TD>
                  <TD className="max-w-56 text-sm">{u.department || <span className="text-muted-foreground">Not set</span>}</TD>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">{u.last_login ? formatDateTime(u.last_login) : "Never"}</TD>
                  <TD>
                    <Switch aria-label={`Readiness access for ${u.email}`} checked={u.is_admin || u.can_readiness} disabled={pending || u.is_admin}
                      onCheckedChange={(v) => run(() => setUserPermissions(u.email, { can_readiness: v, can_closure: u.can_closure }), "Access updated.")} />
                  </TD>
                  <TD>
                    <Switch aria-label={`Closure access for ${u.email}`} checked={u.is_admin || u.can_closure} disabled={pending || u.is_admin}
                      onCheckedChange={(v) => run(() => setUserPermissions(u.email, { can_readiness: u.can_readiness, can_closure: v }), "Access updated.")} />
                  </TD>
                  <TD>
                    <Switch aria-label={`Admin access for ${u.email}`} checked={u.is_admin} disabled={pending || self || fixed}
                      onCheckedChange={(v) => run(() => setUserAdmin(u.email, v), v ? "Admin access granted." : "Admin access removed.")} />
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={`Delete ${u.email}`} disabled={pending || self}
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
            {filtered.length === 0 && (
              <TR><TD colSpan={7} className="py-10 text-center text-muted-foreground">No users match this search.</TD></TR>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Settings ────────────────────────────────────────────────────────

function SettingsTab({ settings }: Props) {
  const [form, setForm] = useState({
    readiness_enabled: settings.readiness_enabled,
    closure_enabled: settings.closure_enabled,
    enabled_years: settings.enabled_years,
    enabled_semesters: settings.enabled_semesters,
  });
  const [newYear, setNewYear] = useState("");
  const { pending, run } = useAction();

  function addYear() {
    const year = newYear.trim();
    if (!/^\d{4}-\d{2}$/.test(year)) return void toast.error("Use the format 2026-27.");
    if (!form.enabled_years.includes(year)) {
      setForm({ ...form, enabled_years: [...form.enabled_years, year].sort() });
    }
    setNewYear("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <CardDescription>A module that is switched off is hidden from everyone except admins.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {MODULE_KEYS.map((key) => {
            const field = MODULES[key].enabledKey;
            return (
              <label key={key} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <span>
                  <span className="block font-medium">{MODULES[key].label}</span>
                  <span className="block text-xs text-muted-foreground">{form[field] ? "Open for submissions" : "Closed"}</span>
                </span>
                <Switch checked={form[field]} onCheckedChange={(v) => setForm({ ...form, [field]: v })} />
              </label>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Semesters offered in forms</CardTitle>
          <CardDescription>These fill the Semester and Academic year lists on both forms.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-medium">Academic years</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {form.enabled_years.map((year) => (
                <li key={year} className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1.5 text-sm font-medium text-primary">
                  {year}
                  <button type="button" aria-label={`Remove ${year}`} className="rounded-full p-0.5 hover:bg-primary/10"
                    onClick={() => setForm({ ...form, enabled_years: form.enabled_years.filter((y) => y !== year) })}>
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input aria-label="Add academic year" placeholder="2028-29" className="w-36" value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addYear(); } }} />
              <Button type="button" variant="secondary" onClick={addYear}><Plus />Add year</Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Semesters</p>
            <div className="mt-2 flex gap-5">
              {["Even", "Odd"].map((sem) => (
                <label key={sem} className="flex items-center gap-2 text-sm">
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

      <div className="lg:col-span-2">
        <Button disabled={pending}
          onClick={() => run(() => saveSettings({ ...form, enabled_semesters: form.enabled_semesters as ("Even" | "Odd")[] }), "Settings saved.")}>
          {pending && <Loader2 className="animate-spin" />}
          Save settings
        </Button>
      </div>
    </div>
  );
}
