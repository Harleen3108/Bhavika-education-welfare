import "server-only";
import mongoose from "mongoose";
import { env } from "@/lib/env";

/**
 * Serverless-safe Mongoose connection.
 *
 * On Vercel every function invocation can spin up a fresh module scope, so we
 * cache the connection promise on `globalThis` to reuse a single connection
 * across warm invocations and avoid exhausting Atlas connection limits.
 */

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  _mongoose?: MongooseCache;
};

const cache: MongooseCache = globalForMongoose._mongoose ?? {
  conn: null,
  promise: null,
};

globalForMongoose._mongoose = cache;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    // Register all models exactly once before connecting.
    // (importing the registry has the side effect of compiling schemas)
    mongoose.set("strictQuery", true);

    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB_NAME,
        // Keep the pool small for serverless — one function = few connections.
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
      })
      .then((m) => m);
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}

/** Run a function inside a Mongo transaction (requires a replica set — Atlas provides this). */
export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
  await dbConnect();
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
