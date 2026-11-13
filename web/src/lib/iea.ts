import "server-only";
import type { Document, Filter } from "mongodb";
import { collections } from "./db";
import { IEA_SECTIONS, IEA_YEARS } from "./constants";
import type { IeaEntry, IeaFeedback, IeaSubmission, IeaVersion, IeaYears } from "./types";
import { parseStamp, str } from "./utils";

/** Old documents sometimes used en/em dashes in year labels. */
export function normYear(year: unknown): string {
  return str(year).replace(/[–—]/g, "-").trim();
}

/** True only when an entry carries real content; an untouched card is not data. */
export function entryIsFilled(entry: unknown): boolean {
  if (!entry || typeof entry !== "object") return false;
  const e = entry as Record<string, unknown>;
  for (const [key, value] of Object.entries(e)) {
    if (key === "id" || key === "evidenceTypes" || key === "evidenceDetails") continue;
    if (typeof value === "string" && value.trim()) return true;
    if (typeof value === "number" && value) return true;
  }
  if (Array.isArray(e.evidenceTypes) && e.evidenceTypes.some((t) => str(t).trim())) return true;
  if (e.evidenceDetails && typeof e.evidenceDetails === "object") {
    for (const detail of Object.values(e.evidenceDetails as Record<string, unknown>)) {
      if (detail && typeof detail === "object" && Object.values(detail).some((v) => str(v).trim())) return true;
    }
  }
  return false;
}

function cleanEntry(raw: Record<string, unknown>, sectionKey: string): IeaEntry {
  const section = IEA_SECTIONS.find((s) => s.key === sectionKey)!;
  const entry: IeaEntry = {
    id: str(raw.id) || Math.random().toString(36).slice(2, 10),
    evidenceTypes: Array.isArray(raw.evidenceTypes) ? raw.evidenceTypes.map(str).filter(Boolean).slice(0, 20) : [],
    evidenceLink: str(raw.evidenceLink).slice(0, 2000),
    evidenceMissing: str(raw.evidenceMissing).slice(0, 4000),
    evidenceDetails: {},
  };
  for (const field of section.fields) entry[field.k] = str(raw[field.k]).slice(0, 20000);
  if (raw.evidenceDetails && typeof raw.evidenceDetails === "object") {
    for (const [type, detail] of Object.entries(raw.evidenceDetails as Record<string, unknown>)) {
      const d = (detail && typeof detail === "object" ? detail : {}) as Record<string, unknown>;
      entry.evidenceDetails[type.slice(0, 200)] = {
        fileUrl: str(d.fileUrl).slice(0, 500),
        fileName: str(d.fileName).slice(0, 300),
        driveLink: str(d.driveLink).slice(0, 2000),
        notes: str(d.notes).slice(0, 2000),
      };
    }
  }
  return entry;
}

/** Normalise a stored or submitted years object to the full year × section shape, dropping blank entries. */
export function mergeYears(raw: unknown): IeaYears {
  const base: IeaYears = Object.fromEntries(
    IEA_YEARS.map((year) => [year, Object.fromEntries(IEA_SECTIONS.map((s) => [s.key, [] as IeaEntry[]]))]),
  );
  if (!raw || typeof raw !== "object") return base;
  const byYear = new Map(Object.entries(raw as Record<string, unknown>).map(([k, v]) => [normYear(k), v]));
  for (const year of IEA_YEARS) {
    const data = byYear.get(normYear(year));
    if (!data || typeof data !== "object") continue;
    for (const section of IEA_SECTIONS) {
      const entries = (data as Record<string, unknown>)[section.key];
      if (!Array.isArray(entries)) continue;
      base[year][section.key] = entries
        .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === "object")
        .filter(entryIsFilled)
        .slice(0, 200)
        .map((e) => cleanEntry(e, section.key));
    }
  }
  return base;
}

