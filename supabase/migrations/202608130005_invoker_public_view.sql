drop view if exists public.public_help_requests;
create view public.public_help_requests with (security_invoker = true, security_barrier = true) as
select id, public_code, neighborhood, description, category, status,
       coalesce(verified_priority, declared_priority) as priority,
       public_latitude, public_longitude, created_at
from public.help_requests;

create policy "anonymous reads public request columns" on public.help_requests for select to anon using (true);
grant select (id, public_code, neighborhood, description, category, status, declared_priority, verified_priority, public_latitude, public_longitude, created_at) on public.help_requests to anon;
revoke all on public.public_help_requests from public;
grant select on public.public_help_requests to anon, authenticated;
