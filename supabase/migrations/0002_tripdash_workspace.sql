-- The MVP stores each tenant's operational aggregate atomically. Only the
-- trusted server can write; revision compare-and-swap prevents lost updates.
create table if not exists public.tripdash_workspaces (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  revision bigint not null default 0,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.tripdash_workspaces enable row level security;
drop policy if exists workspace_member_read on public.tripdash_workspaces;
create policy workspace_member_read on public.tripdash_workspaces for select to authenticated
using (exists (select 1 from public.user_memberships m where m.user_id = auth.uid() and m.tenant_id = tripdash_workspaces.tenant_id));
grant select on public.tripdash_workspaces to authenticated;
revoke insert, update, delete on public.tripdash_workspaces from anon, authenticated;

create table if not exists public.tripdash_google_connections (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  encrypted_refresh_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.tripdash_google_connections enable row level security;
revoke all on public.tripdash_google_connections from anon, authenticated;
grant all on public.tripdash_workspaces, public.tripdash_google_connections to service_role;
