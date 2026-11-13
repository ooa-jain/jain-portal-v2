import "server-only";
import { MongoClient, type Collection, type Db, type Document } from "mongodb";
import { env } from "./env";

/**
 * One shared MongoClient per server process. Every network phase has a
 * timeout so a stalled Atlas connection fails fast instead of hanging a
 * request. There is no in-memory fallback: if the database is unreachable
 * the request fails with a clear error and no data is silently lost.
 */

const globalForMongo = globalThis as unknown as {
  __mongoClient?: MongoClient;
};

function getClient(): MongoClient {
  if (!globalForMongo.__mongoClient) {
    globalForMongo.__mongoClient = new MongoClient(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 15000,
      maxIdleTimeMS: 60000,
      maxPoolSize: 10,
    });
  }
  return globalForMongo.__mongoClient;
}

export function db(): Db {
  return getClient().db(env.dbName);
}

function col<T extends Document>(name: string): Collection<T> {
  return db().collection<T>(name);
}

// Collection names are the ones the old Flask app used, so existing data carries over.
export const collections = {
  submissions: () => col<Document>("submissions"),
  facultySubmissions: () => col<Document>("faculty_submissions"),
  users: () => col<Document>("users"),
  settings: () => col<{ _id: string } & Document>("settings"),
};
