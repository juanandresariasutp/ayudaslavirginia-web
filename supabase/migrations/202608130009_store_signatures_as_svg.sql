comment on column public.status_change_requests.signature_data is
'Documento SVG de la firma digital. Debe comenzar con <svg y nunca contener scripts.';

alter table public.status_change_requests
add constraint signature_data_is_svg
check (signature_data is null or ltrim(signature_data) like '<svg%') not valid;

alter table public.status_change_requests validate constraint signature_data_is_svg;
