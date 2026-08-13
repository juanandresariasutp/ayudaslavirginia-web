drop policy if exists "public reads anonymized requests" on public.help_requests;
create policy "admins read private requests" on public.help_requests for select to authenticated using (public.is_active_admin());

drop view if exists public.public_help_requests;
create view public.public_help_requests
with (security_barrier = true) as
select id, public_code, neighborhood, description, category, status,
       coalesce(verified_priority, declared_priority) as priority,
       public_latitude, public_longitude, created_at
from public.help_requests;

revoke all on public.help_requests from anon;
revoke all on public.help_requests from authenticated;
grant insert (full_name, document_type, document_number, phone, neighborhood, exact_address, description, category, declared_priority, exact_latitude, exact_longitude, request_photo_path) on public.help_requests to anon, authenticated;
grant select, update on public.help_requests to authenticated;
revoke all on public.public_help_requests from public;
grant select on public.public_help_requests to anon, authenticated;
