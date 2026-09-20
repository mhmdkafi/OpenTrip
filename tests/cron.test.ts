import { describe, it, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/cron/sync/route";

const tenant = "10000000-0000-4000-8000-000000000001", lease = "20000000-0000-4000-8000-000000000001";
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
function setup(t: TestContext) {
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.invalid", SUPABASE_SECRET_KEY: "test-service", CRON_SECRET: "test-cron-secret" })) {
    const old = process.env[key]; process.env[key] = value;
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
  }
}
const request = (secret = "test-cron-secret") => new NextRequest("http://localhost/api/cron/sync", { headers: { Authorization: `Bearer ${secret}` } });

describe("Cron service authentication and lease completion", () => {
  it("rejects an invalid service secret before touching the database", async t => {
    setup(t); t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected database call"); });
    assert.equal((await GET(request("wrong"))).status, 401);
  });
  it("returns zero processed when no due job is available", async t => {
    setup(t); t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      assert.match(String(input), /rpc\/claim_tripdash_sync_job/); return json([]);
    });
    const response = await GET(request());
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { processed: 0 });
  });
  for (const stale of [false, true]) it(stale ? "rejects completion after its lease was replaced" : "records a missing OAuth connection as a job failure and releases the lease", async t => {
    setup(t); let completed = false;
    t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/claim_tripdash_sync_job")) return json([{ tenant_id: tenant, lease_id: lease }]);
      if (url.pathname.endsWith("/tripdash_google_connections")) return json([]);
      assert.equal(init?.method, "PATCH");
      assert.equal(url.searchParams.get("tenant_id"), `eq.${tenant}`);
      assert.equal(url.searchParams.get("lease_id"), `eq.${lease}`);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.lease_id, null); assert.equal(body.lease_until, null);
      assert.match(body.last_error, /Hubungkan akun Google/); completed = true;
      return json(stale ? [] : [{ tenant_id: tenant }]);
    });
    const response = await GET(request());
    assert.equal(response.status, stale ? 409 : 502); assert.equal(completed, true);
  });
});
