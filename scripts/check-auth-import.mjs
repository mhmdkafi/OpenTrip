import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

// Read-only readiness check. Never print credentials, tokens, names or table rows.
nextEnv.loadEnvConfig(process.cwd());
const keys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'GOOGLE_TOKEN_ENCRYPTION_KEY', 'CRON_SECRET'];
const missing = keys.filter(key => !process.env[key]);
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!secret) missing.push('SUPABASE_SECRET_KEY');
const report = { configuration: { missing, encryptionKeyValid: Buffer.from(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || '', 'base64').length === 32 }, tables: {}, schedulerFunction: false, googleConnections: 0, enabledSchedules: 0, publicSignupDisabled: null };
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !secret) {
  console.log(JSON.stringify(report, null, 2)); process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
const tables = {
  users: 'id,status', tenants: 'id', user_memberships: 'user_id,tenant_id,role',
  tripdash_workspaces: 'tenant_id,revision',
  tripdash_google_connections: 'tenant_id,encrypted_access_token,encrypted_refresh_token,expires_at',
  tripdash_sync_jobs: 'tenant_id,enabled,interval_minutes,lease_id,lease_until,next_run_at,last_error',
};
try {
  for (const [table, columns] of Object.entries(tables)) {
    const { error } = await admin.from(table).select(columns, { head: true, count: 'exact' });
    report.tables[table] = error ? { ready: false, code: error.code || 'connection_failed' } : { ready: true };
  }
  const [{ count: connections }, { count: schedules }] = await Promise.all([
    admin.from('tripdash_google_connections').select('tenant_id', { head: true, count: 'exact' }),
    admin.from('tripdash_sync_jobs').select('tenant_id', { head: true, count: 'exact' }).eq('enabled', true),
  ]);
  report.googleConnections = connections ?? 0;
  report.enabledSchedules = schedules ?? 0;
  const schemaResponse = await fetch(`${url}/rest/v1/`, { headers: { apikey: secret, Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15000) });
  if (schemaResponse.ok) report.schedulerFunction = Boolean((await schemaResponse.json()).paths?.['/rpc/claim_tripdash_sync_job']);
  const authResponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(15000) });
  if (authResponse.ok) report.publicSignupDisabled = (await authResponse.json()).disable_signup === true;
} catch {
  report.networkError = 'Tidak dapat memeriksa layanan; tidak ada perubahan yang dilakukan.';
}
console.log(JSON.stringify(report, null, 2));
if (missing.length || !report.configuration.encryptionKeyValid || Object.values(report.tables).some(table => !table.ready) || !report.schedulerFunction || !report.googleConnections || !report.enabledSchedules || report.publicSignupDisabled !== true || report.networkError) process.exitCode = 1;
