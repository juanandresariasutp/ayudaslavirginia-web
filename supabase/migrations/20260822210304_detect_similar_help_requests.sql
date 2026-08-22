create or replace function public.detect_similar_help_requests()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  encryption_key text;
  result jsonb;
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.admin_profiles
    where id = (select auth.uid())
      and active
      and role in ('admin', 'superadmin')
  ) then
    raise exception 'not authorized';
  end if;

  select decrypted_secret
  into encryption_key
  from vault.decrypted_secrets
  where name = 'help_request_document_key';

  if encryption_key is null then
    raise exception 'document encryption key unavailable';
  end if;

  with normalized_requests as materialized (
    select
      request.id,
      request.public_code,
      request.document_type,
      request.neighborhood,
      request.category,
      request.status,
      request.created_at,
      case
        when request.document_number_encrypted is null then null
        else extensions.pgp_sym_decrypt(
          request.document_number_encrypted,
          encryption_key
        )
      end as document_number,
      nullif(regexp_replace(request.phone, '[^0-9]', '', 'g'), '') as phone_number
    from public.help_requests as request
  ), duplicate_groups as (
    select
      'document'::text as match_type,
      ('••••' || right(document_number, 4))::text as masked_value,
      count(*)::integer as request_count,
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'public_code', public_code,
          'neighborhood', neighborhood,
          'category', category,
          'status', status,
          'created_at', created_at
        )
        order by created_at desc
      ) as requests
    from normalized_requests
    where document_number is not null
      and document_number not in ('', 'PROTEGIDO', 'No disponible')
    group by document_type, document_number
    having count(*) > 1

    union all

    select
      'phone'::text as match_type,
      (left(phone_number, 3) || ' ••• •' || right(phone_number, 3))::text as masked_value,
      count(*)::integer as request_count,
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'public_code', public_code,
          'neighborhood', neighborhood,
          'category', category,
          'status', status,
          'created_at', created_at
        )
        order by created_at desc
      ) as requests
    from normalized_requests
    where phone_number is not null
      and length(phone_number) >= 7
    group by phone_number
    having count(*) > 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'match_type', match_type,
        'masked_value', masked_value,
        'request_count', request_count,
        'requests', requests
      )
      order by request_count desc, match_type, masked_value
    ),
    '[]'::jsonb
  )
  into result
  from duplicate_groups;

  return result;
end;
$$;

revoke all on function public.detect_similar_help_requests() from public, anon;
grant execute on function public.detect_similar_help_requests() to authenticated;

comment on function public.detect_similar_help_requests() is
'Detecta solicitudes con documento o teléfono repetidos para administradores activos y devuelve únicamente identificadores enmascarados.';
