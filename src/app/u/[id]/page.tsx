import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { startPrivateChat } from '@/actions/chat';

export default async function PublicProfile({ params }: { params: { id: string } }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: p, error } = await db.from('profiles')
    .select('id,full_name,username,bio,city,interests,assessment_completed')
    .eq('id', params.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!p) notFound();

  const isSelf = p.id === user.id;
  let isFriend = false;
  let compatibility: number | null = null;
  if (!isSelf) {
    const [connectionResult, scoreResult] = await Promise.all([
      db.from('connections').select('id')
        .or(`and(user_a.eq.${user.id},user_b.eq.${p.id}),and(user_a.eq.${p.id},user_b.eq.${user.id})`)
        .maybeSingle(),
      db.rpc('get_connect_compatibility_score', { candidate_id: p.id })
    ]);
    isFriend = !!connectionResult.data;
    if (!scoreResult.error && typeof scoreResult.data === 'number' && scoreResult.data >= 50) compatibility = scoreResult.data;
  }

  const initials = (p.full_name || 'C').split(' ').filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <Link href={isSelf ? '/profile' : '/discover'} className="mb-5 inline-flex text-sm font-semibold text-[#7561bd]">← {isSelf ? 'Back to your profile' : 'Back to Discover'}</Link>
        <section className="surface overflow-hidden rounded-[30px]">
          <div className="h-36 bg-gradient-to-r from-[#29233d] via-[#514275] to-[#9b89d7] sm:h-48" />
          <div className="px-5 pb-7 sm:px-8">
            <div className="-mt-14 flex flex-wrap items-end justify-between gap-4 sm:-mt-16">
              <div className="grid h-28 w-28 place-items-center rounded-[30px] border-4 border-white bg-gradient-to-br from-[#eee9ff] to-[#cfc3f6] text-4xl font-bold text-[#51417e] shadow-lg sm:h-32 sm:w-32">{initials}</div>
              <div className="mb-2 flex flex-wrap gap-2">
                {isSelf ? <Link href="/profile" className="btn btn-secondary">Edit profile</Link> : isFriend ? <form action={async () => { 'use server'; await startPrivateChat(p.id); }}><button className="btn btn-primary">Message friend</button></form> : <span className="rounded-xl bg-[#f0edf8] px-4 py-2.5 text-sm font-medium text-[#625778]">Compatible member</span>}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div><h1 className="text-3xl font-semibold tracking-tight">{p.full_name}</h1><p className="mt-1 text-sm muted">@{p.username}{p.city ? ` · ${p.city}` : ''}</p></div>
              {compatibility !== null && <span className="rounded-full bg-[#eee9ff] px-3 py-1.5 text-sm font-bold text-[#6552a2]">{compatibility}% compatible</span>}
            </div>

            <div className="mt-7 grid gap-6 md:grid-cols-[minmax(0,1fr)_240px]">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-[.18em] text-[#8b78e6]">A little about {isSelf ? 'you' : p.full_name.split(' ')[0]}</h2>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-[#625d70]">{p.bio || 'Still writing their story.'}</p>
                <div className="mt-7">
                  <h2 className="text-xs font-bold uppercase tracking-[.18em] text-[#8b78e6]">Things they enjoy</h2>
                  <div className="mt-3 flex flex-wrap gap-2">{(p.interests || []).length ? p.interests.map((interest: string) => <span key={interest} className="pill">{interest}</span>) : <p className="text-sm muted">Interests haven't been added yet.</p>}</div>
                </div>
              </div>
              <aside className="rounded-2xl bg-[#f7f5fb] p-5">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#8b78e6]">On CONNECT</p>
                <div className="mt-4 space-y-4">
                  <div><p className="text-sm font-semibold">{p.assessment_completed ? 'Assessment completed' : 'Getting started'}</p><p className="mt-1 text-xs muted">A thoughtful way to find people on your wavelength.</p></div>
                  {p.city && <div><p className="text-xs muted">Based in</p><p className="mt-1 text-sm font-semibold">{p.city}</p></div>}
                  <div><p className="text-xs muted">Interests shared</p><p className="mt-1 text-2xl font-semibold">{(p.interests || []).length}</p></div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
