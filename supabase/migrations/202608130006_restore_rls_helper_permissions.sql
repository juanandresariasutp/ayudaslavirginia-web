-- Las políticas RLS invocan estos helpers en el contexto del usuario autenticado.
-- Solo devuelven booleanos basados en auth.uid(); no exponen datos ni aceptan IDs.
grant execute on function public.is_active_admin() to authenticated;
grant execute on function public.is_superadmin() to authenticated;
