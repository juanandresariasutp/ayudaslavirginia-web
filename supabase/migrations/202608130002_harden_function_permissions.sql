revoke all on function public.approve_status_change(uuid, boolean, text) from public, anon;
revoke all on function public.is_active_admin() from public, anon, authenticated;
revoke all on function public.is_superadmin() from public, anon, authenticated;
grant execute on function public.approve_status_change(uuid, boolean, text) to authenticated;
