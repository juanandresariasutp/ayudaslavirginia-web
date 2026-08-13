-- Desde esta versión, todo cambio de estado nuevo requiere evidencia y firma.
-- NOT VALID conserva el historial anterior que fue creado bajo reglas distintas,
-- pero PostgreSQL aplica esta condición a todos los INSERT y UPDATE nuevos.
alter table public.status_change_requests
drop constraint if exists status_change_requests_check;

alter table public.status_change_requests
add constraint status_change_requests_evidence_and_signature_required
check (evidence_photo_path is not null and signature_data is not null) not valid;

comment on constraint status_change_requests_evidence_and_signature_required
on public.status_change_requests is
'Toda propuesta de cambio nueva requiere fotografía de evidencia y firma SVG.';
