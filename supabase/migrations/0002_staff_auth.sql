-- Provision least-privilege staff profiles from Supabase Auth.
create or replace function public.handle_new_staff_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role, active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), new.email, 'Usuario'),
    'attention',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_staff_user() from public;

-- The trigger owns initial profile creation. Roles are promoted only by server-side administration.
drop trigger if exists on_auth_user_created_create_staff_profile on auth.users;
create trigger on_auth_user_created_create_staff_profile
after insert on auth.users
for each row execute function public.handle_new_staff_user();

alter table public.branch_memberships enable row level security;
drop policy if exists "memberships read own" on public.branch_memberships;
create policy "memberships read own"
on public.branch_memberships
for select
to authenticated
using (profile_id = auth.uid());

create index if not exists branch_memberships_branch_idx
  on public.branch_memberships(branch_id, profile_id);
