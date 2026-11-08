-- CONNECT story reactions and private story replies
create table if not exists public.story_reactions (
 id uuid primary key default gen_random_uuid(),
 story_id uuid not null references public.stories(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 emoji text not null check (emoji in ('❤️','😂','😍','🔥','👏','😮')),
 created_at timestamptz not null default now(),
 unique(story_id,user_id)
);
create index if not exists story_reactions_story_idx on public.story_reactions(story_id);
alter table public.story_reactions enable row level security;
drop policy if exists story_reactions_read on public.story_reactions;
create policy story_reactions_read on public.story_reactions for select to authenticated using (true);
drop policy if exists story_reactions_insert_own on public.story_reactions;
create policy story_reactions_insert_own on public.story_reactions for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.stories s where s.id=story_id));
drop policy if exists story_reactions_update_own on public.story_reactions;
create policy story_reactions_update_own on public.story_reactions for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists story_reactions_delete_own on public.story_reactions;
create policy story_reactions_delete_own on public.story_reactions for delete to authenticated using (user_id=auth.uid());

create table if not exists public.story_replies (
 id uuid primary key default gen_random_uuid(),
 story_id uuid not null references public.stories(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 content text not null check (length(trim(content)) between 1 and 300),
 created_at timestamptz not null default now()
);
create index if not exists story_replies_recipient_idx on public.story_replies(recipient_id,created_at desc);
alter table public.story_replies enable row level security;
drop policy if exists story_replies_participant_read on public.story_replies;
create policy story_replies_participant_read on public.story_replies for select to authenticated using (sender_id=auth.uid() or recipient_id=auth.uid());
drop policy if exists story_replies_sender_insert on public.story_replies;
create policy story_replies_sender_insert on public.story_replies for insert to authenticated with check (sender_id=auth.uid() and sender_id<>recipient_id and exists(select 1 from public.stories s where s.id=story_id and s.user_id=recipient_id));
