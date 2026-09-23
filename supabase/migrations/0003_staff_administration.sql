-- Transactional, server-only staff administration.
create or replace function public.admin_create_staff_profile(
  p_actor_id uuid,
  p_profile_id uuid,
  p_display_name text,
  p_role text,
  p_branch_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = p_actor_id and role = 'administrator' and active = true
  ) then
    raise exception 'Acceso administrativo requerido';
  end if;

  insert into public.profiles (id, display_name, role, active)
  values (p_profile_id, p_display_name, p_role, true)
  on conflict (id) do update
    set display_name = excluded.display_name,
        role = excluded.role,
        active = true;

  delete from public.branch_memberships where profile_id = p_profile_id;
  insert into public.branch_memberships (profile_id, branch_id)
  select p_profile_id, branch_id
  from unnest(coalesce(p_branch_ids, array[]::uuid[])) as branch_id;

  insert into public.audit_events (
    actor_id, event_type, entity_type, entity_id, correlation_id, safe_metadata
  ) values (
    p_actor_id, 'staff.created', 'profile', p_profile_id, gen_random_uuid(),
    jsonb_build_object('role', p_role, 'branchIds', coalesce(p_branch_ids, array[]::uuid[]))
  );
end;
$$;

create or replace function public.admin_update_staff_profile(
  p_actor_id uuid,
  p_profile_id uuid,
  p_display_name text,
  p_role text,
  p_active boolean,
  p_branch_ids uuid[],
  p_changed_fields text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = p_actor_id and role = 'administrator' and active = true
  ) then
    raise exception 'Acceso administrativo requerido';
  end if;

  if p_actor_id = p_profile_id and p_active = false then
    raise exception 'No puede desactivar su propia cuenta';
  end if;

  update public.profiles
  set display_name = p_display_name,
      role = p_role,
      active = p_active
  where id = p_profile_id;

  if not found then
    raise exception 'Empleado no encontrado';
  end if;

  delete from public.branch_memberships where profile_id = p_profile_id;
  insert into public.branch_memberships (profile_id, branch_id)
  select p_profile_id, branch_id
  from unnest(coalesce(p_branch_ids, array[]::uuid[])) as branch_id;

  insert into public.audit_events (
    actor_id, event_type, entity_type, entity_id, correlation_id, safe_metadata
  ) values (
    p_actor_id, 'staff.updated', 'profile', p_profile_id, gen_random_uuid(),
    jsonb_build_object('changedFields', coalesce(p_changed_fields, array[]::text[]))
  );
end;
$$;

revoke all on function public.admin_create_staff_profile(uuid, uuid, text, text, uuid[]) from public, anon, authenticated;
revoke all on function public.admin_update_staff_profile(uuid, uuid, text, text, boolean, uuid[], text[]) from public, anon, authenticated;
grant execute on function public.admin_create_staff_profile(uuid, uuid, text, text, uuid[]) to service_role;
grant execute on function public.admin_update_staff_profile(uuid, uuid, text, text, boolean, uuid[], text[]) to service_role;
