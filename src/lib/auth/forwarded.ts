import { createHmac, timingSafeEqual } from "node:crypto";

// The proxy verifies the session once and forwards the identity to route handlers.
// The HMAC makes the forwarded headers unforgeable, even on routes the proxy skips.
export const FORWARDED = { user: "x-user-id", tenant: "x-workspace-id", role: "x-workspace-role", signature: "x-workspace-sig" } as const;
export type ForwardedIdentity = { userId: string; tenantId: string; role: "owner" | "admin" };

const secret = () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const sign = ({ userId, tenantId, role }: ForwardedIdentity) => createHmac("sha256", secret()).update(`${userId}:${tenantId}:${role}`).digest("hex");

export function signIdentity(identity: ForwardedIdentity) {
  return sign(identity);
}

// Membership is re-verified against the database at most once per TTL.
export const MEMBERSHIP_COOKIE = "ws-member";
export const MEMBERSHIP_TTL_S = 60;
export function signMembership(identity: ForwardedIdentity) {
  const expires = Math.floor(Date.now() / 1000) + MEMBERSHIP_TTL_S;
  return `${identity.role}.${expires}.${createHmac("sha256", secret()).update(`${identity.userId}:${identity.tenantId}:${identity.role}:${expires}`).digest("hex")}`;
}
export function readMembership(value: string | undefined, userId: string, tenantId: string): ForwardedIdentity["role"] | null {
  const [role, expires, signature] = value?.split(".") ?? [];
  if (!secret() || (role !== "owner" && role !== "admin") || !signature || Number(expires) < Date.now() / 1000) return null;
  const expected = Buffer.from(createHmac("sha256", secret()).update(`${userId}:${tenantId}:${role}:${expires}`).digest("hex")), actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? role : null;
}

export function readIdentity(headers: Headers): ForwardedIdentity | null {
  const userId = headers.get(FORWARDED.user), tenantId = headers.get(FORWARDED.tenant), role = headers.get(FORWARDED.role), signature = headers.get(FORWARDED.signature);
  if (!secret() || !userId || !tenantId || !signature || (role !== "owner" && role !== "admin")) return null;
  const expected = Buffer.from(sign({ userId, tenantId, role })), actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? { userId, tenantId, role } : null;
}
