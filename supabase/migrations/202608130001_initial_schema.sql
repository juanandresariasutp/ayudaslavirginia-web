create extension if not exists pgcrypto;

create type public.admin_role as enum ('superadmin', 'admin');
create type public.request_status as enum ('pending', 'in_progress', 'completed');
create type public.request_priority as enum ('critical', 'high', 'medium', 'low');
create type public.request_category as enum ('food', 'debris', 'moving', 'cleaning_supplies', 'toys', 'health', 'shelter', 'other');
create type public.change_state as enum ('pending', 'approved', 'rejected');

create table public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 3 and 120),
  role public.admin_role not null default 'admin',
  active boolean not null default true,
  created_by uuid references public.admin_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique default ('LVR-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  full_name text not null check (char_length(full_name) between 3 and 120),
  document_type text not null,
  document_number text not null,
  phone text not null,
  neighborhood text not null,
  exact_address text not null,
  description text not null check (char_length(description) between 10 and 2000),
  category public.request_category not null,
  status public.request_status not null default 'pending',
  declared_priority public.request_priority not null default 'medium',
  verified_priority public.request_priority,
  exact_latitude double precision,
  exact_longitude double precision,
  public_latitude double precision generated always as (round(exact_latitude::numeric, 3)::double precision) stored,
  public_longitude double precision generated always as (round(exact_longitude::numeric, 3)::double precision) stored,
  request_photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((exact_latitude is null and exact_longitude is null) or (exact_latitude between -90 and 90 and exact_longitude between -180 and 180)),
  check (category not in ('debris', 'moving') or request_photo_path is not null)
);

create table public.status_change_requests (
  id uuid primary key default gen_random_uuid(),
  help_request_id uuid not null references public.help_requests(id) on delete cascade,
  target_status public.request_status not null check (target_status in ('in_progress', 'completed')),
  responsible_name text not null check (char_length(responsible_name) between 3 and 120),
  responsible_phone text not null,
  notes text,
  evidence_photo_path text,
  signature_data text,
  state public.change_state not null default 'pending',
  reviewed_by uuid references public.admin_profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  check (
    (target_status = 'in_progress' and evidence_photo_path is not null and signature_data is not null)
    or target_status = 'completed'
  )
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.admin_profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index help_requests_public_order_idx on public.help_requests (status, verified_priority, declared_priority, created_at desc);
create index help_requests_location_idx on public.help_requests (public_latitude, public_longitude) where public_latitude is not null;
create index status_changes_review_idx on public.status_change_requests (state, created_at);

create view public.public_help_requests with (security_invoker = true) as
select id, public_code, neighborhood, description, category, status,
       coalesce(verified_priority, declared_priority) as priority,
       public_latitude, public_longitude, created_at
from public.help_requests;

create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_profiles where id = auth.uid() and active) $$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_profiles where id = auth.uid() and active and role = 'superadmin') $$;

create or replace function public.approve_status_change(change_id uuid, approve boolean, reason text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare change_row public.status_change_requests;
begin
  if not public.is_active_admin() then raise exception 'not authorized'; end if;
  select * into change_row from public.status_change_requests where id = change_id and state = 'pending' for update;
  if not found then raise exception 'change request not found or reviewed'; end if;
  update public.status_change_requests set state = case when approve then 'approved'::public.change_state else 'rejected'::public.change_state end,
    reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = case when approve then null else reason end where id = change_id;
  if approve then
    update public.help_requests set status = change_row.target_status, updated_at = now(),
      completed_at = case when change_row.target_status = 'completed' then now() else completed_at end where id = change_row.help_request_id;
  end if;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), case when approve then 'approve_status_change' else 'reject_status_change' end, 'status_change_request', change_id, jsonb_build_object('reason', reason));
end $$;

alter table public.admin_profiles enable row level security;
alter table public.help_requests enable row level security;
alter table public.status_change_requests enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "public reads anonymized requests" on public.help_requests for select to anon, authenticated using (true);
create policy "public submits requests" on public.help_requests for insert to anon, authenticated with check (status = 'pending' and verified_priority is null and completed_at is null);
create policy "admins update requests" on public.help_requests for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "public submits status changes" on public.status_change_requests for insert to anon, authenticated with check (state = 'pending' and reviewed_by is null and reviewed_at is null);
create policy "admins read status changes" on public.status_change_requests for select to authenticated using (public.is_active_admin());
create policy "admins read profiles" on public.admin_profiles for select to authenticated using (public.is_active_admin());
create policy "superadmin manages profiles" on public.admin_profiles for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
create policy "superadmin reads audit" on public.admin_audit_log for select to authenticated using (public.is_superadmin());

revoke all on public.help_requests from anon, authenticated;
grant select (id, public_code, neighborhood, description, category, status, declared_priority, verified_priority, public_latitude, public_longitude, created_at) on public.help_requests to anon, authenticated;
grant insert (full_name, document_type, document_number, phone, neighborhood, exact_address, description, category, declared_priority, exact_latitude, exact_longitude, request_photo_path) on public.help_requests to anon, authenticated;
grant select, update on public.help_requests to authenticated;
grant insert (help_request_id, target_status, responsible_name, responsible_phone, notes, evidence_photo_path, signature_data) on public.status_change_requests to anon, authenticated;
grant select on public.status_change_requests to authenticated;
grant select on public.admin_profiles to authenticated;
grant execute on function public.approve_status_change(uuid, boolean, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-evidence', 'request-evidence', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "public uploads evidence" on storage.objects for insert to anon, authenticated
with check (bucket_id = 'request-evidence' and (storage.foldername(name))[1] in ('requests', 'changes'));
create policy "admins read evidence" on storage.objects for select to authenticated
using (bucket_id = 'request-evidence' and public.is_active_admin());
create policy "superadmin deletes evidence" on storage.objects for delete to authenticated
using (bucket_id = 'request-evidence' and public.is_superadmin());