export function countEntries(years: unknown): number {
  let n = 0;
  if (years && typeof years === "object") {
    for (const sections of Object.values(years as Record<string, unknown>)) {
      if (!sections || typeof sections !== "object") continue;
      for (const list of Object.values(sections as Record<string, unknown>)) {
        if (Array.isArray(list)) n += list.filter(entryIsFilled).length;
      }
    }
  }
  return n;
}

function versionTimeline(doc: Document): IeaVersion[] {
  const rows: IeaVersion[] = [];
  for (const h of Array.isArray(doc.history) ? doc.history : []) {
    if (!h || typeof h !== "object") continue;
    rows.push({
      version: Number(h.version) || 1,
      at: str(h.submittedAt) || str(h.lastUpdated),
      entries: countEntries(h.years),
      by: str(h.submitterName) || str(h.submitterEmail),
    });
  }
  if (doc.submitted) {
    rows.push({
      version: Number(doc.version) || 1,
      at: str(doc.submittedAt) || str(doc.lastUpdated),
      entries: countEntries(doc.years),
      by: str(doc.submitterName) || str(doc.submitterEmail),
      current: true,
    });
  }
  return rows.sort((a, b) => a.version - b.version);
}

export function normalizeIea(doc: Document): IeaSubmission {
  const years = mergeYears(doc.years);
  const yearCounts = Object.fromEntries(
    IEA_YEARS.map((year) => [year, IEA_SECTIONS.reduce((sum, s) => sum + years[year][s.key].length, 0)]),
  );
  const versions = versionTimeline(doc);
  return {
    _id: String(doc._id),
    school: str(doc.school),
    department: str(doc.department),
    level: str(doc.level),
    acYear: str(doc.acYear) || str(doc.ac_year) || "AY 2025-26",
    semester: str(doc.semester) || str(doc.sem) || "Odd Semester",
    years,
    yearCounts,
    totalEntries: Object.values(yearCounts).reduce((a, b) => a + b, 0),
    submitted: doc.submitted === true,
    version: doc.submitted ? Number(doc.version) || 1 : 0,
    submittedAt: str(doc.submittedAt),
    lastUpdated: str(doc.lastUpdated),
    createdAt: str(doc.createdAt) || versions.find((v) => v.at)?.at || str(doc.lastUpdated),
    submitterEmail: str(doc.submitterEmail).toLowerCase(),
    submitterName: str(doc.submitterName),
    versions,
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Emails were stored with mixed case by the old app; match them case-insensitively. */
export function ownerFilter(email: string): Filter<Document> {
  return { submitterEmail: { $regex: `^${escapeRegex(email)}$`, $options: "i" } };
}

const SORT = { school: 1, department: 1, level: 1 } as const;

/** IEA submissions are personal: each user sees only their own. */
export async function listMyIea(email: string): Promise<IeaSubmission[]> {
  return (await collections.iea().find(ownerFilter(email)).sort(SORT).toArray()).map(normalizeIea);
}

export async function listAllIea(filter: Filter<Document> = {}): Promise<IeaSubmission[]> {
  return (await collections.iea().find(filter).sort(SORT).toArray()).map(normalizeIea);
}

export async function findMyIea(email: string, school: string, department: string, level: string) {
  const doc = await collections.iea().findOne({ school, department, level, ...ownerFilter(email) });
  return doc ? normalizeIea(doc) : null;
}

export async function listIeaFeedback(): Promise<IeaFeedback[]> {
  const docs = await collections.ieaFeedback().find().sort({ createdAt: -1 }).toArray();
  return docs.map((doc) => ({
    _id: String(doc._id),
    like: str(doc.like),
    rating: Number(doc.rating) || 0,
    comments: str(doc.comments),
    submitterEmail: str(doc.submitterEmail),
    submitterName: str(doc.submitterName),
    createdAt: str(doc.createdAt),
  }));
}

/** Submissions saved or submitted within the last `hours`, newest first. */
export function recentIea(submissions: IeaSubmission[], hours = 48): IeaSubmission[] {
  const cutoff = Date.now() - hours * 3_600_000;
  return submissions
    .filter((s) => (parseStamp(s.lastUpdated)?.getTime() ?? 0) >= cutoff)
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
}
