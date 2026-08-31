import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("migration startup script", () => {
  it("preserves database-free demo mode", () => {
    const result = spawnSync(process.execPath, ["migrate.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: "", PEOPLE_FILE: "" },
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "DATABASE_URL is not set; skipping migrations for demo mode.",
    );
  });
});
