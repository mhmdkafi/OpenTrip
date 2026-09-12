import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { DomainError } from "./commands";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri || !process.env.GOOGLE_TOKEN_ENCRYPTION_KEY) throw new DomainError("Koneksi Google belum dikonfigurasi. Lengkapi konfigurasi OAuth di server.", 503);
  return { clientId, clientSecret, redirectUri };
}
function key() {
  const value = Buffer.from(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? "", "base64");
  if (value.length !== 32) throw new DomainError("Kunci enkripsi Google harus berisi 32 byte base64.", 503);
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
  if (!response.ok) throw new DomainError("Otorisasi Google gagal atau dicabut. Hubungkan kembali akun Google.", 401);
  return await response.json() as { access_token: string; refresh_token?: string };
}
export async function googleAccessToken(tenantId: string) {
  const { data, error } = await createAdminClient().from("tripdash_google_connections").select("encrypted_refresh_token").eq("tenant_id", tenantId).maybeSingle();
  if (error || !data) throw new DomainError("Hubungkan akun Google terlebih dahulu di Pengaturan.", 503);
  return (await exchangeToken({ grant_type: "refresh_token", refresh_token: decryptToken(data.encrypted_refresh_token) })).access_token;
}
