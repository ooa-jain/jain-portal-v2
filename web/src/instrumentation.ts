/** Runs once when the server starts: make sure the database indexes exist. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureIndexes } = await import("./lib/indexes");
  // Do not hold up start-up; queries work (more slowly) until indexes are ready.
  ensureIndexes().catch((error) => console.error("[indexes]", error));
}
