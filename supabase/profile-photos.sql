-- CONNECT profile photos / avatars.
-- Run in Supabase SQL Editor before deploying the matching app change.

alter table public.profiles
  add column if not exists avatar_url text;

-- Profiles have restricted column grants; explicitly allow a user to update only their avatar URL.
grant update (avatar_url) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'connect-avatars',
  'connect-avatars',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists connect_avatar_read on storage.objects;
create policy connect_avatar_read on storage.objects
  for select to public using (bucket_id = 'connect-avatars');

drop policy if exists connect_avatar_upload_own_folder on storage.objects;
create policy connect_avatar_upload_own_folder on storage.objects
  for insert to authenticated with check (
    bucket_id = 'connect-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists connect_avatar_update_own_folder on storage.objects;
create policy connect_avatar_update_own_folder on storage.objects
  for update to authenticated using (
    bucket_id = 'connect-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'connect-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists connect_avatar_delete_own_folder on storage.objects;
create policy connect_avatar_delete_own_folder on storage.objects
  for delete to authenticated using (
    bucket_id = 'connect-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
