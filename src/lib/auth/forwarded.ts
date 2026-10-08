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

export function readIdentity(headers: Headers): ForwardedIdentity | null {
  const userId = headers.get(FORWARDED.user), tenantId = headers.get(FORWARDED.tenant), role = headers.get(FORWARDED.role), signature = headers.get(FORWARDED.signature);
  if (!secret() || !userId || !tenantId || !signature || (role !== "owner" && role !== "admin")) return null;
  const expected = Buffer.from(sign({ userId, tenantId, role })), actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? { userId, tenantId, role } : null;
}
