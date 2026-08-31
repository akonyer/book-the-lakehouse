import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createConnection } from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.log("DATABASE_URL is not set; skipping migrations for demo mode.");
} else {
  const connection = await createConnection(databaseUrl);
  try {
    const db = drizzle(connection);
    await migrate(db, { migrationsFolder: "./drizzle" });

    const peopleFile = process.env.PEOPLE_FILE?.trim();
    if (peopleFile) {
      const people = JSON.parse(await readFile(peopleFile, "utf8"));
      if (!Array.isArray(people)) {
        throw new Error("people configuration must be an array");
      }

      for (const person of people) {
        if (
          !person ||
          typeof person.id !== "string" ||
          typeof person.first !== "string" ||
          typeof person.color !== "string"
        ) {
          throw new Error(
            "each configured person requires string id, first and color fields",
          );
        }

        await connection.execute(
          `INSERT INTO people (id, first_name, color)
           VALUES (?, ?, ?) AS incoming
           ON DUPLICATE KEY UPDATE
             first_name = incoming.first_name,
             color = incoming.color`,
          [person.id, person.first, person.color],
        );
      }
    }
  } finally {
    await connection.end();
  }
}
