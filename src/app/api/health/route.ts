import { sql } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "@/db/client";

export async function GET() {
  if (!hasDatabaseUrl()) {
    return Response.json({ status: "ok", mode: "demo" });
  }

  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: "ok", mode: "database" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
