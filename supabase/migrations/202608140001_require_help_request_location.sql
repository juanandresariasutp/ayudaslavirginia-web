create or replace function private.require_help_request_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.exact_latitude is null or new.exact_longitude is null then
    raise exception 'La ubicación es obligatoria para crear una solicitud.'
      using errcode = '23514',
            constraint = 'help_requests_location_required';
  end if;

  return new;
end;
$$;

revoke all on function private.require_help_request_location() from public, anon, authenticated;

drop trigger if exists require_help_request_location_trigger on public.help_requests;
create trigger require_help_request_location_trigger
before insert on public.help_requests
for each row execute function private.require_help_request_location();

comment on function private.require_help_request_location() is
  'Impide crear solicitudes sin coordenadas exactas, conservando editables los registros históricos.';
