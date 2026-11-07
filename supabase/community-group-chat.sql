-- CONNECT: create one shared group conversation per community and keep membership in sync.
-- Run this migration once in the Supabase SQL Editor.

-- Remove accidental duplicate group conversations before enforcing one chat per group.
with ranked as (
  select id,row_number() over(partition by group_id order by created_at,id) as rn
  from public.conversations
  where type='group' and group_id is not null
)
delete from public.conversations c using ranked r
where c.id=r.id and r.rn>1;

create unique index if not exists conversations_one_group_chat
on public.conversations(group_id)
where type='group' and group_id is not null;

-- Backfill a group conversation for every existing community.
insert into public.conversations(type,title,group_id)
select 'group',g.name,g.id
from public.groups g
where not exists (
  select 1 from public.conversations c
  where c.type='group' and c.group_id=g.id
)
on conflict do nothing;

-- Backfill all existing community members into the matching conversation.
insert into public.conversation_members(conversation_id,user_id)
select c.id,gm.user_id
from public.conversations c
join public.group_members gm on gm.group_id=c.group_id
where c.type='group'
on conflict(conversation_id,user_id) do nothing;

-- Create a chat automatically for each new community.
create or replace function public.create_group_conversation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.conversations(type,title,group_id)
  values('group',new.name,new.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_group_created_00_create_conversation on public.groups;
create trigger on_group_created_00_create_conversation
after insert on public.groups
for each row execute function public.create_group_conversation();

-- Whenever a person joins a community, add them to its shared conversation.
create or replace function public.sync_group_member_to_conversation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.conversation_members(conversation_id,user_id)
  select c.id,new.user_id
  from public.conversations c
  where c.type='group' and c.group_id=new.group_id
  on conflict(conversation_id,user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_group_member_joined_add_chat_member on public.group_members;
create trigger on_group_member_joined_add_chat_member
after insert on public.group_members
for each row execute function public.sync_group_member_to_conversation();

-- Return only safe profile fields, and only to members of that community.
create or replace function public.get_group_members(p_group_id uuid)
returns table(
  id uuid,
  full_name text,
  username text,
  bio text,
  city text,
  interests text[]
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if auth.uid() is null or not exists(
    select 1 from public.group_members gm
    where gm.group_id=p_group_id and gm.user_id=auth.uid()
  ) then
    raise exception 'Join this community to view its members';
  end if;

  return query
  select p.id,p.full_name,p.username,coalesce(p.bio,''),coalesce(p.city,''),p.interests
  from public.group_members gm
  join public.profiles p on p.id=gm.user_id
  where gm.group_id=p_group_id
  order by gm.joined_at asc;
end;
$$;

grant execute on function public.get_group_members(uuid) to authenticated;

notify pgrst,'reload schema';
