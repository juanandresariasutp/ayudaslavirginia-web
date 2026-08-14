alter table public.help_requests
add column if not exists public_contact_phone text,
add column if not exists public_contact_address text,
add column if not exists public_contact_consent_at timestamptz,
add column if not exists public_contact_notice_version text;

create or replace function private.require_public_contact_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.public_contact_consent_at is null
     or new.public_contact_notice_version is distinct from '2026-08-14-v2'
     or new.public_contact_phone is distinct from new.phone
     or new.public_contact_address is distinct from new.exact_address then
    raise exception 'Debes autorizar expresamente la publicación del teléfono y la dirección.'
      using errcode = '23514',
            constraint = 'help_requests_public_contact_consent_required';
  end if;

  return new;
end;
$$;

revoke all on function private.require_public_contact_consent() from public, anon, authenticated;

drop trigger if exists require_public_contact_consent_trigger on public.help_requests;
create trigger require_public_contact_consent_trigger
before insert on public.help_requests
for each row execute function private.require_public_contact_consent();

drop view if exists public.public_help_requests;
create view public.public_help_requests
with (security_invoker = true, security_barrier = true) as
select id, public_code, neighborhood, description, category, status,
       coalesce(verified_priority, declared_priority) as priority,
       public_latitude, public_longitude,
       public_contact_phone as contact_phone,
       public_contact_address as contact_address,
       created_at
from public.help_requests;

grant insert (
  public_contact_phone,
  public_contact_address,
  public_contact_consent_at,
  public_contact_notice_version
) on public.help_requests to anon, authenticated;

grant select (
  public_contact_phone,
  public_contact_address
) on public.help_requests to anon, authenticated;

revoke all on public.public_help_requests from public;
grant select on public.public_help_requests to anon, authenticated;

comment on column public.help_requests.public_contact_consent_at is
  'Fecha de autorización expresa para publicar teléfono y dirección exacta.';
comment on column public.help_requests.public_contact_notice_version is
  'Versión del aviso específico de publicación de datos de contacto.';
