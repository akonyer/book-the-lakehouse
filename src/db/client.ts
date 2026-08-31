import { createPool } from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "./schema";

type Db = MySql2Database<typeof schema>;

let cachedDb: Db | null = null;

export function hasDatabaseUrl(): boolean {
  return !!process.env.DATABASE_URL?.trim();
}

export function getDb(): Db {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure a MySQL connection before starting the application.",
    );
  }

  if (!cachedDb) {
    const pool = createPool(url);
    cachedDb = drizzle(pool, { schema, mode: "default" });
  }

  return cachedDb;
}
