import { MongoClient, type Db } from "mongodb";
import { createServerOnlyFn } from "@tanstack/react-start";

// One connection reused across requests. The URI is read inside the handler so
// it is never baked into the client bundle, and so a deployed runtime that
// injects env per-request still sees the right value.
let cached: { client: MongoClient; db: Db } | null = null;

export const getDb = createServerOnlyFn(async (): Promise<Db> => {
  if (cached) return cached.db;
  const uri = process.env["MONGO_URI"] ?? "mongodb://127.0.0.1:27017";
  const name = process.env["MONGO_DB"] ?? "movieverse";
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  cached = { client, db: client.db(name) };
  return cached.db;
});
