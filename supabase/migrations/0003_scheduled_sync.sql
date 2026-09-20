begin;

alter table public.tripdash_google_connections
  add column if not exists encrypted_access_token text,
  add column if not exists expires_at timestamptz;

create table if not exists public.tripdash_sync_jobs (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  enabled boolean not null default false,
  interval_minutes integer not null default 60 check (interval_minutes between 15 and 10080),
  next_run_at timestamptz not null default now(),
  last_run_at timestamptz,
  last_error text,
  lease_id uuid,
  lease_until timestamptz
);
create index if not exists tripdash_sync_jobs_due
  on public.tripdash_sync_jobs(next_run_at) where enabled;
alter table public.tripdash_sync_jobs enable row level security;
revoke all on public.tripdash_sync_jobs from public, anon, authenticated;
grant all on public.tripdash_sync_jobs to service_role;

-- One atomic claim. A crashed worker can be reclaimed after the ten-minute
-- lease, even when its normal interval is longer. Disabled jobs stay disabled.
create or replace function public.claim_tripdash_sync_job()
returns table (tenant_id uuid, lease_id uuid)
language sql
security definer
set search_path = ''
as $$
  with candidate as (
    select j.tenant_id
    from public.tripdash_sync_jobs j
    where j.enabled and (
      (j.lease_until is null and j.next_run_at <= now())
      or j.lease_until <= now()
    )
    order by coalesce(j.lease_until, j.next_run_at), j.tenant_id
    for update skip locked
    limit 1
  )
  update public.tripdash_sync_jobs j
  set lease_id = gen_random_uuid(),
      lease_until = now() + interval '10 minutes',
      next_run_at = now() + make_interval(mins => j.interval_minutes)
  from candidate c
  where j.tenant_id = c.tenant_id
  returning j.tenant_id, j.lease_id;
$$;
revoke all on function public.claim_tripdash_sync_job() from public, anon, authenticated;
grant execute on function public.claim_tripdash_sync_job() to service_role;

commit;
