-- CONNECT discovery fix: compute compatibility privately in Postgres and reveal profiles only at >= 50%.
-- Run this migration once in Supabase SQL Editor.

create or replace function public.connect_compatibility_score(viewer_id uuid, candidate_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer_answers jsonb;
  candidate_answers jsonb;
  question_no integer;
  answer_a jsonb;
  answer_b jsonb;
  overlap_count integer;
  union_count integer;
  total_score numeric := 0;
begin
  if viewer_id is null or candidate_id is null or viewer_id = candidate_id then
    return 0;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = viewer_id and assessment_completed = true
  ) or not exists (
    select 1 from public.profiles
    where id = candidate_id and assessment_completed = true and is_discoverable = true
  ) then
    return 0;
  end if;

  select answers into viewer_answers
  from public.assessment_answers where user_id = viewer_id;
  select answers into candidate_answers
  from public.assessment_answers where user_id = candidate_id;

  if viewer_answers is null or candidate_answers is null then return 0; end if;

  for question_no in 1..10 loop
    answer_a := viewer_answers -> question_no::text;
    answer_b := candidate_answers -> question_no::text;

    if jsonb_typeof(answer_a) <> 'array' or jsonb_typeof(answer_b) <> 'array'
       or jsonb_array_length(answer_a) = 0 or jsonb_array_length(answer_b) = 0 then
      return 0;
    end if;

    select count(*) into overlap_count
    from (
      select jsonb_array_elements_text(answer_a)
      intersect
      select jsonb_array_elements_text(answer_b)
    ) shared_values;

    select count(*) into union_count
    from (
      select jsonb_array_elements_text(answer_a)
      union
      select jsonb_array_elements_text(answer_b)
    ) all_values;

    if union_count > 0 then
      total_score := total_score + (100.0 * overlap_count / union_count);
    end if;
  end loop;

  return round(total_score / 10.0)::integer;
end;
$$;

revoke all on function public.connect_compatibility_score(uuid, uuid) from public;
grant execute on function public.connect_compatibility_score(uuid, uuid) to authenticated;

create or replace function public.get_connect_compatibility_score(candidate_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select public.connect_compatibility_score(auth.uid(), candidate_id);
$$;

revoke all on function public.get_connect_compatibility_score(uuid) from public;
grant execute on function public.get_connect_compatibility_score(uuid) to authenticated;

create or replace function public.get_connect_discover_matches()
returns table(profile_id uuid, compatibility_score integer)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, public.connect_compatibility_score(auth.uid(), p.id)
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.assessment_completed = true
    and p.is_discoverable = true
    and public.connect_compatibility_score(auth.uid(), p.id) >= 50
    and not exists (
      select 1 from public.connection_requests r
      where r.status in ('pending', 'accepted')
        and ((r.from_user = auth.uid() and r.to_user = p.id)
          or (r.from_user = p.id and r.to_user = auth.uid()))
    )
  order by 2 desc, p.created_at desc;
$$;

revoke all on function public.get_connect_discover_matches() from public;
grant execute on function public.get_connect_discover_matches() to authenticated;

-- Replace the broad discoverable-profile policy. Direct profile URLs are subject to the same 50% rule.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or (
    is_discoverable = true
    and public.connect_compatibility_score(auth.uid(), id) >= 50
  )
);
