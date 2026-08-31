import { beforeEach, describe, expect, it, vi } from "vitest";

const doubles = vi.hoisted(() => ({
  get: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: doubles.cookies,
}));

describe("PIN gate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    doubles.get.mockReset();
    doubles.cookies.mockReset().mockResolvedValue({ get: doubles.get });
  });

  it("trusts an upstream authenticating proxy only when explicitly enabled", async () => {
    vi.stubEnv("TRUST_AUTHENTICATING_PROXY", "true");
    const { isGatePassed } = await import("./gate");

    await expect(isGatePassed()).resolves.toBe(true);
    expect(doubles.cookies).not.toHaveBeenCalled();
  });

  it.each(["", "1", "TRUE", "yes"])(
    "keeps the PIN cookie gate for non-exact proxy setting %j",
    async (value) => {
      vi.stubEnv("TRUST_AUTHENTICATING_PROXY", value);
      doubles.get.mockReturnValue(undefined);
      const { isGatePassed } = await import("./gate");

      await expect(isGatePassed()).resolves.toBe(false);
      expect(doubles.get).toHaveBeenCalledWith(expect.stringMatching(/-gate$/));
    },
  );

  it("accepts the established PIN gate cookie in normal mode", async () => {
    vi.stubEnv("TRUST_AUTHENTICATING_PROXY", "false");
    doubles.get.mockReturnValue({ value: "ok" });
    const { isGatePassed } = await import("./gate");

    await expect(isGatePassed()).resolves.toBe(true);
  });
});
