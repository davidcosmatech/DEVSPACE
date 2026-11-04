-- ---------------------------------------------------------------------------
-- DEVSPACE 3.0 — Row Level Security (run against Supabase PostgreSQL)
-- Apply after Drizzle migrations: npm run db:rls
-- ---------------------------------------------------------------------------

-- Tie profiles to Supabase Auth identities. The app creates profile rows after
-- the first verified session, so this FK protects lifecycle cleanup.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_id_auth_users_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_auth_users_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.notes enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_links enable row level security;
alter table public.tracker_files enable row level security;
alter table public.user_settings enable row level security;
alter table public.tickets enable row level security;

-- Development-only tables exist in the schema but are never exposed. With RLS
-- enabled and no policies, anon/authenticated clients are denied by default.
alter table public.local_accounts enable row level security;
alter table public.password_resets enable row level security;

-- Profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

-- Projects ------------------------------------------------------------------
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Notes ---------------------------------------------------------------------
drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Workspaces ----------------------------------------------------------------
drop policy if exists "workspaces_select_own" on public.workspaces;
create policy "workspaces_select_own" on public.workspaces
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "workspaces_insert_own" on public.workspaces;
create policy "workspaces_insert_own" on public.workspaces
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "workspaces_update_own" on public.workspaces;
create policy "workspaces_update_own" on public.workspaces
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "workspaces_delete_own" on public.workspaces;
create policy "workspaces_delete_own" on public.workspaces
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Workspace links -----------------------------------------------------------
drop policy if exists "workspace_links_select_own" on public.workspace_links;
create policy "workspace_links_select_own" on public.workspace_links
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "workspace_links_insert_own" on public.workspace_links;
create policy "workspace_links_insert_own" on public.workspace_links
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.user_id = (select auth.uid())
    )
  );

drop policy if exists "workspace_links_update_own" on public.workspace_links;
create policy "workspace_links_update_own" on public.workspace_links
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.user_id = (select auth.uid())
    )
  );

drop policy if exists "workspace_links_delete_own" on public.workspace_links;
create policy "workspace_links_delete_own" on public.workspace_links
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Tracker files -------------------------------------------------------------
drop policy if exists "tracker_files_select_own" on public.tracker_files;
create policy "tracker_files_select_own" on public.tracker_files
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "tracker_files_insert_own" on public.tracker_files;
create policy "tracker_files_insert_own" on public.tracker_files
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "tracker_files_update_own" on public.tracker_files;
create policy "tracker_files_update_own" on public.tracker_files
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "tracker_files_delete_own" on public.tracker_files;
create policy "tracker_files_delete_own" on public.tracker_files
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Settings ------------------------------------------------------------------
drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own" on public.user_settings
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Support tickets ------------------------------------------------------------
drop policy if exists "tickets_select_own" on public.tickets;
create policy "tickets_select_own" on public.tickets
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "tickets_insert_own" on public.tickets;
create policy "tickets_insert_own" on public.tickets
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "tickets_update_own" on public.tickets;
create policy "tickets_update_own" on public.tickets
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "tickets_delete_own" on public.tickets;
create policy "tickets_delete_own" on public.tickets
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Role and status are managed only by the server (admin actions). Browser
-- clients must never be able to promote or reactivate an account themselves.
revoke update (role, status) on public.profiles from authenticated;
revoke update (role, status) on public.profiles from anon;
