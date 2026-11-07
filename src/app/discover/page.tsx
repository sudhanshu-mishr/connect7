import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Heart,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { sendRequest } from '@/actions/connections';

type MatchRow = { profile_id: string; compatibility_score: number };

export default async function Discover() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await db.from('profiles')
    .select('id, interests')
    .eq('id', user.id)
    .maybeSingle();
  if (!me) redirect('/onboarding');

  const { data: myAnswers } = await db.from('assessment_answers')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!myAnswers) redirect('/assessment');

  // Compatibility is calculated securely in Postgres. Individual answers are never exposed here.
  const { data: matchRows, error: matchError } = await db.rpc('get_connect_discover_matches');
  if (matchError) throw new Error('Could not load compatible people: ' + matchError.message);

  const rows = (matchRows || []) as MatchRow[];
  const ids = rows.map(row => row.profile_id);
  const scoreById = new Map(rows.map(row => [row.profile_id, row.compatibility_score]));
  const { data: profiles, error: profilesError } = ids.length
    ? await db.from('profiles')
        .select('id,full_name,username,bio,city,interests')
        .in('id', ids)
    : { data: [], error: null };
  if (profilesError) throw new Error('Could not load matching profiles: ' + profilesError.message);

  const myInterests = (me.interests || []) as string[];
  const matches = (profiles || []).map(profile => {
    const interests = (profile.interests || []) as string[];
    const common = myInterests.filter((interest: string) =>
      interests.some((other: string) => other.toLowerCase() === interest.toLowerCase())
    );
    return {
      ...profile,
      score: Math.round(scoreById.get(profile.id) || 0),
      common,
      initials: (profile.full_name || 'C')
        .split(' ')
        .filter(Boolean)
        .map((part: string) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase(),
    };
  }).filter(profile => profile.score >= 50).sort((a, b) => b.score - a.score);

  return (
    <AppShell active="/discover">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#29233d] px-6 py-8 text-white shadow-[0_24px_70px_rgba(41,35,61,0.18)] md:px-9 md:py-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#8b78e6]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-1/3 h-64 w-64 rounded-full bg-[#c9baff]/15 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-[#e7e0ff]">
                <Sparkles size={14} />
                A better kind of discovery
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-5xl">
                Find people on your wavelength.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/70 md:text-base">
                Less scrolling, more meaningful connections. Discover people whose answers and interests align with yours.
              </p>
            </div>
            <Link
              href="/assessment"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#33294f] transition hover:-translate-y-0.5 hover:bg-[#f0ecff]"
            >
              Retake assessment <ArrowRight size={16} />
            </Link>
          </div>
          <div className="relative mt-8 flex flex-wrap gap-3 text-xs text-white/75">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><CheckCircle2 size={14} /> 10-question compatibility</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><Heart size={14} /> 50% or higher to discover</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><Users size={14} /> Requests before private chat</span>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8b78e6]">Your potential circle</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#211c34]">People worth meeting</h2>
              <p className="mt-1 text-sm muted">
                {matches.length
                  ? `${matches.length} compatible ${matches.length === 1 ? 'person' : 'people'} found`
                  : 'New connections appear here as more people complete their assessment.'}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8e2f2] bg-white/75 px-3 py-2 text-xs font-medium text-[#6f6683]">
              <Compass size={14} className="text-[#8b78e6]" /> Ranked by compatibility
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="surface mt-5 overflow-hidden rounded-3xl p-8 text-center md:p-12">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#f0ecff] text-[#7561bd]">
                <Users size={28} />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-[#29233d]">Your circle is taking shape.</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 muted">
                There are no compatible profiles to show right now. Invite friends to complete the 10 questions, then come back to discover people with a similar outlook.
              </p>
              <Link href="/assessment" className="btn btn-primary mt-6">
                Review my answers <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {matches.map(profile => (
                <article
                  key={profile.id}
                  className="group surface flex h-full flex-col rounded-3xl p-5 transition duration-300 hover:-translate-y-1 hover:border-[#cfc4f2] hover:shadow-[0_22px_55px_rgba(48,35,83,0.10)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex max-w-[70%] items-center gap-1.5 truncate rounded-full bg-[#f3f0fa] px-3 py-1.5 text-xs font-medium text-[#706681]">
                      {profile.city ? <><MapPin size={12} />{profile.city}</> : 'CONNECT community'}
                    </span>
                    <div className="text-right">
                      <span className="block text-2xl font-bold tracking-tight text-[#6652a5]">{profile.score}%</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#928aa2]">match</span>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eeeaf5]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#9b89e8] to-[#6652a5]"
                      style={{ width: `${Math.min(100, Math.max(0, profile.score))}%` }}
                    />
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#e8e1ff] to-[#c9baff] text-lg font-bold text-[#51417e] ring-4 ring-[#f6f3ff]">
                      {profile.initials || 'C'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-[#29233d]">{profile.full_name || 'CONNECT member'}</h3>
                      <p className="truncate text-sm muted">@{profile.username || 'member'}</p>
                    </div>
                  </div>

                  <p className="mt-4 min-h-[3.5rem] text-sm leading-6 text-[#746d82]">
                    {profile.bio || 'Here to meet thoughtful people and build genuine connections.'}
                  </p>

                  <div className="mt-4 border-t border-[#eeeaf3] pt-4">
                    <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#91899f]">
                      {profile.common.length ? 'Things you have in common' : 'Get to know them'}
                    </p>
                    {profile.common.length > 0 ? (
                      <div className="mt-2 flex min-h-8 flex-wrap gap-2">
                        {profile.common.slice(0, 4).map((interest: string) => (
                          <span key={interest} className="rounded-full border border-[#e9e3f5] bg-[#faf9fd] px-2.5 py-1 text-xs text-[#625778]">{interest}</span>
                        ))}
                        {profile.common.length > 4 && (
                          <span className="rounded-full bg-[#f0edf8] px-2.5 py-1 text-xs text-[#625778]">+{profile.common.length - 4}</span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs leading-5 muted">Your assessment shows a shared outlook. Visit their profile to learn more.</p>
                    )}
                  </div>

                  <div className="mt-auto flex gap-2 pt-5">
                    <form action={async () => { 'use server'; await sendRequest(profile.id); }} className="min-w-0 flex-1">
                      <button className="btn btn-primary w-full">
                        <Heart size={15} /> Connect
                      </button>
                    </form>
                    <Link href={`/u/${profile.id}`} className="btn btn-secondary">
                      Profile
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs leading-5 text-[#9992a7]">
          Compatibility is calculated from your assessment. Individual answers stay private.
        </p>
      </div>
    </AppShell>
  );
}
