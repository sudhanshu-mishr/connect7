import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Heart, MapPin, Search, Sparkles, Users, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { sendRequest } from '@/actions/connections';

type MatchRow = { profile_id: string; compatibility_score: number };

export const dynamic = 'force-dynamic';

export default async function Discover() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await db.from('profiles').select('id,interests').eq('id', user.id).maybeSingle();
  if (!me) redirect('/onboarding');
  const { data: myAnswers } = await db.from('assessment_answers').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!myAnswers) redirect('/assessment');

  // Compatibility is computed in Postgres; individual assessment answers remain private.
  const { data: matchRows, error: matchError } = await db.rpc('get_connect_discover_matches');
  if (matchError) throw new Error('Could not load compatible people: ' + matchError.message);
  const rows = (matchRows || []) as MatchRow[];
  const ids = rows.map(row => row.profile_id);
  const scoreById = new Map(rows.map(row => [row.profile_id, row.compatibility_score]));
  const [{ data: profiles }, { data: outgoing }, { data: incoming }, { data: connections }] = await Promise.all([
    ids.length ? db.from('profiles').select('id,full_name,username,bio,city,interests').in('id', ids) : Promise.resolve({ data: [] as any[] }),
    db.from('connection_requests').select('to_user,status').eq('from_user', user.id),
    db.from('connection_requests').select('from_user,status').eq('to_user', user.id),
    db.from('connections').select('user_a,user_b').or('user_a.eq.' + user.id + ',user_b.eq.' + user.id)
  ]);
  const sent = new Set((outgoing || []).filter(r => r.status === 'pending').map(r => r.to_user));
  const received = new Set((incoming || []).filter(r => r.status === 'pending').map(r => r.from_user));
  const connected = new Set((connections || []).map(c => c.user_a === user.id ? c.user_b : c.user_a));
  const myInterests = (me.interests || []) as string[];
  const matches = (profiles || []).map(profile => {
    const interests = (profile.interests || []) as string[];
    const common = myInterests.filter((interest: string) => interests.some((other: string) => other.toLowerCase() === interest.toLowerCase()));
    return { ...profile, score: Math.round(scoreById.get(profile.id) || 0), common,
      initials: (profile.full_name || 'C').split(' ').filter(Boolean).slice(0,2).map((part: string) => part[0]).join('').toUpperCase() };
  }).filter(profile => profile.score >= 50 && !connected.has(profile.id)).sort((a,b) => b.score-a.score);

  return <AppShell active="/discover">
    <div className="mx-auto max-w-4xl">
      <header className="px-4 pb-5 sm:px-0">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b78e6]">Find your people</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[#302443]">Discover</h1></div>
          <Link href="/assessment" className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e2f2] bg-white px-3 py-2 text-[11px] font-semibold text-[#66548f]"><Sparkles size={14}/> Update match</Link>
        </div>
        <p className="mt-2 max-w-lg text-sm leading-5 text-[#898196]">People who share your wavelength, interests and outlook.</p>
        <div className="mt-4 flex items-center gap-2 overflow-hidden rounded-2xl border border-[#e9e4ef] bg-white px-3.5 py-3 text-xs text-[#aaa3b2] shadow-sm"><Search size={16}/>People matched to your mindset</div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-[#928aa0]"><CheckCircle2 size={13} className="text-[#7b68b2]"/> Ranked by private 10-question compatibility · Answers are never shown</div>
      </header>

      <section className="px-3 sm:px-0">
        <div className="mb-4 flex items-end justify-between"><div><h2 className="text-base font-bold text-[#302443]">Your potential circle</h2><p className="mt-0.5 text-xs text-[#938ca0]">{matches.length} compatible {matches.length === 1 ? 'person' : 'people'} to discover</p></div><span className="rounded-full bg-[#f0ecf8] px-3 py-1.5 text-[10px] font-semibold text-[#6a5798]">50%+ match</span></div>
        {matches.length ? <div className="space-y-3">{matches.map(profile => {
          const requestSent = sent.has(profile.id);
          const requestReceived = received.has(profile.id);
          return <article key={profile.id} className="overflow-hidden rounded-[1.4rem] border border-[#eeeaf3] bg-white shadow-[0_5px_24px_rgba(35,24,74,.035)] transition hover:border-[#d9cfee] hover:shadow-[0_12px_32px_rgba(35,24,74,.07)]">
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3.5">
                <Link href={'/u/' + profile.id} className="grid h-[62px] w-[62px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#eee8fb] to-[#cbbce9] text-xl font-bold text-[#55427f] ring-2 ring-[#f4f0fa] ring-offset-2">{profile.initials || 'C'}</Link>
                <div className="min-w-0 flex-1 pt-0.5"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Link href={'/u/' + profile.id} className="truncate text-[15px] font-bold text-[#302a3d]">{profile.full_name || 'CONNECT member'}</Link><span className="text-[11px] text-[#a29aaa]">@{profile.username || 'member'}</span></div>
                  {profile.city && <p className="mt-1 flex items-center gap-1 text-[11px] text-[#938a9f]"><MapPin size={11}/>{profile.city}</p>}
                  <p className="mt-2 line-clamp-2 text-xs leading-[1.55] text-[#746d82]">{profile.bio || 'Here to meet thoughtful people and build genuine connections.'}</p>
                </div>
                <div className="shrink-0 text-right"><p className="text-[22px] font-bold leading-none tracking-tight text-[#6652a5]">{profile.score}%</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[.13em] text-[#a29aaa]">match</p></div>
              </div>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#f0edf5]"><div className="h-full rounded-full bg-gradient-to-r from-[#a995dc] to-[#6652a5]" style={{width: Math.min(100,Math.max(0,profile.score)) + '%'}}/></div>
              <div className="mt-4"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#a29aaa]">{profile.common.length ? 'You both like' : 'Shared outlook'}</p><div className="mt-2 flex flex-wrap gap-1.5">{profile.common.length ? profile.common.slice(0,5).map((interest: string)=><span key={interest} className="rounded-full bg-[#f5f2fa] px-2.5 py-1 text-[10px] font-medium text-[#695d80]">{interest}</span>) : <span className="text-[11px] text-[#898196]">Your answers show a compatible mindset.</span>}</div></div>
              <div className="mt-4 flex gap-2 border-t border-[#f0edf4] pt-3">
                <Link href={'/u/' + profile.id} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#e7e1ee] px-3 py-2.5 text-xs font-semibold text-[#5f5472] transition hover:bg-[#faf8fc]">View profile <ArrowRight size={13}/></Link>
                {connected.has(profile.id) ? <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#edf7f0] px-3 py-2.5 text-xs font-semibold text-[#39724c]">Connected</span> : requestSent ? <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#f3f0f8] px-3 py-2.5 text-xs font-semibold text-[#776b8b]">Request sent</span> : requestReceived ? <Link href="/requests" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#594681] px-3 py-2.5 text-xs font-semibold text-white">Respond <Heart size={13}/></Link> : <form action={async()=>{'use server';await sendRequest(profile.id);}} className="flex-1"><button className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#594681] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#7056b2]"><Heart size={13}/> Connect</button></form>}
              </div>
            </div>
          </article>;
        })}</div> : <div className="rounded-3xl border border-[#eeeaf3] bg-white px-6 py-14 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f0ecf8] text-[#6a5798]"><Users size={24}/></div><h3 className="mt-4 text-lg font-bold text-[#302443]">Your circle is taking shape</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#898196]">There are no new compatible profiles to show right now. Invite more people to complete the assessment and grow your circle.</p><Link href="/assessment" className="mt-5 inline-flex rounded-full bg-[#594681] px-5 py-2.5 text-xs font-semibold text-white">Review my answers</Link></div>}
      </section>
      <footer className="px-4 py-8 text-center text-[10px] text-[#aaa3b2]">Compatibility is calculated securely. Individual assessment answers stay private.</footer>
    </div>
  </AppShell>;
}
