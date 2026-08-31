import { config } from "dotenv";
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";
import { PEOPLE, BOOKINGS } from "../lib/data";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const pool = createPool(url);
const db = drizzle(pool, { schema, mode: "default" });

async function main() {
  console.log("🌱 Seeding…");

  // Clear existing rows in dependency order.
  await db.delete(schema.photos);
  await db.delete(schema.bookings);
  await db.delete(schema.people);

  await db.insert(schema.people).values(
    PEOPLE.map((p) => ({
      id: p.id,
      firstName: p.first,
      color: p.color,
    })),
  );

  await db.insert(schema.bookings).values(
    BOOKINGS.map((b) => ({
      id: b.id,
      personId: b.personId,
      startDate: b.start,
      endDate: b.end,
    })),
  );

  console.log(
    `   inserted ${PEOPLE.length} people and ${BOOKINGS.length} bookings`,
  );
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
