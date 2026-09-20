import { before, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const A = "10000000-0000-4000-8000-000000000001", B = "10000000-0000-4000-8000-000000000002";
const UA = "20000000-0000-4000-8000-000000000001", UB = "20000000-0000-4000-8000-000000000002";
const migrations = ["0001_auth_tenant", "0002_tripdash_workspace", "0003_scheduled_sync", "0004_owner_admin"];
let db: PGlite;
async function migrate() { for (const file of migrations) await db.exec(readFileSync(`supabase/migrations/${file}.sql`, "utf8")); }
async function asUser(userId: string, sql: string) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec("set role authenticated");
  try { return await db.query(sql); } finally { await db.exec("reset role"); }
}

before(async () => {
  db = await PGlite.create();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text not null);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to authenticated;
  `);
  await migrate();
  await db.query("insert into auth.users(id,email) values ($1,'a@example.test'),($2,'b@example.test')", [UA, UB]);
  await db.query("insert into public.tenants(id,name) values ($1,'Tenant A'),($2,'Tenant B')", [A, B]);
  await db.query("insert into public.user_memberships(user_id,tenant_id,role) values ($1,$2,'owner'),($3,$4,'admin')", [UA, A, UB, B]);
  await db.query("insert into public.tripdash_workspaces(tenant_id,data) values ($1,'{\"marker\":\"A\"}'),($2,'{\"marker\":\"B\"}')", [A, B]);
});
after(async () => { await db?.close(); });

describe("PostgreSQL migrations, tenant RLS and job leasing", () => {
  it("returns only the caller's tenant, membership, profile and workspace", async () => {
    assert.deepEqual((await asUser(UA, "select tenant_id from public.tripdash_workspaces")).rows, [{ tenant_id: A }]);
    assert.deepEqual((await asUser(UB, "select tenant_id from public.tripdash_workspaces")).rows, [{ tenant_id: B }]);
    assert.deepEqual((await asUser(UA, "select id from public.tenants")).rows, [{ id: A }]);
    assert.deepEqual((await asUser(UA, "select user_id from public.user_memberships")).rows, [{ user_id: UA }]);
    assert.deepEqual((await asUser(UA, "select id from public.users")).rows, [{ id: UA }]);
  });
  it("denies browser writes, role escalation, token access and cron claims", async () => {
    for (const sql of [
      "update public.user_memberships set role='owner'", "update public.users set status='active'",
      "update public.tripdash_workspaces set data='{}'", "select * from public.tripdash_google_connections",
      "select * from public.tripdash_sync_jobs", "select * from public.claim_tripdash_sync_job()",
    ]) await assert.rejects(asUser(UA, sql), /permission denied/);
    await db.exec("set role anon");
    try { await assert.rejects(db.query("select * from public.tripdash_workspaces"), /permission denied/); }
    finally { await db.exec("reset role"); }
  });
  it("revokes direct reads when the profile becomes inactive", async () => {
    await db.query("update public.users set status='inactive' where id=$1", [UA]);
    try { assert.deepEqual((await asUser(UA, "select * from public.tripdash_workspaces")).rows, []); }
    finally { await db.query("update public.users set status='active' where id=$1", [UA]); }
  });
  it("applies migrations again without changing the owner or workspace data", async () => {
    await migrate();
    assert.deepEqual((await db.query("select role from public.user_memberships where user_id=$1", [UA])).rows, [{ role: "owner" }]);
    assert.deepEqual((await db.query("select data from public.tripdash_workspaces where tenant_id=$1", [A])).rows, [{ data: { marker: "A" } }]);
  });
  it("rejects a stale revision while retaining the first writer's changes", async () => {
    const first = await db.query("update public.tripdash_workspaces set revision=1,data='{\"saved\":true}' where tenant_id=$1 and revision=0 returning revision", [A]);
    const stale = await db.query("update public.tripdash_workspaces set data='{}' where tenant_id=$1 and revision=0 returning revision", [A]);
    assert.equal(first.rows.length, 1); assert.equal(stale.rows.length, 0);
  });
  it("claims a due job once, then skips its active lease", async () => {
    await db.query("insert into public.tripdash_sync_jobs(tenant_id,enabled) values ($1,true),($2,false)", [A, B]);
    const results = await Promise.all([db.query("select * from public.claim_tripdash_sync_job()"), db.query("select * from public.claim_tripdash_sync_job()")]);
    assert.equal(results.reduce((count, result) => count + result.rows.length, 0), 1);
    assert.equal((results.find(result => result.rows.length)?.rows[0] as { tenant_id: string }).tenant_id, A);
    const { rows } = await db.query<{ scheduled: boolean; leased: boolean }>("select next_run_at>now() as scheduled,lease_until>now() as leased from public.tripdash_sync_jobs where tenant_id=$1", [A]);
    assert.deepEqual(rows, [{ scheduled: true, leased: true }]);
  });
  it("recovers expired leases and prevents an old worker from finishing a new lease", async () => {
    const old = (await db.query<{ lease_id: string }>("select lease_id from public.tripdash_sync_jobs where tenant_id=$1", [A])).rows[0].lease_id;
    await db.query("update public.tripdash_sync_jobs set lease_until=now()-interval '1 second',next_run_at=now()+interval '7 days' where tenant_id=$1", [A]);
    const recovered = await db.query<{ tenant_id: string; lease_id: string }>("select * from public.claim_tripdash_sync_job()");
    assert.equal(recovered.rows[0].tenant_id, A); assert.notEqual(recovered.rows[0].lease_id, old);
    const stale = await db.query("update public.tripdash_sync_jobs set lease_id=null,lease_until=null where tenant_id=$1 and lease_id=$2 returning tenant_id", [A, old]);
    assert.equal(stale.rows.length, 0);
  });
});
