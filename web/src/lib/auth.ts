import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { collections } from "./db";
import { env } from "./env";
import { readSession } from "./session";
import { getSettings } from "./data";
import { str } from "./utils";

export type CurrentUser = {
  email: string;
  name: string;
  department: string;
  picture: string;
  isAdmin: boolean;
  canReadiness: boolean;
  canClosure: boolean;
  canIea: boolean;
  /** Late access granted by an admin, per module. */
  overrides: { readiness: boolean; closure: boolean; iea: boolean };
  /** Set while an admin is viewing the portal as this user. */
  impersonatedBy: string | null;
  /** Can also sign in with email and password. */
  hasPassword: boolean;
  /** Faculty accounts upload documents and fill checklists; they cannot file HOD submissions. */
  isFaculty: boolean;
  /** One of the demo test accounts (DEMO_LOGIN). */
  isDemo: boolean;
};

/** Admin = listed in ADMIN_EMAILS, listed in settings.admin_emails, or flagged on the user document. */
export async function isAdminEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (env.adminEmails.has(normalized)) return true;
  const settings = await getSettings();
  if (settings.admin_emails.includes(normalized)) return true;
  const user = await collections.users().findOne({ email: normalized });
  return Boolean(user && (user.is_admin === true || user.role === "admin"));
}

/** The signed-in user for this request, or null. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;

  const [doc, settings] = await Promise.all([
    collections.users().findOne({ email: session.email }),
    getSettings(),
  ]);
  // A deleted account loses access immediately, even with a valid cookie.
  if (!doc) return null;

  const isAdmin =
    env.adminEmails.has(session.email) ||
    settings.admin_emails.includes(session.email) ||
    doc.is_admin === true ||
    doc.role === "admin";

  return {
    email: session.email,
    name: str(doc.name) || session.name,
    department: str(doc.department),
    picture: str(doc.picture),
    isAdmin,
    canReadiness: isAdmin || doc.can_readiness !== false,
    canClosure: isAdmin || doc.can_closure !== false,
    canIea: isAdmin || doc.can_iea !== false,
    overrides: {
      readiness: doc.readiness_access_override === true,
      closure: doc.closure_access_override === true,
      iea: doc.iea_access_override === true,
    },
    impersonatedBy: session.impersonator ?? null,
    hasPassword: Boolean(doc.password),
    isFaculty: !isAdmin && doc.role === "faculty",
    isDemo: doc.is_demo === true,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

// ── Google sign-in (Firebase ID token) ──────────────────────────────

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

export type VerifiedIdentity = { email: string; name: string; picture: string };

/**
 * Verify a Firebase ID token's signature, issuer, audience and expiry.
 * Throws if any check fails; an unverifiable token is never trusted.
 */
export async function verifyFirebaseToken(idToken: string): Promise<VerifiedIdentity> {
  const projectId = env.firebase.projectId;
  const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"],
  });

  const email = str(payload.email).trim().toLowerCase();
  if (!email) throw new Error("No email found on the Google account.");
  if (payload.email_verified !== true) throw new Error("Your Google email is not verified.");

  return {
    email,
    name: str(payload.name).trim() || email.split("@")[0],
    picture: str(payload.picture),
  };
}

export function isAllowedEmail(email: string): boolean {
  return email.endsWith(`@${env.allowedDomain}`) || env.adminEmails.has(email);
}

/** HOD / department pages: signed in and not a faculty account. */
export async function requireDepartmentUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.isFaculty) redirect("/");
  return user;
}
