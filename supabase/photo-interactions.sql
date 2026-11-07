-- CONNECT photo comments, replies, and saved posts
-- Run this once in the Supabase SQL Editor before deploying the matching app changes.

create table if not exists public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.photo_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.photo_comments(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists photo_comments_post_created_idx
  on public.photo_comments(post_id, created_at asc);
create index if not exists photo_comments_parent_idx
  on public.photo_comments(parent_id);

alter table public.photo_comments enable row level security;
drop policy if exists photo_comments_select_auth on public.photo_comments;
create policy photo_comments_select_auth on public.photo_comments
  for select to authenticated using (true);
drop policy if exists photo_comments_insert_own on public.photo_comments;
create policy photo_comments_insert_own on public.photo_comments
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.photo_posts p where p.id = post_id)
    and (parent_id is null or exists (
      select 1 from public.photo_comments parent
      where parent.id = public.photo_comments.parent_id and parent.post_id = public.photo_comments.post_id
    ))
  );
drop policy if exists photo_comments_delete_own on public.photo_comments;
create policy photo_comments_delete_own on public.photo_comments
  for delete to authenticated using (user_id = auth.uid());

create table if not exists public.photo_bookmarks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.photo_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create index if not exists photo_bookmarks_user_created_idx
  on public.photo_bookmarks(user_id, created_at desc);
alter table public.photo_bookmarks enable row level security;
drop policy if exists photo_bookmarks_select_own on public.photo_bookmarks;
create policy photo_bookmarks_select_own on public.photo_bookmarks
  for select to authenticated using (user_id = auth.uid());
drop policy if exists photo_bookmarks_insert_own on public.photo_bookmarks;
create policy photo_bookmarks_insert_own on public.photo_bookmarks
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists photo_bookmarks_delete_own on public.photo_bookmarks;
create policy photo_bookmarks_delete_own on public.photo_bookmarks
  for delete to authenticated using (user_id = auth.uid());
