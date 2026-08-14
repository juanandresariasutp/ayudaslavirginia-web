alter table public.collection_centers
  alter column address set default '';

alter table public.collection_centers
  drop constraint if exists collection_centers_address_check;

alter table public.collection_centers
  add constraint collection_centers_address_check
  check (address = '' or char_length(trim(address)) between 5 and 240);

comment on column public.collection_centers.address is
'Dirección textual opcional; la ubicación mediante coordenadas continúa siendo obligatoria.';
