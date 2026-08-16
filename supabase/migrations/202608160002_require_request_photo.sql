alter table public.help_requests
drop constraint if exists help_requests_check1;

alter table public.help_requests
add constraint help_requests_request_photo_required
check (request_photo_path is not null) not valid;

create or replace function private.require_public_contact_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.public_contact_consent_at is null
     or new.public_contact_notice_version is distinct from '2026-08-16-v3'
     or new.public_contact_phone is distinct from new.phone
     or new.public_contact_address is distinct from new.exact_address then
    raise exception 'Debes autorizar expresamente la publicación del teléfono, la dirección y la fotografía.'
      using errcode = '23514',
            constraint = 'help_requests_public_contact_consent_required';
  end if;

  return new;
end;
$$;

revoke all on function private.require_public_contact_consent() from public, anon, authenticated;

comment on constraint help_requests_request_photo_required on public.help_requests is
'Exige fotografía inicial en toda solicitud nueva; NOT VALID conserva registros históricos sin imagen.';
