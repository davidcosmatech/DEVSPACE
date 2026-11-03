-- ---------------------------------------------------------------------------
-- DEVSPACE 3.0 — private Markdown storage
-- Apply after migrations: npm run db:storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'markdown-files',
  'markdown-files',
  false,
  4194304,
  array['text/markdown', 'text/plain', 'text/x-markdown', 'application/octet-stream']
)
on conflict (id) do update
set public = false,
    file_size_limit = 4194304,
    allowed_mime_types = array['text/markdown', 'text/plain', 'text/x-markdown', 'application/octet-stream'];

-- Server-side uploads use the service-role key. These policies add defence in
-- depth if a Supabase client ever reads or writes the bucket directly. Objects
-- live at <user-id>/<uuid>-<filename>; only the owning user may access them.
drop policy if exists "markdown_select_own" on storage.objects;
create policy "markdown_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'markdown-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "markdown_insert_own" on storage.objects;
create policy "markdown_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'markdown-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "markdown_update_own" on storage.objects;
create policy "markdown_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'markdown-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'markdown-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "markdown_delete_own" on storage.objects;
create policy "markdown_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'markdown-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
