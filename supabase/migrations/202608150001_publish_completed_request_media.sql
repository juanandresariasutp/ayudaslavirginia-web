create table public.completed_request_media (
  request_id uuid primary key references public.help_requests(id) on delete cascade,
  request_photo_path text,
  solution_photo_path text,
  published_at timestamptz not null default now()
);

alter table public.completed_request_media enable row level security;

create policy "public reads completed request media"
on public.completed_request_media for select
to anon, authenticated
using (true);

revoke all on public.completed_request_media from public, anon, authenticated;
grant select on public.completed_request_media to anon, authenticated;

create or replace function private.sync_completed_request_media_from_request()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  solution_path text;
begin
  if new.status <> 'completed' then
    delete from public.completed_request_media where request_id = new.id;
    return new;
  end if;

  select evidence_photo_path into solution_path
  from public.status_change_requests
  where help_request_id = new.id
    and target_status = 'completed'
    and state = 'approved'
    and evidence_photo_path is not null
  order by reviewed_at desc nulls last, created_at desc
  limit 1;

  insert into public.completed_request_media (
    request_id, request_photo_path, solution_photo_path, published_at
  ) values (
    new.id, new.request_photo_path, solution_path, now()
  )
  on conflict (request_id) do update
  set request_photo_path = excluded.request_photo_path,
      solution_photo_path = excluded.solution_photo_path,
      published_at = now();
  return new;
end;
$$;

revoke all on function private.sync_completed_request_media_from_request() from public, anon, authenticated;

create trigger sync_completed_request_media_from_request_trigger
after insert or update of status, request_photo_path on public.help_requests
for each row execute function private.sync_completed_request_media_from_request();

insert into public.completed_request_media (
  request_id, request_photo_path, solution_photo_path, published_at
)
select request.id,
       request.request_photo_path,
       solution.evidence_photo_path,
       coalesce(request.completed_at, request.updated_at, now())
from public.help_requests request
left join lateral (
  select change.evidence_photo_path
  from public.status_change_requests change
  where change.help_request_id = request.id
    and change.target_status = 'completed'
    and change.state = 'approved'
    and change.evidence_photo_path is not null
  order by change.reviewed_at desc nulls last, change.created_at desc
  limit 1
) solution on true
where request.status = 'completed'
on conflict (request_id) do update
set request_photo_path = excluded.request_photo_path,
    solution_photo_path = excluded.solution_photo_path,
    published_at = excluded.published_at;

create policy "public reads completed evidence files"
on storage.objects for select
to anon
using (
  bucket_id = 'request-evidence'
  and exists (
    select 1
    from public.completed_request_media media
    where media.request_photo_path = name
       or media.solution_photo_path = name
  )
);

comment on table public.completed_request_media is
'Rutas mínimas de fotografías publicables únicamente para solicitudes completadas.';
