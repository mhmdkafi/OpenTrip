import { describe, it, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { requireMembership } from "../src/lib/auth/membership";
import { encryptToken } from "../src/lib/workspace/google-auth";
import { readAuthenticatedSheet } from "../src/lib/workspace/google-sheet";
import { DomainError } from "../src/lib/workspace/commands";

const A = "10000000-0000-4000-8000-000000000001", B = "10000000-0000-4000-8000-000000000002";
const sheetUrl = "https://docs.google.com/spreadsheets/d/test_spreadsheet_1234567890/edit#gid=7";
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const status = (expected: number) => (error: unknown) => error instanceof DomainError && error.status === expected;
function environment(t: TestContext) {
  const settings = {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.invalid", SUPABASE_SECRET_KEY: "test-service-key",
    GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-secret", GOOGLE_REDIRECT_URI: "http://localhost/api/google/callback",
    GOOGLE_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  };
  for (const [key, value] of Object.entries(settings)) {
    const old = process.env[key]; process.env[key] = value;
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
  }
}

describe("Workspace authentication", () => {
  it("checks the requested tenant, role and active profile on every switch", async t => {
    let active = true, role = "owner";
    const client = createClient("https://test.supabase.invalid", "test-key", { auth: { persistSession: false }, global: { fetch: async input => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/users")) return json([{ status: active ? "active" : "inactive" }]);
      assert.equal(url.searchParams.get("user_id"), "eq.user-a");
      return json(url.searchParams.get("tenant_id") === `eq.${A}` ? [{ tenant_id: A, role }] : []);
    } } });
    assert.equal(await requireMembership(client, "user-a", A), "owner");
    await assert.rejects(requireMembership(client, "user-a", B), status(403));
    active = false; await assert.rejects(requireMembership(client, "user-a", A), status(403));
    active = true; role = "viewer"; await assert.rejects(requireMembership(client, "user-a", A), status(403));
    await assert.rejects(requireMembership(client, "user-a", "forged-tenant"), status(403));
    t.after(() => client.auth.stopAutoRefresh());
  });
});

describe("Google import requires tenant OAuth", () => {
  it("rejects a missing connection without requesting a public spreadsheet", async t => {
    environment(t); const requests: string[] = [];
    t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = new URL(String(input)); requests.push(url.hostname);
      assert.equal(url.searchParams.get("tenant_id"), `eq.${A}`);
      return json([]);
    });
    await assert.rejects(readAuthenticatedSheet(A, sheetUrl), status(409));
    assert.deepEqual(requests, ["test.supabase.invalid"]);
  });
  it("surfaces revoked OAuth without retrying through public access", async t => {
    environment(t); const requests: string[] = [];
    const connection = { encrypted_refresh_token: encryptToken("refresh"), encrypted_access_token: null, expires_at: null, updated_at: "2026-01-01" };
    t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = new URL(String(input)); requests.push(url.hostname);
      if (url.hostname === "test.supabase.invalid") return json([connection]);
      if (url.hostname === "oauth2.googleapis.com") return json({ error: "invalid_grant" }, 400);
      throw new Error("Unexpected public/Sheets request");
    });
    await assert.rejects(readAuthenticatedSheet(A, sheetUrl), status(401));
    assert.deepEqual(requests, ["test.supabase.invalid", "oauth2.googleapis.com"]);
  });
  it("uses the selected gid and cached tenant token to read the response tab", async t => {
    environment(t);
    const connection = { encrypted_refresh_token: encryptToken("refresh"), encrypted_access_token: encryptToken("cached-access"), expires_at: new Date(Date.now() + 3600000).toISOString(), updated_at: "2026-01-01" };
    const values = [["Timestamp", "Nama Lengkap", "Fasilitas", "Mepo"], ["10/09/2026", "Peserta", "Full", "Bandung"]];
    t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.hostname === "test.supabase.invalid") {
        assert.equal(url.searchParams.get("tenant_id"), `eq.${A}`); return json([connection]);
      }
      assert.equal(url.hostname, "sheets.googleapis.com");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer cached-access");
      if (url.pathname.includes("/values/")) { assert.match(decodeURIComponent(url.pathname), /'Selected tab'!/); return json({ values }); }
      return json({ properties: { title: "Malabar", locale: "id_ID" }, sheets: [{ properties: { sheetId: 0, title: "Other" } }, { properties: { sheetId: 7, title: "Selected tab" } }] });
    });
    const result = await readAuthenticatedSheet(A, sheetUrl);
    assert.equal(result.sheet.sheetId, 7); assert.deepEqual(result.values, values);
  });
  it("does not continue with an old token if the connection was replaced during refresh", async t => {
    environment(t);
    const connection = { encrypted_refresh_token: encryptToken("refresh"), expires_at: null, updated_at: "2026-01-01" };
    t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.hostname === "oauth2.googleapis.com") return json({ access_token: "renewed", expires_in: 3600 });
      assert.equal(url.hostname, "test.supabase.invalid");
      return json(init?.method === "PATCH" ? [] : [connection]);
    });
    await assert.rejects(readAuthenticatedSheet(A, sheetUrl), status(409));
  });
});
