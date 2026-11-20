import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

const COOKIE = "portal_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** `impersonator` is set while an admin is viewing the portal as another user. */
export type SessionData = { email: string; name: string; impersonator?: string };

function key() {
  return new TextEncoder().encode(env.sessionSecret);
}

/**
 * `remember: false` makes a browser-session cookie (gone when the browser
 * closes); the signed token itself still expires after at most 12 hours.
 */
export async function createSession(data: SessionData, remember = true) {
  const lifetime = remember ? MAX_AGE_SECONDS : 60 * 60 * 12;
  const token = await new SignJWT({ email: data.email, name: data.name, ...(data.impersonator ? { impersonator: data.impersonator } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${lifetime}s`)
    .sign(key());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: MAX_AGE_SECONDS } : {}),
  });
}

export async function readSession(): Promise<SessionData | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.email !== "string" || !payload.email) return null;
    return {
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      impersonator: typeof payload.impersonator === "string" ? payload.impersonator : undefined,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}
