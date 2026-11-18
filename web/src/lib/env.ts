import "server-only";

/**
 * Server configuration. Variable names match the old Flask app's .env so the
 * same file can be reused. Secrets have no defaults: a missing secret is a
 * startup error, never a silent fallback.
 */

function required(name: string, ...aliases: string[]): string {
  for (const key of [name, ...aliases]) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  throw new Error(
    `Missing required environment variable ${name}. Set it in the .env file.`,
  );
}

function optional(name: string, fallback = ""): string {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

export const env = {
  get mongoUri() {
    return required("MONGO_URI", "MONGODB_URI");
  },
  get dbName() {
    return optional("DB_NAME", "semreadiness");
  },
  get sessionSecret() {
    const secret = required("SECRET_KEY");
    if (secret.length < 16) {
      throw new Error("SECRET_KEY must be at least 16 characters long.");
    }
    return secret;
  },
  /** Emails that are always admins, in addition to those flagged in the database. */
  get adminEmails(): Set<string> {
    return new Set(
      optional("ADMIN_EMAILS")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    );
  },
  /** Only accounts on this Google Workspace domain may sign in (admins excepted). */
  get allowedDomain() {
    return optional("ALLOWED_EMAIL_DOMAIN", "jainuniversity.ac.in").toLowerCase();
  },
  /** Firebase web config. These values are public by design. */
  get firebase() {
    return {
      apiKey: optional("FIREBASE_API_KEY", "AIzaSyDNEpEpAfwT_pyDRjZB--n5nZUWZwLq0go"),
      authDomain: optional("FIREBASE_AUTH_DOMAIN", "jain-university-d4f8b.firebaseapp.com"),
      projectId: optional("FIREBASE_PROJECT_ID", "jain-university-d4f8b"),
      storageBucket: optional("FIREBASE_STORAGE_BUCKET", "jain-university-d4f8b.firebasestorage.app"),
      messagingSenderId: optional("FIREBASE_MESSAGING_SENDER_ID", "386264535656"),
      appId: optional("FIREBASE_APP_ID", "1:386264535656:web:32aa745d1776a0185a21dd"),
    };
  },
  /** SMTP is optional: when EMAIL_USER / EMAIL_PASS are unset, emails are skipped. */
  get mail() {
    const user = optional("EMAIL_USER");
    const pass = optional("EMAIL_PASS");
    if (!user || !pass) return null;
    return {
      host: optional("MAIL_SERVER", "smtp.gmail.com"),
      port: Number(optional("MAIL_PORT", "587")),
      secure: ["true", "1", "yes"].includes(optional("MAIL_USE_SSL", "false").toLowerCase()),
      user,
      pass,
    };
  },
  get baseUrl() {
    return optional("BASE_URL", optional("APP_URL")).replace(/\/+$/, "");
  },
  /** Folder for uploaded evidence files. Point it at the old app's static/uploads to keep old links working. */
  get uploadDir() {
    return optional("UPLOAD_DIR", "uploads");
  },
  /** Shared secret for the scheduled reminder endpoint (/api/cron/deadline-reminders). Unset = endpoint disabled. */
  get cronSecret() {
    return optional("CRON_SECRET");
  },
  /**
   * DEMO_LOGIN=1 shows "Demo HOD" / "Demo Faculty" buttons on the sign-in page.
   * They sign in to two test accounts in a separate demo department, never an admin.
   */
  get demoLogin() {
    return optional("DEMO_LOGIN") === "1";
  },
  /** Local testing only: enables /api/auth/dev. Ignored in production builds. */
  get devLogin() {
    return process.env.NODE_ENV !== "production" && optional("DEV_LOGIN") === "1";
  },
};
