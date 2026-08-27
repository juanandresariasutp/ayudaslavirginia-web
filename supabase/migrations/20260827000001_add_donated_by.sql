-- Migración: Agregar campo opcional donated_by a help_requests y status_change_requests

alter table public.help_requests add column if not exists donated_by text null;
alter table public.status_change_requests add column if not exists donated_by text null;

-- Actualizar función approve_status_change con parámetro opcional p_donated_by
create or replace function public.approve_status_change(
  change_id uuid,
  approve boolean,
  reason text default null,
  p_donated_by text default null
)
returns void language plpgsql security definer set search_path = public
as $$
declare change_row public.status_change_requests;
begin
  if not public.is_active_admin() then raise exception 'not authorized'; end if;

  select * into change_row from public.status_change_requests where id = change_id and state = 'pending' for update;
  if not found then raise exception 'change request not found or reviewed'; end if;

  update public.status_change_requests set
    state = case when approve then 'approved'::public.change_state else 'rejected'::public.change_state end,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    rejection_reason = case when approve then null else reason end,
    donated_by = coalesce(p_donated_by, donated_by)
  where id = change_id;

  if approve then
    update public.help_requests set
      status = change_row.target_status,
      updated_at = now(),
      completed_at = case when change_row.target_status = 'completed' then now() else completed_at end,
      donated_by = coalesce(p_donated_by, donated_by)
    where id = change_row.help_request_id;
  end if;

  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, metadata)
  values(
    auth.uid(),
    case when approve then 'approve_status_change' else 'reject_status_change' end,
    'status_change_request',
    change_id,
    jsonb_build_object('reason', reason, 'donated_by', p_donated_by)
  );
end $$;

grant execute on function public.approve_status_change(uuid, boolean, text, text) to authenticated;

-- Actualizar vista pública para proyectar donated_by
create or replace view public.public_help_requests with (security_invoker = true) as
select id, public_code, neighborhood, description, category, status,
       coalesce(verified_priority, declared_priority) as priority,
       public_latitude, public_longitude, created_at, donated_by
from public.help_requests;

-- Otorgar permisos de selección del campo donated_by en public.help_requests
grant select (id, public_code, neighborhood, description, category, status, declared_priority, verified_priority, public_latitude, public_longitude, created_at, donated_by) on public.help_requests to anon, authenticated;
