"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, History, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { submitFacultyChecklist } from "@/app/actions/faculty";
import { ChecklistEditor } from "@/components/checklist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import type { ChecklistSection } from "@/lib/constants";
import type { Checklist } from "@/lib/types";
import type { Prefill } from "@/lib/faculty-prefill";

type Course = { key: number; courseName: string; courseCode: string; program: string; yearSem: string; noOfStudents: string };

const blankCourse = (key: number): Course => ({ key, courseName: "", courseCode: "", program: "", yearSem: "", noOfStudents: "" });

const toCourses = (prefill: Prefill): Course[] =>
  prefill.courses.length ? prefill.courses.map((c, i) => ({ key: i + 1, ...c })) : [blankCourse(1)];

/** Keep only answers to items this checklist asks. */
function knownAnswers(checklist: Checklist | null, sections: ChecklistSection[]): Checklist {
  if (!checklist) return {};
  const ids = new Set(sections.flatMap((s) => s.items.map((i) => i.id)));
  return Object.fromEntries(Object.entries(checklist).filter(([id]) => ids.has(id)));
}

export function FacultyForm({
  shareToken,
  sections,
  moduleLabel,
  account = null,
  current = null,
  previous = null,
}: {
  shareToken: string;
  sections: ChecklistSection[];
  moduleLabel: string;
  /** Signed in: name and email come from the account. */
  account?: { name: string; email: string } | null;
  /** What this person already sent for this link (they are editing it). */
  current?: Prefill | null;
  /** Their latest response to an earlier link, offered as a starting point. */
  previous?: Prefill | null;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [courses, setCourses] = useState<Course[]>(current ? toCourses(current) : [blankCourse(1)]);
  const [checklist, setChecklist] = useState<Checklist>(current ? knownAnswers(current.checklist, sections) : {});
  const [usedPrevious, setUsedPrevious] = useState(false);
  const [done, setDone] = useState(0);
  const [pending, startTransition] = useTransition();

  const updateCourse = (key: number, patch: Partial<Course>) =>
    setCourses((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const items = sections.flatMap((s) => s.items);
    const unanswered = items.filter((i) => !checklist[i.id]?.status).length;
    if (unanswered > 0 && !window.confirm(`${unanswered} checklist item(s) are not answered. Submit anyway?`)) return;

    startTransition(async () => {
      const result = await submitFacultyChecklist({
        shareToken,
        facultyName: name,
        facultyEmail: email,
        courses: courses.map(({ courseName, courseCode, program, yearSem, noOfStudents }) => ({
          courseName, courseCode, program, yearSem, noOfStudents,
        })),
        checklist,
      });
      if (!result.ok) return void toast.error(result.error);
      setDone(result.saved);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (done > 0) {
    return (
      <div className="mt-6 rounded-xl border bg-card p-10 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h2 className="mt-4 text-xl font-semibold">Checklist submitted</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Thank you, {name}. Your {moduleLabel.toLowerCase()} checklist for {done} course{done > 1 ? "s" : ""} has been
          shared with your HOD. To change an answer, open the same link and submit again with the same email and course code.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setCourses([blankCourse(Date.now())]);
            setChecklist({});
            setDone(0);
          }}
        >
          Submit for another course
        </Button>
      </div>
    );
  }

  function fillFromPrevious() {
    if (!previous) return;
    setCourses(toCourses(previous));
    if (previous.checklist) setChecklist(knownAnswers(previous.checklist, sections));
    setUsedPrevious(true);
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      {current ? (
        <div className="rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-[13.5px] text-foreground">
          <strong className="text-success">Already submitted.</strong> Your {current.label} is loaded below. Submitting again replaces it.
        </div>
      ) : previous ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
          <span className="text-[13.5px] text-foreground">
            {usedPrevious ? (
              <>Filled from your previous response, <strong>{previous.label}</strong>. Check each answer before you submit.</>
            ) : (
              <>Start from your previous response, <strong>{previous.label}</strong>{previous.checklist ? "" : " (courses only; it was a different checklist)"}?</>
            )}
          </span>
          {!usedPrevious && (
            <Button type="button" variant="outline" size="sm" onClick={fillFromPrevious}>
              <History /> Fill from previous
            </Button>
          )}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {account ? (
            <>
              <Field label="Full name">
                <Input value={name} readOnly />
              </Field>
              <Field label="Email">
                <Input value={email} readOnly />
              </Field>
            </>
          ) : (
            <>
              <Field label="Full name" required>
                <Input required value={name} placeholder="Dr. / Prof. your name" autoComplete="name" onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Email" required>
                <Input required type="email" value={email} placeholder="you@jainuniversity.ac.in" autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Courses</CardTitle>
          <CardDescription>Add every course this checklist applies to. The same answers are recorded for each.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {courses.map((course, index) => (
            <fieldset key={course.key} className="rounded-lg border p-4">
              <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
                Course {index + 1}
                {courses.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove course ${index + 1}`}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                    onClick={() => setCourses((prev) => prev.filter((c) => c.key !== course.key))}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </legend>
              <div className="grid gap-4 sm:grid-cols-6">
                <Field label="Course name" required className="sm:col-span-4">
                  <Input required value={course.courseName} onChange={(e) => updateCourse(course.key, { courseName: e.target.value })} />
                </Field>
                <Field label="Course code" required className="sm:col-span-2">
                  <Input required value={course.courseCode} onChange={(e) => updateCourse(course.key, { courseCode: e.target.value })} />
                </Field>
                <Field label="Program" className="sm:col-span-2">
                  <Input value={course.program} placeholder="e.g. B.Tech CSE" onChange={(e) => updateCourse(course.key, { program: e.target.value })} />
                </Field>
                <Field label="Year / Semester" className="sm:col-span-2">
                  <Input value={course.yearSem} placeholder="e.g. II Year / Sem 3" onChange={(e) => updateCourse(course.key, { yearSem: e.target.value })} />
                </Field>
                <Field label="No. of students" className="sm:col-span-2">
                  <Input inputMode="numeric" value={course.noOfStudents} onChange={(e) => updateCourse(course.key, { noOfStudents: e.target.value })} />
                </Field>
              </div>
            </fieldset>
          ))}
          <div>
            <Button type="button" variant="secondary" size="sm" disabled={courses.length >= 20} onClick={() => setCourses((prev) => [...prev, blankCourse(Date.now())])}>
              <Plus />
              Add another course
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
          <CardDescription>Choose Yes, No or N/A for each item. Add a note or attach evidence where useful.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChecklistEditor sections={sections} value={checklist} onChange={setChecklist} shareToken={shareToken} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />}
          Submit checklist
        </Button>
      </div>
    </form>
  );
}
