drop policy if exists "admins update requests" on public.help_requests;
create policy "superadmin updates requests" on public.help_requests for update to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
create policy "superadmin deletes requests" on public.help_requests for delete to authenticated using (public.is_superadmin());
grant delete on public.help_requests to authenticated;
