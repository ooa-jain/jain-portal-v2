import "server-only";
import { pbkdf2, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashes in Werkzeug's format, so passwords set in the old Flask
 * portal still work here and passwords set here still work there:
 *   scrypt:N:r:p$salt$hex          (Werkzeug's default)
 *   pbkdf2:sha256:iterations$salt$hex
 * The salt is used as UTF-8 text, as Werkzeug does.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;
const pbkdf2Async = promisify(pbkdf2);

const SALT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function salt(length = 16) {
  let out = "";
  for (let i = 0; i < length; i++) out += SALT_CHARS[randomInt(SALT_CHARS.length)];
  return out;
}

async function derive(method: string, password: string, saltText: string): Promise<Buffer | null> {
  const parts = method.split(":");
  if (parts[0] === "scrypt") {
    const [n, r, p] = [Number(parts[1] ?? 32768), Number(parts[2] ?? 8), Number(parts[3] ?? 1)];
    if (![n, r, p].every((v) => Number.isInteger(v) && v > 0) || n > 1 << 20) return null;
    return scryptAsync(password, saltText, 64, { N: n, r, p, maxmem: 132 * n * r * p });
  }
  if (parts[0] === "pbkdf2") {
    const digest = parts[1] ?? "sha256";
    const iterations = Number(parts[2] ?? 600000);
    if (!["sha256", "sha512", "sha1"].includes(digest) || !Number.isInteger(iterations) || iterations < 1 || iterations > 5_000_000) return null;
    const length = digest === "sha512" ? 64 : digest === "sha1" ? 20 : 32;
    return pbkdf2Async(password, saltText, iterations, length, digest);
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const method = "scrypt:32768:8:1";
  const s = salt();
  const key = await derive(method, password, s);
  return `${method}$${s}$${key!.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [method, saltText, hex] = stored.split("$");
  if (!method || !saltText || !hex || !/^[0-9a-f]+$/i.test(hex)) return false;
  try {
    const key = await derive(method, password, saltText);
    const expected = Buffer.from(hex, "hex");
    return Boolean(key) && key!.length === expected.length && timingSafeEqual(key!, expected);
  } catch {
    return false;
  }
}

/** A hash to check against when the account does not exist, so both cases take the same time. */
export const DUMMY_HASH =
  "scrypt:32768:8:1$AAAAAAAAAAAAAAAA$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export const MIN_PASSWORD_LENGTH = 8;

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > 200) return "That password is too long.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return "Use both letters and numbers.";
  return null;
}

/** A readable random password for an admin to hand out, e.g. "Kp7m-Rt4x-Wq9z". */
export function generatePassword(): string {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const group = () => letters[randomInt(letters.length)] + letters[randomInt(letters.length)] + digits[randomInt(digits.length)] + letters[randomInt(letters.length)];
  return `${group()}-${group()}-${group()}`;
}
