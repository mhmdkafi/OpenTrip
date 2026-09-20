-- Only for a NEW environment, after migrations 0001-0004.
-- Create the Auth account and tenant first. Replace the two NULLs with their
-- exact UUIDs. This intentionally does not choose an account by email/name.
-- Do not run this against an existing owner setup.
do $$
declare
  owner_user_id uuid := null;
  owner_tenant_id uuid := null;
begin
  if owner_user_id is null or owner_tenant_id is null then
    raise exception 'Set owner_user_id and owner_tenant_id explicitly before bootstrap';
  end if;
  if not exists (select 1 from auth.users where id=owner_user_id) or
     not exists (select 1 from public.tenants where id=owner_tenant_id) then
    raise exception 'Auth account or tenant does not exist';
  end if;
  if exists (select 1 from public.user_memberships where tenant_id=owner_tenant_id and role='owner') then
    raise exception 'This workspace already has an owner; bootstrap cancelled';
  end if;
  insert into public.users(id,email,status)
    select id,email,'active' from auth.users where id=owner_user_id
    on conflict(id) do nothing;
  insert into public.user_memberships(user_id,tenant_id,role)
    values(owner_user_id,owner_tenant_id,'owner')
    on conflict(user_id,tenant_id) do update set role='owner';
end;
$$;
