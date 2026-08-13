drop policy if exists "admins read profiles" on public.admin_profiles;
create policy "admin reads own profile" on public.admin_profiles
for select to authenticated using (id = auth.uid() and active);

-- La política ALL del superadmin permanece vigente y le permite leer y administrar todos.
