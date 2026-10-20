// src/lib/mongodb.js

import { MongoClient } from "mongodb";

const options = {};
const globalForMongo = globalThis;

export function getClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please add your Mongo URI to .env.local or set MONGODB_URI env variable",
    );
  }
  if (!globalForMongo.__mongoClientPromise) {
    const client = new MongoClient(uri, options);
    globalForMongo.__mongoClientPromise = client.connect();
  }
  return globalForMongo.__mongoClientPromise;
}

export async function getDatabase() {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB || "cx4107_courses");
}
