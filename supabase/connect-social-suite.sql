-- CONNECT Social Suite migration
-- Creates Stories, Notes, Daily Prompts and Blends.
-- Stories use a private Storage bucket so the Connections audience is enforced for image files too.

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_path text not null,
  caption text not null default '' check (char_length(caption) <= 180),
  audience text not null default 'everyone' check (audience in ('everyone','connections')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists stories_active_idx on public.stories(expires_at desc);\ncreate index if not exists stories_user_id_idx on public.stories(user_id);
alter table public.stories enable row level security;
drop policy if exists stories_read_audience on public.stories;
create policy stories_read_audience on public.stories
for select to authenticated
using (
  expires_at > now()
  and (
    audience = 'everyone'
    or user_id = auth.uid()
    or exists (
      select 1 from public.connections c
      where (c.user_a = auth.uid() and c.user_b = stories.user_id)
         or (c.user_b = auth.uid() and c.user_a = stories.user_id)
    )
  )
);
drop policy if exists stories_insert_own on public.stories;
create policy stories_insert_own on public.stories for insert to authenticated with check (user_id = auth.uid());
drop policy if exists stories_delete_own on public.stories;
create policy stories_delete_own on public.stories for delete to authenticated using (user_id = auth.uid());

-- Private bucket. A viewer can read an image only when its Stories row is visible to them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('connect-stories', 'connect-stories', false, 8388608, array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set public = false, file_size_limit = 8388608,
  allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists connect_stories_upload_own on storage.objects;
create policy connect_stories_upload_own on storage.objects
for insert to authenticated
with check (bucket_id = 'connect-stories' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists connect_stories_read_visible on storage.objects;
create policy connect_stories_read_visible on storage.objects
for select to authenticated
using (
  bucket_id = 'connect-stories'
  and exists (
    select 1 from public.stories s
    where s.image_path = storage.objects.name
      and s.expires_at > now()
      and (
        s.audience = 'everyone'
        or s.user_id = auth.uid()
        or exists (
          select 1 from public.connections c
          where (c.user_a = auth.uid() and c.user_b = s.user_id)
             or (c.user_b = auth.uid() and c.user_a = s.user_id)
        )
      )
  )
);
drop policy if exists connect_stories_delete_own on storage.objects;
create policy connect_stories_delete_own on storage.objects
for delete to authenticated
using (bucket_id = 'connect-stories' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 100),
  audience text not null default 'everyone' check (audience in ('everyone','connections')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists notes_active_idx on public.notes(expires_at desc);\ncreate index if not exists notes_user_id_idx on public.notes(user_id);
alter table public.notes enable row level security;
drop policy if exists notes_read_audience on public.notes;
create policy notes_read_audience on public.notes
for select to authenticated
using (
  expires_at > now()
  and (
    audience = 'everyone'
    or user_id = auth.uid()
    or exists (
      select 1 from public.connections c
      where (c.user_a = auth.uid() and c.user_b = notes.user_id)
         or (c.user_b = auth.uid() and c.user_a = notes.user_id)
    )
  )
);
drop policy if exists notes_insert_own on public.notes;
create policy notes_insert_own on public.notes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists notes_delete_own on public.notes;
create policy notes_delete_own on public.notes for delete to authenticated using (user_id = auth.uid());

create table if not exists public.daily_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_date date not null unique default current_date,
  prompt text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.prompt_responses (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.daily_prompts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null check (char_length(response) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (prompt_id, user_id)
);
alter table public.daily_prompts enable row level security;
alter table public.prompt_responses enable row level security;
drop policy if exists prompts_read_auth on public.daily_prompts;
create policy prompts_read_auth on public.daily_prompts for select to authenticated using (true);
drop policy if exists prompt_responses_read_auth on public.prompt_responses;
create policy prompt_responses_read_auth on public.prompt_responses for select to authenticated using (true);
drop policy if exists prompt_responses_insert_own on public.prompt_responses;
create policy prompt_responses_insert_own on public.prompt_responses for insert to authenticated with check (user_id = auth.uid());
drop policy if exists prompt_responses_update_own on public.prompt_responses;
create policy prompt_responses_update_own on public.prompt_responses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.daily_prompts(prompt_date, prompt)
select current_date + n,
  (array[
    'What is one thing you wish more people understood about you?',
    'What small moment made your day better recently?',
    'What are you learning to let go of?',
    'What does a genuinely good friendship feel like?',
    'What is a goal you are quietly working toward?',
    'What belief have you changed your mind about?',
    'What experience would you love to share with a friend?',
    'What is something you are curious about right now?',
    'When do you feel most like yourself?',
    'What is one lesson you learned the hard way?',
    'What does being a good listener look like?',
    'What would you try if you were not afraid to fail?',
    'What kind of day makes you feel fulfilled?',
    'What is a small act of kindness you remember?',
    'What topic could you talk about for hours?',
    'What is one habit you want to build?',
    'What does trust mean to you?',
    'What is a place you would love to explore?',
    'What is something you are proud of but rarely mention?',
    'What helps you reset after a difficult week?',
    'What is a book, film, or song that changed your perspective?',
    'What makes a friendship feel safe?',
    'What is one thing you want to create?',
    'What is a boundary you have learned to value?',
    'What is a simple joy you never get tired of?',
    'What does personal growth mean to you?',
    'What is something you wish you had more time for?',
    'What is one question you wish people asked you?',
    'What is a memory that always makes you smile?',
    'What would your ideal weekend look like?'
  ])[1 + (n % 30)]
from generate_series(0, 365) as n
on conflict (prompt_date) do nothing;

create table if not exists public.blends (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 60),
  description text not null default '' check (char_length(description) <= 240),
  created_at timestamptz not null default now()
);
create table if not exists public.blend_members (
  blend_id uuid not null references public.blends(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (blend_id, user_id)
);
create table if not exists public.blend_items (
  id uuid primary key default gen_random_uuid(),
  blend_id uuid not null references public.blends(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.blends enable row level security;
alter table public.blend_members enable row level security;
alter table public.blend_items enable row level security;\ncreate index if not exists blend_members_user_id_idx on public.blend_members(user_id);

create or replace function public.is_connect_blend_member(p_blend_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blend_members
    where blend_id = p_blend_id and user_id = p_user_id
  );
$$;

create or replace function public.create_connect_blend(p_name text, p_description text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if char_length(trim(p_name)) < 3 then raise exception 'Blend name is too short'; end if;
  insert into public.blends(owner_id, name, description)
  values (auth.uid(), left(trim(p_name), 60), left(trim(coalesce(p_description, '')), 240))
  returning id into new_id;
  insert into public.blend_members(blend_id, user_id) values (new_id, auth.uid());
  return new_id;
end;
$$;
revoke all on function public.is_connect_blend_member(uuid, uuid) from public;
revoke all on function public.create_connect_blend(text, text) from public;\nrevoke all on table public.stories, public.notes, public.daily_prompts, public.prompt_responses, public.blends, public.blend_members, public.blend_items from anon, authenticated;\ngrant select, insert, delete on table public.stories, public.notes to authenticated;\ngrant select on table public.daily_prompts to authenticated;\ngrant select, insert, update on table public.prompt_responses to authenticated;\ngrant select on table public.blends to authenticated;\ngrant select, insert on table public.blend_members to authenticated;\ngrant select, insert on table public.blend_items to authenticated;
grant execute on function public.is_connect_blend_member(uuid, uuid) to authenticated;
grant execute on function public.create_connect_blend(text, text) to authenticated;

drop policy if exists blends_read_auth on public.blends;
create policy blends_read_auth on public.blends for select to authenticated using (true);
drop policy if exists blends_insert_owner on public.blends;
create policy blends_insert_owner on public.blends for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists blend_members_read on public.blend_members;
create policy blend_members_read on public.blend_members for select to authenticated
using (user_id = auth.uid() or public.is_connect_blend_member(blend_id, auth.uid()));
drop policy if exists blend_members_insert_self on public.blend_members;
create policy blend_members_insert_self on public.blend_members for insert to authenticated with check (user_id = auth.uid());
drop policy if exists blend_items_read_members on public.blend_items;
create policy blend_items_read_members on public.blend_items for select to authenticated
using (exists (select 1 from public.blend_members bm where bm.blend_id = blend_items.blend_id and bm.user_id = auth.uid()));
drop policy if exists blend_items_insert_members on public.blend_items;
create policy blend_items_insert_members on public.blend_items for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.blend_members bm where bm.blend_id = blend_items.blend_id and bm.user_id = auth.uid()));

notify pgrst, 'reload schema';
