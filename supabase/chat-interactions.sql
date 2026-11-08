-- CONNECT chat message replies and reactions
alter table public.messages
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null;
create index if not exists messages_reply_to_idx on public.messages(reply_to_id);

create table if not exists public.message_reactions (
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references public.messages(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 emoji text not null check (emoji in ('❤️','😂','😍','🔥','👏','😮')),
 created_at timestamptz not null default now(),
 unique(message_id,user_id)
);
create index if not exists message_reactions_message_idx on public.message_reactions(message_id);
alter table public.message_reactions enable row level security;
drop policy if exists message_reactions_read_members on public.message_reactions;
create policy message_reactions_read_members on public.message_reactions
 for select to authenticated using (
  exists(select 1 from public.messages m join public.conversation_members cm on cm.conversation_id=m.conversation_id where m.id=message_id and cm.user_id=auth.uid())
 );
drop policy if exists message_reactions_insert_members on public.message_reactions;
create policy message_reactions_insert_members on public.message_reactions
 for insert to authenticated with check (
  user_id=auth.uid() and exists(select 1 from public.messages m join public.conversation_members cm on cm.conversation_id=m.conversation_id where m.id=message_id and cm.user_id=auth.uid())
 );
drop policy if exists message_reactions_update_own on public.message_reactions;
create policy message_reactions_update_own on public.message_reactions
 for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists message_reactions_delete_own on public.message_reactions;
create policy message_reactions_delete_own on public.message_reactions
 for delete to authenticated using (user_id=auth.uid());
