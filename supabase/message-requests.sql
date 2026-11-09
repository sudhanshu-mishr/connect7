-- CONNECT private message requests.
-- Non-connections can send one short introduction. Recipients decide whether a private
-- conversation is created. No message is inserted into messages until acceptance.

create table if not exists public.message_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  message text not null check (length(btrim(message)) between 1 and 500),
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','cancelled')),
  conversation_id uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_user <> to_user)
);

create unique index if not exists message_requests_one_pending_pair
  on public.message_requests(from_user,to_user) where status='pending';
create index if not exists message_requests_inbox_idx
  on public.message_requests(to_user,status,created_at desc);
create index if not exists message_requests_outbox_idx
  on public.message_requests(from_user,status,created_at desc);

alter table public.message_requests enable row level security;
drop policy if exists message_requests_select_participant on public.message_requests;
create policy message_requests_select_participant on public.message_requests
  for select to authenticated using (from_user=auth.uid() or to_user=auth.uid());
drop policy if exists message_requests_insert_sender on public.message_requests;
create policy message_requests_insert_sender on public.message_requests
  for insert to authenticated with check (
    from_user=auth.uid()
    and exists(select 1 from public.profiles p where p.id=to_user and p.is_discoverable=true)
    and not exists(
      select 1 from public.connections c
      where c.user_a=least(auth.uid(),to_user) and c.user_b=greatest(auth.uid(),to_user)
    )
  );
grant select,insert on public.message_requests to authenticated;

-- Acceptance atomically creates the private conversation and delivers the introduction.
create or replace function public.accept_message_request(p_request_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.message_requests; conv uuid;
begin
  select * into r from public.message_requests
    where id=p_request_id and to_user=auth.uid() and status='pending'
    for update;
  if not found then raise exception 'Message request not found or already handled'; end if;

  if exists(
    select 1 from public.connections c
    where c.user_a=least(r.from_user,r.to_user) and c.user_b=greatest(r.from_user,r.to_user)
  ) then
    select c.id into conv from public.conversations c
      where c.type='private'
      and exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.user_id=r.from_user)
      and exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.user_id=r.to_user)
      limit 1;
  end if;

  if conv is null then
    insert into public.conversations(type) values('private') returning id into conv;
    insert into public.conversation_members(conversation_id,user_id)
      values(conv,r.from_user),(conv,r.to_user);
  end if;

  insert into public.messages(conversation_id,sender_id,content)
    values(conv,r.from_user,r.message);

  update public.message_requests
    set status='accepted',conversation_id=conv,responded_at=now()
    where id=r.id;

  insert into public.notifications(user_id,title,body)
    values(r.from_user,'Message request accepted','Your introduction was accepted. You can now chat.');
  return conv;
end; $$;
revoke all on function public.accept_message_request(uuid) from public;
grant execute on function public.accept_message_request(uuid) to authenticated;

create or replace function public.decline_message_request(p_request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.message_requests set status='declined',responded_at=now()
    where id=p_request_id and to_user=auth.uid() and status='pending';
  if not found then raise exception 'Message request not found or already handled'; end if;
end; $$;
revoke all on function public.decline_message_request(uuid) from public;
grant execute on function public.decline_message_request(uuid) to authenticated;
