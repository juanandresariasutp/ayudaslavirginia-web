-- El superadministrador administra completamente las propuestas de cambio.
create policy "superadmin updates change requests" on public.status_change_requests
for update to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

create policy "superadmin deletes change requests" on public.status_change_requests
for delete to authenticated using (public.is_superadmin());

grant update, delete on public.status_change_requests to authenticated;

-- Los administradores normales siguen sin UPDATE/DELETE directo sobre solicitudes.
-- La única transición permitida para ellos continúa siendo approve_status_change(),
-- que valida is_active_admin(), registra auditoría y aplica el cambio atómicamente.
