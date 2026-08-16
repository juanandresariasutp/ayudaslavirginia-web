drop view if exists public.public_help_requests;

create view public.public_help_requests
with (security_invoker = true, security_barrier = true) as
select id, public_code, neighborhood, description, category, status,
       coalesce(verified_priority, declared_priority) as priority,
       public_latitude, public_longitude,
       public_contact_phone as contact_phone,
       public_contact_address as contact_address,
       request_photo_path,
       created_at
from public.help_requests;

grant select (request_photo_path) on public.help_requests to anon, authenticated;

revoke all on public.public_help_requests from public;
grant select on public.public_help_requests to anon, authenticated;

drop policy if exists "public reads request photographs" on storage.objects;
create policy "public reads request photographs"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'request-evidence'
  and exists (
    select 1
    from public.help_requests request
    where request.request_photo_path = name
  )
);

comment on view public.public_help_requests is
'Información comunitaria autorizada, incluida la ruta de la fotografía inicial de cada solicitud.';
