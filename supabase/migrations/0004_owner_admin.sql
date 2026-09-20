begin;

-- Schema only: never create, replace, or promote a production account here.
alter table public.user_memberships
  add column if not exists role text not null default 'admin';
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.user_memberships'::regclass and conname = 'user_memberships_role_check') then
    alter table public.user_memberships add constraint user_memberships_role_check check (role in ('owner', 'admin'));
  end if;
end;
$$;

revoke all on public.users, public.tenants, public.user_memberships from public, anon, authenticated;
grant select on public.users, public.tenants, public.user_memberships to authenticated;
grant all on public.users, public.tenants, public.user_memberships to service_role;
revoke all on public.tripdash_workspaces from public, anon, authenticated;
grant select on public.tripdash_workspaces to authenticated;
grant all on public.tripdash_workspaces to service_role;
revoke all on public.tripdash_google_connections from public, anon, authenticated;
grant all on public.tripdash_google_connections to service_role;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

-- users_read_self permits profile lookup without recursive membership policies.
drop policy if exists memberships_read_own on public.user_memberships;
create policy memberships_read_own on public.user_memberships for select to authenticated
using (user_id = (select auth.uid()) and role in ('owner', 'admin') and exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.status = 'active'
));
drop policy if exists tenants_read_member on public.tenants;
create policy tenants_read_member on public.tenants for select to authenticated
using (exists (
  select 1 from public.user_memberships m where m.user_id = (select auth.uid()) and m.tenant_id = tenants.id
));
drop policy if exists workspace_member_read on public.tripdash_workspaces;
create policy workspace_member_read on public.tripdash_workspaces for select to authenticated
using (exists (
  select 1 from public.user_memberships m where m.user_id = (select auth.uid()) and m.tenant_id = tripdash_workspaces.tenant_id
));

commit;
