import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createConnection,
  type Connection,
  type RowDataPacket,
} from "mysql2/promise";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const configuredUrl = process.env.TEST_DATABASE_URL?.trim();
const integration = configuredUrl ? describe.sequential : describe.skip;

interface TableRow extends RowDataPacket {
  Tables_in_book_the_lakehouse_test: string;
}

interface PersonRow extends RowDataPacket {
  id: string;
  first_name: string;
  color: string;
}

interface BookingDateRow extends RowDataPacket {
  start_date: Date;
  end_date: Date;
}

interface CountRow extends RowDataPacket {
  count: number;
}

integration("MySQL migrations", () => {
  // Vitest executes skipped suite callbacks during collection. Keep discovery
  // side-effect free when no integration database has been configured.
  const databaseUrl = configuredUrl ?? "mysql://unused:unused@127.0.0.1/skipped_test";
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.slice(1);
  if (!/^[a-zA-Z0-9_]+_test$/.test(databaseName)) {
    throw new Error("TEST_DATABASE_URL must name a dedicated *_test database");
  }
  const serverUrl = new URL(databaseUrl);
  serverUrl.pathname = "/";
  let connection: Connection;

  beforeAll(async () => {
    const admin = await createConnection(serverUrl.toString());
    try {
      await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
      await admin.query(
        `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
    } finally {
      await admin.end();
    }

    const migration = spawnSync(process.execPath, ["migrate.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl, PEOPLE_FILE: "" },
      encoding: "utf8",
    });
    expect(migration.status, migration.stderr || migration.stdout).toBe(0);

    connection = await createConnection(databaseUrl);
    await connection.execute(
      "INSERT INTO people (id, first_name, color) VALUES (?, ?, ?), (?, ?, ?)",
      ["person-one", "First person", "#3a4e48", "person-two", "Second person", "#8b6f47"],
    );
  });

  beforeEach(async () => {
    await connection.execute("DELETE FROM bookings");
  });

  afterAll(async () => {
    if (connection) await connection.end();
    const admin = await createConnection(serverUrl.toString());
    try {
      await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    } finally {
      await admin.end();
    }
  });

  it("creates the complete schema with foreign-key and date-range constraints", async () => {
    const [tables] = await connection.query<TableRow[]>("SHOW TABLES");
    const names = tables.map((row) => Object.values(row)[0]);
    expect(names).toEqual(
      expect.arrayContaining([
        "__drizzle_migrations",
        "booking_write_guard",
        "bookings",
        "people",
        "photos",
      ]),
    );

    await expect(
      connection.execute(
        "INSERT INTO bookings (id, person_id, start_date, end_date) VALUES (?, ?, ?, ?)",
        ["missing-person", "nobody", "2026-06-01", "2026-06-02"],
      ),
    ).rejects.toMatchObject({ code: "ER_NO_REFERENCED_ROW_2" });

    await expect(
      connection.execute(
        "INSERT INTO bookings (id, person_id, start_date, end_date) VALUES (?, ?, ?, ?)",
        ["invalid-range", "person-one", "2026-06-03", "2026-06-02"],
      ),
    ).rejects.toMatchObject({ code: "ER_CHECK_CONSTRAINT_VIOLATED" });
  });

  it("reapplies migrations and upserts mounted people configuration", async () => {
    const directory = await mkdtemp(join(tmpdir(), "book-the-lakehouse-people-"));
    const peopleFile = join(directory, "people.json");
    try {
      await writeFile(
        peopleFile,
        JSON.stringify([
          { id: "person-one", first: "Updated person", color: "#6b7a8b" },
          { id: "person-three", first: "Third person", color: "#7a8b7a" },
        ]),
      );
      const migration = spawnSync(process.execPath, ["migrate.mjs"], {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: databaseUrl, PEOPLE_FILE: peopleFile },
        encoding: "utf8",
      });
      expect(migration.status, migration.stderr || migration.stdout).toBe(0);

      const [rows] = await connection.query<PersonRow[]>(
        "SELECT id, first_name, color FROM people WHERE id IN (?, ?) ORDER BY id",
        ["person-one", "person-three"],
      );
      expect(rows).toEqual([
        { id: "person-one", first_name: "Updated person", color: "#6b7a8b" },
        { id: "person-three", first_name: "Third person", color: "#7a8b7a" },
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects globally overlapping stays and allows the following adjacent stay", async () => {
    await connection.execute(
      "INSERT INTO bookings (id, person_id, start_date, end_date) VALUES (?, ?, ?, ?)",
      ["first", "person-one", "2026-06-01", "2026-06-03"],
    );

    await expect(
      connection.execute(
        "INSERT INTO bookings (id, person_id, start_date, end_date) VALUES (?, ?, ?, ?)",
        ["overlap", "person-two", "2026-06-03", "2026-06-05"],
      ),
    ).rejects.toMatchObject({
      code: "ER_SIGNAL_EXCEPTION",
      sqlMessage: "bookings_no_overlap",
    });

    await connection.execute(
      "INSERT INTO bookings (id, person_id, start_date, end_date) VALUES (?, ?, ?, ?)",
      ["adjacent", "person-two", "2026-06-04", "2026-06-05"],
    );
    const [adjacentRows] = await connection.query<CountRow[]>(
      "SELECT COUNT(*) AS count FROM bookings WHERE id IN (?, ?)",
      ["first", "adjacent"],
    );
    expect(adjacentRows[0].count).toBe(2);
  });

  it("rejects an update that would overlap another stay", async () => {
    await connection.execute(
      "INSERT INTO bookings (id, person_id, start_date, end_date) VALUES (?, ?, ?, ?), (?, ?, ?, ?)",
      [
        "existing",
        "person-one",
        "2026-08-01",
        "2026-08-03",
        "moving",
        "person-two",
        "2026-08-10",
        "2026-08-12",
      ],
    );

    await expect(
      connection.execute(
        "UPDATE bookings SET start_date = ?, end_date = ? WHERE id = ?",
        ["2026-08-03", "2026-08-05", "moving"],
      ),
    ).rejects.toMatchObject({
      code: "ER_SIGNAL_EXCEPTION",
      sqlMessage: "bookings_no_overlap",
    });

    const [rows] = await connection.query<BookingDateRow[]>(
      "SELECT start_date, end_date FROM bookings WHERE id = ?",
      ["moving"],
    );
    expect(
      rows.map((row) => ({
        start: row.start_date.toISOString().slice(0, 10),
        end: row.end_date.toISOString().slice(0, 10),
      })),
    ).toEqual([{ start: "2026-08-10", end: "2026-08-12" }]);
  });

  it("serializes simultaneous overlapping booking writes", async () => {
    const secondConnection = await createConnection(databaseUrl);
    try {
      const attempts = await Promise.allSettled([
        connection.execute(
          "INSERT INTO bookings (id, person_id, start_date, end_date) VALUES (?, ?, ?, ?)",
          ["concurrent-one", "person-one", "2026-07-01", "2026-07-03"],
        ),
        secondConnection.execute(
          "INSERT INTO bookings (id, person_id, start_date, end_date) VALUES (?, ?, ?, ?)",
          ["concurrent-two", "person-two", "2026-07-02", "2026-07-04"],
        ),
      ]);

      expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
      const rejected = attempts.find(
        (attempt): attempt is PromiseRejectedResult => attempt.status === "rejected",
      );
      expect(rejected?.reason).toMatchObject({
        code: "ER_SIGNAL_EXCEPTION",
        sqlMessage: "bookings_no_overlap",
      });

      const [rows] = await connection.query<CountRow[]>(
        "SELECT COUNT(*) AS count FROM bookings",
      );
      expect(rows[0].count).toBe(1);
    } finally {
      await secondConnection.end();
    }
  });
});
