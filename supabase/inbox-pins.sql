-- CONNECT inbox: persistent pinned conversations.
alter table public.conversation_members
  add column if not exists is_pinned boolean not null default false;

create index if not exists conversation_members_user_pinned_idx
  on public.conversation_members(user_id, is_pinned);

-- Existing conversation_members_update_self policy limits updates to the signed-in member's own row.
