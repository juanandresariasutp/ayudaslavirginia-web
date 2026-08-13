create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'help_request_document_key'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'help_request_document_key',
      'Clave para cifrar documentos de solicitudes de ayuda'
    );
  end if;
end $$;

alter table public.help_requests
add column if not exists document_number_encrypted bytea,
add column if not exists document_number_bcrypt text;

-- La restricción NOT VALID se aplica a UPDATE; se retira durante la migración
-- de filas históricas y se restaura antes de aceptar nuevas escrituras.
alter table public.help_requests
drop constraint if exists help_requests_new_consent_proof_required;

update public.help_requests
set document_number_encrypted = extensions.pgp_sym_encrypt(
      document_number,
      (select decrypted_secret from vault.decrypted_secrets where name = 'help_request_document_key'),
      'cipher-algo=aes256, compress-algo=1'
    ),
    document_number_bcrypt = extensions.crypt(
      document_number,
      extensions.gen_salt('bf', 12)
    ),
    document_number = 'PROTEGIDO'
where document_number <> 'PROTEGIDO'
  and document_number_encrypted is null;

alter table public.help_requests
add constraint help_requests_new_consent_proof_required
check (
  privacy_consent_at is not null
  and privacy_notice_version is not null
  and human_confirmation_at is not null
) not valid;

create or replace function private.protect_help_request_document()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions, vault, pg_temp
as $$
declare
  encryption_key text;
begin
  if new.document_number is null or new.document_number = 'PROTEGIDO' then
    return new;
  end if;

  select decrypted_secret into encryption_key
  from vault.decrypted_secrets
  where name = 'help_request_document_key';

  if encryption_key is null then
    raise exception 'document encryption key unavailable';
  end if;

  new.document_number_encrypted := extensions.pgp_sym_encrypt(
    new.document_number,
    encryption_key,
    'cipher-algo=aes256, compress-algo=1'
  );
  new.document_number_bcrypt := extensions.crypt(
    new.document_number,
    extensions.gen_salt('bf', 12)
  );
  new.document_number := 'PROTEGIDO';
  return new;
end;
$$;

revoke all on function private.protect_help_request_document() from public, anon, authenticated;

drop trigger if exists protect_help_request_document_trigger on public.help_requests;
create trigger protect_help_request_document_trigger
before insert or update of document_number on public.help_requests
for each row execute function private.protect_help_request_document();

create or replace function public.get_private_help_request(request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, vault, pg_temp
as $$
declare
  request_row public.help_requests;
  encryption_key text;
begin
  if not exists (
    select 1 from public.admin_profiles
    where id = auth.uid() and active
  ) then
    raise exception 'not authorized';
  end if;

  select * into request_row
  from public.help_requests
  where id = request_id;

  if request_row.id is null then
    return null;
  end if;

  select decrypted_secret into encryption_key
  from vault.decrypted_secrets
  where name = 'help_request_document_key';

  return (to_jsonb(request_row)
    - 'document_number_encrypted'
    - 'document_number_bcrypt')
    || jsonb_build_object(
      'document_number',
      case when request_row.document_number_encrypted is null then 'No disponible'
      else extensions.pgp_sym_decrypt(request_row.document_number_encrypted, encryption_key)
      end
    );
end;
$$;

revoke all on function public.get_private_help_request(uuid) from public, anon;
grant execute on function public.get_private_help_request(uuid) to authenticated;

comment on column public.help_requests.document_number_encrypted is
'Documento cifrado con AES-256 mediante una clave almacenada en Supabase Vault.';
comment on column public.help_requests.document_number_bcrypt is
'Hash bcrypt irreversible para comprobaciones sin revelar el documento.';
