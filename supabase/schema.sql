-- CONNECT schema. Run once in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text not null unique,
  bio text default '',
  city text default '',
  interests text[] not null default '{}',
  assessment_completed boolean not null default false,
  is_discoverable boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.assessment_answers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  answers jsonb not null,
  completed_at timestamptz not null default now()
);
create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz not null default now(),
  unique(from_user,to_user),
  check(from_user <> to_user)
);
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_a,user_b), check(user_a < user_b)
);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'private' check(type in ('private','group')),
  title text,
  group_id uuid,
  created_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  primary key(conversation_id,user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check(length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check(length(name) between 3 and 70),
  description text default '',
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check(role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);
create table if not exists public.photo_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  caption text default '' check(length(caption) <= 240),
  created_at timestamptz not null default now()
);
create table if not exists public.photo_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.photo_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id,user_id)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check(target_type in ('user','message','group','photo_post')),
  target_id uuid not null,
  reason text not null,
  details text default '',
  status text not null default 'open' check(status in ('open','reviewed','actioned','dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_discoverable on public.profiles(assessment_completed,is_discoverable);
create index if not exists idx_requests_to_status on public.connection_requests(to_user,status);
create index if not exists idx_messages_conversation_date on public.messages(conversation_id,created_at);
create index if not exists idx_posts_created on public.photo_posts(created_at desc);

-- SECURITY DEFINER helper avoids recursive RLS evaluation when checking conversation membership.
create or replace function public.is_conversation_member(uid uuid, cid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.conversation_members where conversation_id=cid and user_id=uid);
$$;

-- RLS is enabled on every user-facing table.
do $$ declare t text; begin
  foreach t in array array['profiles','assessment_answers','connection_requests','connections','conversations','conversation_members','messages','groups','group_members','photo_posts','photo_likes','notifications','user_reports'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

-- Profiles: authenticated members can view discoverable profiles; owners can edit themselves.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (id = auth.uid() or is_discoverable = true);
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Assessment answers are private to their owner.
create policy "answers_select_own" on public.assessment_answers for select to authenticated using (user_id = auth.uid());
create policy "answers_insert_own" on public.assessment_answers for insert to authenticated with check (user_id = auth.uid());
create policy "answers_update_own" on public.assessment_answers for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Requests are visible to sender and recipient. Only recipient can accept/reject; sender can cancel.
create policy "requests_select_participant" on public.connection_requests for select to authenticated using (from_user = auth.uid() or to_user = auth.uid());
create policy "requests_insert_sender" on public.connection_requests for insert to authenticated with check (from_user = auth.uid());
create policy "requests_update_recipient" on public.connection_requests for update to authenticated using (to_user=auth.uid() and status='pending') with check (to_user=auth.uid() and status in ('accepted','rejected'));
create policy "requests_update_sender" on public.connection_requests for update to authenticated using (from_user=auth.uid() and status in ('pending','rejected','cancelled')) with check (from_user=auth.uid() and status in ('pending','cancelled'));
create policy "connections_select_participant" on public.connections for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());

-- Conversations and messages are restricted to members.
create policy "conversations_select_member" on public.conversations for select to authenticated using (public.is_conversation_member(auth.uid(),id));
create policy "conversations_insert_auth" on public.conversations for insert to authenticated with check (true);
create policy "conversation_members_select_member" on public.conversation_members for select to authenticated using (user_id=auth.uid() or public.is_conversation_member(auth.uid(),conversation_id));
create policy "conversation_members_insert_group_member" on public.conversation_members for insert to authenticated with check (
  user_id=auth.uid() and exists(
    select 1 from public.conversations c join public.group_members gm on gm.group_id=c.group_id
    where c.id=conversation_id and c.type='group' and gm.user_id=auth.uid()
  )
);
create policy "conversation_members_update_self" on public.conversation_members for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "messages_select_member" on public.messages for select to authenticated using (exists(select 1 from public.conversation_members m where m.conversation_id=messages.conversation_id and m.user_id=auth.uid()));
create policy "messages_insert_member" on public.messages for insert to authenticated with check (sender_id=auth.uid() and exists(select 1 from public.conversation_members m where m.conversation_id=messages.conversation_id and m.user_id=auth.uid()));
create policy "messages_delete_own" on public.messages for delete to authenticated using (sender_id=auth.uid());

-- Groups: public directory, membership-managed access.
create policy "groups_select_all_auth" on public.groups for select to authenticated using (true);
create policy "groups_insert_owner" on public.groups for insert to authenticated with check (owner_id=auth.uid());
create policy "groups_update_owner" on public.groups for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "groups_delete_owner" on public.groups for delete to authenticated using (owner_id=auth.uid());
create policy "group_members_select_auth" on public.group_members for select to authenticated using (true);
create policy "group_members_insert_self" on public.group_members for insert to authenticated with check (user_id=auth.uid() and role='member');
create policy "group_members_delete_self" on public.group_members for delete to authenticated using (user_id=auth.uid());

-- Photo feed and likes.
create policy "posts_select_auth" on public.photo_posts for select to authenticated using (true);
create policy "posts_insert_own" on public.photo_posts for insert to authenticated with check (user_id=auth.uid());
create policy "posts_delete_own" on public.photo_posts for delete to authenticated using (user_id=auth.uid());
create policy "likes_select_auth" on public.photo_likes for select to authenticated using (true);
create policy "likes_insert_own" on public.photo_likes for insert to authenticated with check (user_id=auth.uid());
create policy "likes_delete_own" on public.photo_likes for delete to authenticated using (user_id=auth.uid());

-- Notifications are private. Reports are private to reporter; admin review uses dashboard/service role later.
create policy "notifications_select_own" on public.notifications for select to authenticated using (user_id=auth.uid());
create policy "notifications_update_own" on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "reports_insert_own" on public.user_reports for insert to authenticated with check (reporter_id=auth.uid());
create policy "reports_select_own" on public.user_reports for select to authenticated using (reporter_id=auth.uid());
create or replace function public.is_connect_admin(uid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=uid and is_admin=true);
$$;
create policy "reports_select_admin" on public.user_reports for select to authenticated using (public.is_connect_admin(auth.uid()));
create policy "reports_update_admin" on public.user_reports for update to authenticated using (public.is_connect_admin(auth.uid())) with check (public.is_connect_admin(auth.uid()));

-- Create a private photo bucket. Public URLs are used by this starter app, but uploads are owner-scoped.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('connect-photos','connect-photos',true,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
create policy "connect_photo_read" on storage.objects for select to public using (bucket_id='connect-photos');
create policy "connect_photo_upload_own_folder" on storage.objects for insert to authenticated with check (bucket_id='connect-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "connect_photo_delete_own_folder" on storage.objects for delete to authenticated using (bucket_id='connect-photos' and (storage.foldername(name))[1]=auth.uid()::text);

-- Optional: make an account an admin manually after signup:
-- update public.profiles set is_admin = true where username = 'your_username';

-- Securely create a direct conversation only after a mutual connection exists.
create or replace function public.create_private_conversation(other_user uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare current_user_id uuid := auth.uid(); conversation_id uuid;
begin
  if current_user_id is null or current_user_id = other_user then raise exception 'Not allowed'; end if;
  if not exists(select 1 from public.connections c where c.user_a=least(current_user_id,other_user) and c.user_b=greatest(current_user_id,other_user)) then raise exception 'You must be connected first'; end if;
  select c.id into conversation_id from public.conversations c where c.type='private' and exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.user_id=current_user_id) and exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.user_id=other_user) limit 1;
  if conversation_id is null then
    insert into public.conversations(type) values('private') returning id into conversation_id;
    insert into public.conversation_members(conversation_id,user_id) values(conversation_id,current_user_id),(conversation_id,other_user);
  end if;
  return conversation_id;
end; $$;
grant execute on function public.create_private_conversation(uuid) to authenticated;

-- Basic in-app notifications for incoming requests and new messages.
create or replace function public.notify_connection_request() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,title,body) values(new.to_user,'New connection request','Someone would like to connect with you.');
  return new;
end; $$;
drop trigger if exists on_connection_request_notify on public.connection_requests;
create trigger on_connection_request_notify after insert on public.connection_requests for each row execute function public.notify_connection_request();
create or replace function public.notify_new_message() returns trigger language plpgsql security definer set search_path=public as $$
declare member record;
begin
  for member in select user_id from public.conversation_members where conversation_id=new.conversation_id and user_id<>new.sender_id loop
    insert into public.notifications(user_id,title,body) values(member.user_id,'New message','You have a new message in CONNECT.');
  end loop;
  return new;
end; $$;
drop trigger if exists on_message_notify on public.messages;
create trigger on_message_notify after insert on public.messages for each row execute function public.notify_new_message();

-- Accepting a request is one atomic, server-verified operation: accept, connect, and open the private chat.
create or replace function public.accept_connection_request(request_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.connection_requests; a uuid; b uuid; conv uuid;
begin
  select * into r from public.connection_requests where id=request_id and to_user=auth.uid() and status='pending' for update;
  if not found then raise exception 'Request not found or already handled'; end if;
  update public.connection_requests set status='accepted' where id=request_id;
  a := least(r.from_user,r.to_user); b := greatest(r.from_user,r.to_user);
  insert into public.connections(user_a,user_b) values(a,b) on conflict(user_a,user_b) do nothing;
  select c.id into conv from public.conversations c
   where c.type='private'
   and exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.user_id=a)
   and exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.user_id=b)
   limit 1;
  if conv is null then
    insert into public.conversations(type) values('private') returning id into conv;
    insert into public.conversation_members(conversation_id,user_id) values(conv,a),(conv,b);
  end if;
  insert into public.notifications(user_id,title,body) values(r.from_user,'Your request was accepted','You are now connected. Start a conversation.');
  return conv;
end; $$;
grant execute on function public.accept_connection_request(uuid) to authenticated;


-- Prevent ordinary members from assigning themselves admin privileges or marking the assessment complete directly.
revoke insert, update on public.profiles from authenticated;
grant insert (id,full_name,username,bio,city,interests,updated_at) on public.profiles to authenticated;
grant update (id,full_name,username,bio,city,interests,updated_at) on public.profiles to authenticated;

-- Assessment completion is performed atomically on the server after checking all ten answers.
create or replace function public.complete_assessment(payload jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare i integer; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(payload) <> 'object' then raise exception 'Invalid assessment payload'; end if;
  for i in 1..10 loop
    if not (payload ? i::text) or jsonb_typeof(payload->i::text) <> 'array' or jsonb_array_length(payload->i::text)=0 then
      raise exception 'Please answer all ten questions';
    end if;
  end loop;
  insert into public.assessment_answers(user_id,answers,completed_at) values(uid,payload,now())
  on conflict(user_id) do update set answers=excluded.answers,completed_at=excluded.completed_at;
  update public.profiles set assessment_completed=true,updated_at=now() where id=uid;
end; $$;
grant execute on function public.complete_assessment(jsonb) to authenticated;

-- Group creator membership is automatic; members can only self-join with the member role.
create or replace function public.add_group_owner() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.group_members(group_id,user_id,role) values(new.id,new.owner_id,'owner') on conflict(group_id,user_id) do nothing;
  return new;
end; $$;
drop trigger if exists on_group_created_add_owner on public.groups;
create trigger on_group_created_add_owner after insert on public.groups for each row execute function public.add_group_owner();
