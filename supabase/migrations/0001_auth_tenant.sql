do $$
begin
  create type public.user_status as enum ('active', 'inactive');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar(255) not null unique,
  status public.user_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.user_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint unique_user_tenant unique (user_id, tenant_id)
);

create index if not exists idx_user_memberships_user_id
  on public.user_memberships(user_id);
create index if not exists idx_user_memberships_tenant_id
  on public.user_memberships(tenant_id);

alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.user_memberships enable row level security;

drop policy if exists "users_read_self" on public.users;
create policy "users_read_self"
  on public.users for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "memberships_read_own" on public.user_memberships;
create policy "memberships_read_own"
  on public.user_memberships for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "tenants_read_member" on public.tenants;
create policy "tenants_read_member"
  on public.tenants for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_memberships membership
      where membership.tenant_id = tenants.id
        and membership.user_id = auth.uid()
    )
  );

grant select on public.users, public.tenants, public.user_memberships
  to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute procedure public.handle_new_auth_user();
