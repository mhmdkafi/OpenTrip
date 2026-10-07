import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { DomainError } from "./commands";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri || !process.env.GOOGLE_TOKEN_ENCRYPTION_KEY) throw new DomainError("Google connection is not configured. Complete the OAuth setup on the server.", 503);
  return { clientId, clientSecret, redirectUri };
}
function key() {
  const value = Buffer.from(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? "", "base64");
  if (value.length !== 32) throw new DomainError("The Google encryption key must be 32 bytes of base64.", 503);
  return value;
}
export function encryptToken(token: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
function decryptToken(value: string) {
  const data = Buffer.from(value, "base64"); const cipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  cipher.setAuthTag(data.subarray(12, 28)); return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString("utf8");
}
export async function exchangeToken(params: Record<string, string>) {
  const config = googleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...params }), cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new DomainError("Google authorization failed or was revoked. Reconnect your Google account.", 401);
  const token = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number };
  if (!token.access_token) throw new DomainError("Invalid Google token response.", 502);
  return token;
}
export async function googleAccessToken(tenantId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("tripdash_google_connections").select("encrypted_refresh_token,encrypted_access_token,expires_at,updated_at").eq("tenant_id", tenantId).maybeSingle();
  if (error) throw new DomainError("Could not load the Google connection. Check migrations and database access.", 503);
  if (!data) throw new DomainError("Connect your Google account in Settings first.", 409);
  if (data.encrypted_access_token && Date.parse(data.expires_at) > Date.now() + 60000) return decryptToken(data.encrypted_access_token);
  const token = await exchangeToken({ grant_type: "refresh_token", refresh_token: decryptToken(data.encrypted_refresh_token) });
  const {data:saved,error:saveError} = await admin.from("tripdash_google_connections").update({
    encrypted_access_token:encryptToken(token.access_token),
    encrypted_refresh_token:token.refresh_token ? encryptToken(token.refresh_token) : data.encrypted_refresh_token,
    expires_at:new Date(Date.now() + (token.expires_in || 3600)*1000).toISOString(),
    updated_at:new Date().toISOString(),
  }).eq("tenant_id",tenantId).eq("updated_at",data.updated_at).select("tenant_id").maybeSingle();
  if (saveError) throw new DomainError("Could not save the Google token.",503);
  if (!saved) throw new DomainError("The Google connection changed while loading. Try again.",409);
  return token.access_token;
}
