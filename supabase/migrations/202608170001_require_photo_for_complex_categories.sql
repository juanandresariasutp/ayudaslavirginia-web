alter table public.help_requests
drop constraint if exists help_requests_request_photo_required;

alter table public.help_requests
add constraint help_requests_request_photo_required
check (
  category not in (
    'debris'::public.request_category,
    'moving'::public.request_category,
    'reconstruction'::public.request_category
  )
  or request_photo_path is not null
) not valid;

comment on constraint help_requests_request_photo_required on public.help_requests is
'Exige fotografía inicial únicamente para escombros, mudanza y acarreo, y reconstrucción; NOT VALID conserva registros históricos.';
