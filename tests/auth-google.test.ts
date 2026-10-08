import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { requireMembership } from "../src/lib/auth/membership";
import { DomainError } from "../src/lib/workspace/commands";

const A = "10000000-0000-4000-8000-000000000001", B = "10000000-0000-4000-8000-000000000002";
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const status = (expected: number) => (error: unknown) => error instanceof DomainError && error.status === expected;
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
