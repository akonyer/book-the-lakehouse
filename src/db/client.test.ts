import { beforeEach, describe, expect, it, vi } from "vitest";

const doubles = vi.hoisted(() => ({
  database: { kind: "database" },
  pool: { kind: "pool" },
  createPool: vi.fn(),
  drizzle: vi.fn(),
}));

vi.mock("mysql2/promise", () => ({
  createPool: doubles.createPool,
}));

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: doubles.drizzle,
}));

describe("MySQL database client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    doubles.createPool.mockReset().mockReturnValue(doubles.pool);
    doubles.drizzle.mockReset().mockReturnValue(doubles.database);
  });

  it("reports whether a database URL is configured", async () => {
    vi.stubEnv("DATABASE_URL", "  ");
    const { hasDatabaseUrl } = await import("./client");
    expect(hasDatabaseUrl()).toBe(false);

    vi.stubEnv("DATABASE_URL", "mysql://app:secret@db/app");
    expect(hasDatabaseUrl()).toBe(true);
  });

  it("rejects persistent mode without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDb } = await import("./client");

    expect(() => getDb()).toThrow(
      "DATABASE_URL is not set. Configure a MySQL connection before starting the application.",
    );
    expect(doubles.createPool).not.toHaveBeenCalled();
  });

  it("creates one reusable MySQL pool and Drizzle database", async () => {
    const url = "mysql://app:secret@db:3306/calendar";
    vi.stubEnv("DATABASE_URL", url);
    const { getDb } = await import("./client");

    expect(getDb()).toBe(doubles.database);
    expect(getDb()).toBe(doubles.database);
    expect(doubles.createPool).toHaveBeenCalledTimes(1);
    expect(doubles.createPool).toHaveBeenCalledWith(url);
    expect(doubles.drizzle).toHaveBeenCalledTimes(1);
    expect(doubles.drizzle).toHaveBeenCalledWith(doubles.pool, {
      schema: expect.any(Object),
      mode: "default",
    });
  });
});
