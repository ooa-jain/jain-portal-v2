import "server-only";
import JSZip from "jszip";
import { docType } from "./constants";
import type { DocCheck } from "./types";

/**
 * The automatic first check on an uploaded document. It reads the file's
 * text (PDF text layer, Word, PowerPoint or Excel), then checks that the
 * text contains what this document type must contain and mentions the
 * course code. Scanned PDFs and photos have no text layer: they are
 * flagged for the HOD to check by eye rather than rejected.
 */

async function pdfText(data: Uint8Array): Promise<{ text: string; pages: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  // The PDF reader takes ownership of the buffer it is given: pass a copy so the caller can still save the file.
  const pdf = await getDocumentProxy(data.slice());
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { text: Array.isArray(text) ? text.join("\n") : text, pages: totalPages };
}

function xmlText(xml: string) {
  return xml.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ");
}

async function officeText(data: Uint8Array, ext: string): Promise<{ text: string; pages: number }> {
  const zip = await JSZip.loadAsync(data);
  const names = Object.keys(zip.files);
  let parts: string[] = [];
  let pages = 1;
  if (ext === ".docx") {
    parts = names.filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n));
  } else if (ext === ".pptx") {
    parts = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    pages = parts.length;
  } else if (ext === ".xlsx") {
    parts = names.filter((n) => n === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
    pages = names.filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).length;
  }
  const texts = await Promise.all(parts.slice(0, 400).map((n) => zip.file(n)!.async("string").then(xmlText)));
  return { text: texts.join("\n"), pages };
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

export async function checkDocument(
  data: Uint8Array,
  ext: string,
  typeKey: string,
  courseCode: string,
): Promise<DocCheck> {
  const notes: string[] = [];
  let text = "";
  let pages = 0;
  let unreadable = false;

  try {
    if (ext === ".pdf") ({ text, pages } = await pdfText(data));
    else if ([".docx", ".pptx", ".xlsx"].includes(ext)) ({ text, pages } = await officeText(data, ext));
    else unreadable = true; // images
  } catch (error) {
    console.error("[doc-check] could not read file:", error);
    return {
      status: "failed",
      notes: ["The file could not be opened. It may be damaged or password-protected. Save it again and re-upload."],
      pages: 0,
      textChars: 0,
      courseCodeFound: false,
    };
  }

  const clean = norm(text);
  const chars = clean.replace(/\s/g, "").length;
  // A scanned PDF has pages but almost no text layer.
  if (!unreadable && ext === ".pdf" && pages > 0 && chars < 40 * pages) unreadable = true;

  if (unreadable) {
    notes.push(
      ext === ".pdf"
        ? "This looks like a scanned PDF (no readable text), so its contents could not be checked automatically. The HOD will check it by eye."
        : "Images cannot be checked automatically yet. The HOD will check it by eye; a PDF or Word file is preferred.",
    );
    return { status: "warnings", notes, pages, textChars: chars, courseCodeFound: false };
  }

  if (chars < 60) {
    return {
      status: "failed",
      notes: ["The document is empty or almost empty. Upload the completed document."],
      pages,
      textChars: chars,
      courseCodeFound: false,
    };
  }

  const type = docType(typeKey);
  const missing = (type?.expect ?? []).filter((group) => !group.any.some((word) => clean.includes(word)));
  for (const group of missing) notes.push(`Could not find ${group.label} in the document.`);

  const code = norm(courseCode).replace(/\s/g, "");
  const courseCodeFound = Boolean(code) && clean.replace(/\s/g, "").includes(code);
  if (code && !courseCodeFound) notes.push(`The course code ${courseCode} does not appear in the document. Check that this is the right course.`);

  // Most of the expected content missing: very likely the wrong document.
  const expected = type?.expect.length ?? 0;
  const status: DocCheck["status"] =
    expected > 0 && missing.length === expected && !courseCodeFound ? "failed" : notes.length > 0 ? "warnings" : "passed";
  if (status === "failed") notes.unshift(`This does not look like a ${type?.label ?? "document of this type"}.`);

  return { status, notes, pages, textChars: chars, courseCodeFound };
}
