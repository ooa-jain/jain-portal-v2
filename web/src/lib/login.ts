import "server-only";
import { collections } from "./db";
import { isAdminEmail } from "./auth";
import { createSession } from "./session";
import { nowStamp, str } from "./utils";

/** Create the user on first sign-in, otherwise record the login. Starts the session. */
export async function startSessionFor(identity: { email: string; name: string; picture: string }, remember = true) {
  const users = collections.users();
  const existing = await users.findOne({ email: identity.email });
  let name = identity.name;
  if (existing) {
    name = str(existing.name) || identity.name;
    await users.updateOne(
      { _id: existing._id },
      { $set: { last_login: nowStamp(), ...(identity.picture ? { picture: identity.picture } : {}) } },
    );
  } else {
    await users.insertOne({
      name: identity.name,
      email: identity.email,
      picture: identity.picture,
      created_at: nowStamp(),
      last_login: nowStamp(),
      first_time_login: true,
      auth_provider: "google",
      is_admin: await isAdminEmail(identity.email),
    });
  }
  await createSession({ email: identity.email, name }, remember);
}
