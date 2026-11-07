import Link from 'next/link';
import { redirect } from 'next/navigation';
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

  // This RPC calculates compatibility securely inside Postgres. Raw answers never leave the database.
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

  const matches = (profiles || []).map(profile => ({
    ...profile,
    score: scoreById.get(profile.id) || 0,
    common: (me.interests || []).filter((interest: string) =>
      (profile.interests || []).some((other: string) => other.toLowerCase() === interest.toLowerCase())
    )
  })).filter(profile => profile.score >= 50).sort((a, b) => b.score - a.score);

  return (
    <AppShell active="/discover">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#8b78e6]">A better kind of discovery</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">People on your wavelength.</h1>
          <p className="mt-2 muted">Profiles appear when your assessment answers are at least 50% compatible.</p>
        </div>
        <Link href="/assessment" className="btn btn-secondary">Retake assessment</Link>
      </div>

      {matches.length === 0 ? (
        <div className="surface mt-8 rounded-3xl p-10 text-center">
          <h2 className="text-xl font-semibold">Your circle is taking shape.</h2>
          <p className="mt-2 muted">No compatible profiles are available yet. Make sure your friends have completed all 10 questions, then check again.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {matches.map(profile => (
            <article key={profile.id} className="surface rounded-3xl p-5">
              <div className="flex items-center justify-between">
                <span className="pill">{profile.city || 'CONNECT community'}</span>
                <span className="text-2xl font-semibold text-[#7561bd]">{profile.score}%</span>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#e6dfff] to-[#c8baff] text-lg font-semibold text-[#51417e]">
                  {profile.full_name.split(' ').map((part: string) => part[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <h2 className="font-semibold">{profile.full_name}</h2>
                  <p className="text-sm muted">@{profile.username}</p>
                </div>
              </div>
              <p className="mt-4 min-h-12 text-sm leading-6 text-[#6f697d]">{profile.bio || 'Here to meet thoughtful people and build genuine connections.'}</p>
              {profile.common.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.common.slice(0, 3).map((interest: string) => <span key={interest} className="pill">{interest}</span>)}
                </div>
              )}
              <div className="mt-5 flex gap-2">
                <form action={async () => { 'use server'; await sendRequest(profile.id); }} className="flex-1">
                  <button className="btn btn-primary w-full">Send request</button>
                </form>
                <Link href={`/u/${profile.id}`} className="btn btn-secondary">View profile</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
