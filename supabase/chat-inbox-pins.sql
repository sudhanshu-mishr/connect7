-- CONNECT inbox pin support.
-- The inbox gracefully loads without this migration, but pin/unpin needs this column.
alter table public.conversation_members
  add column if not exists is_pinned boolean not null default false;

create index if not exists conversation_members_user_pinned_idx
  on public.conversation_members(user_id,is_pinned);
