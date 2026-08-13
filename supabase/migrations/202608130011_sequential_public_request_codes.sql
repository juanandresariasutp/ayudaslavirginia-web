create sequence if not exists public.help_request_public_code_seq;

with ordered_requests as (
  select id, row_number() over (order by created_at, id) as number
  from public.help_requests
)
update public.help_requests as request
set public_code = 'solicitud_' || lpad(ordered.number::text, 4, '0')
from ordered_requests as ordered
where request.id = ordered.id;

select setval(
  'public.help_request_public_code_seq',
  greatest((select count(*) from public.help_requests), 1),
  (select count(*) from public.help_requests) > 0
);

alter table public.help_requests
alter column public_code set default (
  'solicitud_' || lpad(nextval('public.help_request_public_code_seq')::text, 4, '0')
);

comment on column public.help_requests.public_code is
'Código público consecutivo legible; el UUID id permanece como clave interna.';

grant usage, select on sequence public.help_request_public_code_seq to anon, authenticated;
