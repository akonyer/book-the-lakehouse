import { cookies } from "next/headers";
import { siteCookiePrefix } from "@/lib/site";

export const GATE_COOKIE = `${siteCookiePrefix}-gate`;

export function trustsAuthenticatingProxy(): boolean {
  return process.env.TRUST_AUTHENTICATING_PROXY === "true";
}

export async function isGatePassed(): Promise<boolean> {
  if (trustsAuthenticatingProxy()) return true;
  const c = await cookies();
  return c.get(GATE_COOKIE)?.value === "ok";
}
