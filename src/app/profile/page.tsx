import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { saveProfile } from '@/actions/profile';

export default async function Profile({ searchParams }: { searchParams: { error?: string; saved?: string } }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: p, error } = await db.from('profiles')
    .select('id,full_name,username,bio,city,interests,assessment_completed,is_discoverable')
    .eq('id', user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!p) redirect('/onboarding');

  const { count: friendCount } = await db.from('connections')
    .select('*', { count: 'exact', head: true })
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
  const { count: communityCount } = await db.from('group_members')
    .select('*', { count: 'exact', head: true }).eq('user_id', user.id);

  const checks = [
    !!p.full_name,
    !!p.username,
    (p.bio || '').trim().length >= 20,
    !!p.city,
    (p.interests || []).length >= 3,
    !!p.assessment_completed
  ];
  const completion = Math.round(checks.filter(Boolean).length / checks.length * 100);
  const initials = (p.full_name || 'C').split(' ').filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();

  return (
    <AppShell active="/profile">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#8b78e6]">Your space on CONNECT</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Your profile</h1>
          <p className="mt-2 muted">A little more about you helps the right people find you.</p>
        </div>
        <Link href={`/u/${p.id}`} className="btn btn-secondary">View public profile ↗</Link>
      </div>

      {searchParams.error && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{searchParams.error}</p>}
      {searchParams.saved && <p className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Your profile has been updated.</p>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
        <div className="space-y-6">
          <section className="surface overflow-hidden rounded-[28px]">
            <div className="h-28 bg-gradient-to-r from-[#29233d] via-[#514275] to-[#9b89d7]" />
            <div className="px-6 pb-6">
              <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
                <div className="grid h-24 w-24 place-items-center rounded-[26px] border-4 border-white bg-gradient-to-br from-[#eee9ff] to-[#cfc3f6] text-3xl font-bold text-[#51417e] shadow-lg">{initials}</div>
                <span className="mb-2 rounded-full bg-[#f0edf8] px-3 py-1.5 text-xs font-semibold text-[#625778]">{p.assessment_completed ? 'Assessment complete' : 'Assessment pending'}</span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold">{p.full_name}</h2>
              <p className="mt-1 text-sm muted">@{p.username}{p.city ? ` · ${p.city}` : ''}</p>
              <p className="mt-5 max-w-2xl whitespace-pre-wrap leading-7 text-[#625d70]">{p.bio || 'Your story starts here. Add a short bio so people can get to know you.'}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(p.interests || []).length ? (p.interests || []).map((interest: string) => <span key={interest} className="pill">{interest}</span>) : <span className="text-sm muted">Add a few interests to show what you enjoy.</span>}
              </div>
            </div>
          </section>

          <section className="surface rounded-[28px] p-6">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8b78e6]">Make it yours</p>
              <h2 className="mt-2 text-xl font-semibold">Edit your details</h2>
              <p className="mt-1 text-sm muted">Keep your information current. Your username must be at least 3 characters.</p>
            </div>
            <form action={saveProfile} className="space-y-4">
              <input type="hidden" name="return_to" value="/profile" />
              <label className="block text-sm font-medium">Display name
                <input className="field mt-2" name="full_name" defaultValue={p.full_name} maxLength={80} required placeholder="Your name" />
              </label>
              <label className="block text-sm font-medium">Username
                <div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm muted">@</span><input className="field pl-8" name="username" defaultValue={p.username} minLength={3} maxLength={24} required placeholder="yourname" /></div>
              </label>
              <label className="block text-sm font-medium">About you
                <textarea className="field mt-2 min-h-28 resize-y" name="bio" defaultValue={p.bio || ''} maxLength={300} placeholder="What are you curious about? What matters to you? What would you love to talk about?" />
                <span className="mt-1 block text-xs muted">Up to 300 characters.</span>
              </label>
              <label className="block text-sm font-medium">City
                <input className="field mt-2" name="city" defaultValue={p.city || ''} maxLength={80} placeholder="Where are you based?" />
              </label>
              <label className="block text-sm font-medium">Interests
                <input className="field mt-2" name="interests" defaultValue={(p.interests || []).join(', ')} placeholder="Music, design, books, travel…" />
                <span className="mt-1 block text-xs muted">Separate interests with commas. Add up to 12.</span>
              </label>
              <button className="btn btn-primary w-full sm:w-auto">Save profile changes</button>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface rounded-[28px] p-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8b78e6]">Profile strength</p><h2 className="mt-2 text-xl font-semibold">You're {completion}% there</h2></div>
              <div className="grid h-14 w-14 place-items-center rounded-full border-[5px] border-[#e7e0fb] text-sm font-bold text-[#6552a2]">{completion}%</div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#eeeaf5]"><div className="h-full rounded-full bg-gradient-to-r from-[#7964b7] to-[#a695df]" style={{ width: `${completion}%` }} /></div>
            <ul className="mt-5 space-y-3">
              {[
                ['Add your name', checks[0]],
                ['Choose a username', checks[1]],
                ['Write a short bio (20+ characters)', checks[2]],
                ['Add your city', checks[3]],
                ['Add at least 3 interests', checks[4]],
                ['Complete your 10-question assessment', checks[5]]
              ].map(([label, done]) => <li key={String(label)} className="flex items-center gap-3 text-sm"><span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-[#f0edf8] text-[#8b829c]'}`}>{done ? '✓' : '·'}</span><span className={done ? 'text-[#817b91] line-through' : 'text-[#514b60]'}>{label}</span></li>)}
            </ul>
          </section>

          <section className="surface rounded-[28px] p-6">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8b78e6]">Your CONNECT</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f5f2fb] p-4"><p className="text-2xl font-semibold">{friendCount ?? 0}</p><p className="mt-1 text-xs muted">Friends</p></div>
              <div className="rounded-2xl bg-[#f5f2fb] p-4"><p className="text-2xl font-semibold">{communityCount ?? 0}</p><p className="mt-1 text-xs muted">Communities</p></div>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <Link href="/friends" className="btn btn-secondary w-full">See your friends</Link>
              <Link href="/assessment" className="btn btn-secondary w-full">Update compatibility assessment</Link>
            </div>
          </section>

          <section className="rounded-[28px] bg-[#29233d] p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#c7b9f3]">A small reminder</p>
            <h2 className="mt-3 text-xl font-semibold">The best connections start with being yourself.</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">Share the things you care about. Your profile is an introduction, not a performance.</p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
