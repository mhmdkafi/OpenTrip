import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

// Read-only readiness check. Never print credentials, tokens, names or table rows.
nextEnv.loadEnvConfig(process.cwd());
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'].filter(key => !process.env[key]);
if (!secret) missing.push('SUPABASE_SECRET_KEY');
const report = { configuration: { missing }, tables: {} };
if (missing.length) { console.log(JSON.stringify(report, null, 2)); process.exit(1); }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const tables = { users: 'id,status', tenants: 'id', user_memberships: 'user_id,tenant_id,role', tripdash_workspaces: 'tenant_id,revision' };
try {
  for (const [table, columns] of Object.entries(tables)) {
    const { error } = await admin.from(table).select(columns, { head: true, count: 'exact' });
    report.tables[table] = error ? { ready: false, code: error.code || 'connection_failed' } : { ready: true };
  }
  const authResponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(15000) });
  if (authResponse.ok) report.publicSignupDisabled = (await authResponse.json()).disable_signup === true;
} catch {
  report.networkError = 'Could not reach Supabase; nothing was changed.';
}
console.log(JSON.stringify(report, null, 2));
if (report.networkError || Object.values(report.tables).some(table => !table.ready)) process.exit(1);
