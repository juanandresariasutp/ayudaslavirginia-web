alter table public.help_requests
add column if not exists privacy_consent_at timestamptz,
add column if not exists privacy_notice_version text,
add column if not exists human_confirmation_at timestamptz;

alter table public.help_requests
add constraint help_requests_new_consent_proof_required
check (
  privacy_consent_at is not null
  and privacy_notice_version is not null
  and human_confirmation_at is not null
) not valid;

comment on column public.help_requests.privacy_consent_at is
'Fecha en que el titular otorgó autorización previa, expresa e informada.';
comment on column public.help_requests.privacy_notice_version is
'Versión del aviso de tratamiento aceptado por el titular.';
comment on column public.help_requests.human_confirmation_at is
'Fecha de confirmación del control anti-bot presentado antes del envío.';

grant insert (
  privacy_consent_at,
  privacy_notice_version,
  human_confirmation_at
) on public.help_requests to anon, authenticated;
