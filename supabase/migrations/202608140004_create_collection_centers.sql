create table public.collection_centers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 120),
  address text not null default '' check (address = '' or char_length(trim(address)) between 5 and 240),
  description text not null default '' check (char_length(description) <= 1000),
  phone text check (phone is null or phone ~ '^3[0-9]{9}$'),
  opening_hours text not null default '' check (char_length(opening_hours) <= 240),
  accepted_items text not null default '' check (char_length(accepted_items) <= 500),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index collection_centers_active_idx on public.collection_centers (active, name);

alter table public.collection_centers enable row level security;

create policy "public reads active collection centers"
on public.collection_centers for select
to anon
using (active);

create policy "authenticated reads permitted collection centers"
on public.collection_centers for select
to authenticated
using (active or (select public.is_superadmin()));

create policy "superadmin creates collection centers"
on public.collection_centers for insert
to authenticated
with check ((select public.is_superadmin()));

create policy "superadmin updates collection centers"
on public.collection_centers for update
to authenticated
using ((select public.is_superadmin()))
with check ((select public.is_superadmin()));

create policy "superadmin deletes collection centers"
on public.collection_centers for delete
to authenticated
using ((select public.is_superadmin()));

revoke all on public.collection_centers from public, anon, authenticated;
grant select on public.collection_centers to anon, authenticated;
grant insert, update, delete on public.collection_centers to authenticated;

comment on table public.collection_centers is
'Centros de acopio visibles para la comunidad y administrados exclusivamente por superadministradores.';
