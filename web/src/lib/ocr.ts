import "server-only";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

/*
 * Reads text from scanned PDFs and photos with the server's Tesseract OCR
 * (and pdftoppm, from poppler-utils, to turn PDF pages into images):
 *   apt-get install -y tesseract-ocr poppler-utils
 * Without them installed, ocrText() returns null and documents are flagged
 * for the HOD to check by eye, as before.
 */

const run = promisify(execFile);
const MAX_PAGES = 4;
const PAGE_TIMEOUT_MS = 45_000;

let available: Promise<boolean> | null = null;

export function ocrAvailable(): Promise<boolean> {
  available ??= Promise.all([
    run("tesseract", ["--version"], { timeout: 5_000 }),
    run("pdftoppm", ["-v"], { timeout: 5_000 }),
  ]).then(
    () => true,
    () => false,
  );
  return available;
}

// One OCR job at a time, so a burst of uploads cannot overload a small server.
let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

async function tesseract(image: string): Promise<string> {
  const { stdout } = await run("tesseract", [image, "stdout", "-l", "eng", "--psm", "3"], {
    timeout: PAGE_TIMEOUT_MS,
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout;
}

/** Text read from the first pages of a scanned PDF, or from an image; null when OCR is unavailable or fails. */
export async function ocrText(data: Uint8Array, ext: string): Promise<{ text: string; pages: number } | null> {
  if (!(await ocrAvailable())) return null;
  return oneAtATime(async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ooa-ocr-"));
    try {
      const input = path.join(dir, `input${ext}`);
      await writeFile(input, data);
      if (ext !== ".pdf") return { text: await tesseract(input), pages: 1 };

      await run("pdftoppm", ["-r", "200", "-gray", "-png", "-f", "1", "-l", String(MAX_PAGES), input, path.join(dir, "page")], {
        timeout: PAGE_TIMEOUT_MS,
      });
      const images = (await readdir(dir)).filter((name) => name.startsWith("page") && name.endsWith(".png")).sort();
      const texts: string[] = [];
      for (const image of images) texts.push(await tesseract(path.join(dir, image)));
      return { text: texts.join("\n"), pages: images.length };
    } catch (error) {
      console.error("[ocr] could not read the scan:", error);
      return null;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}
