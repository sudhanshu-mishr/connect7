export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { startPrivateChat } from '@/actions/chat';

export default async function FriendsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: connections, error } = await db.from('connections')
    .select('user_a,user_b,created_at')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const friendIds = (connections || []).map(c => c.user_a === user.id ? c.user_b : c.user_a);
  const { data: profiles, error: profileError } = friendIds.length
    ? await db.from('profiles').select('id,full_name,username,bio,city').in('id', friendIds)
    : { data: [], error: null };
  if (profileError) throw new Error(profileError.message);

  return <AppShell active="/friends">
    <div>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#8b78e6]">Your circle</p>
      <h1 className="mt-2 text-4xl font-semibold">Friends</h1>
      <p className="mt-2 muted">People you have mutually connected with on CONNECT.</p>
    </div>
    {!profiles?.length ? <div className="surface mt-8 rounded-3xl p-10 text-center">
      <h2 className="text-xl font-semibold">Your circle starts here.</h2>
      <p className="mt-2 muted">When someone accepts your connection request, they will appear here.</p>
      <Link href="/discover" className="btn btn-primary mt-5 inline-flex">Discover people</Link>
    </div> : <div className="mt-8 grid gap-4 md:grid-cols-2">
      {profiles.map(p => <article key={p.id} className="surface flex items-center justify-between gap-4 rounded-3xl p-5">
        <Link href={`/u/${p.id}`} className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8e2fa] font-semibold text-[#6552a2]">
            {(p.full_name || '?').split(' ').map((x:string) => x[0]).slice(0,2).join('').toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{p.full_name}</h2>
            <p className="text-sm muted">@{p.username}{p.city ? ` · ${p.city}` : ''}</p>
          </div>
        </Link>
        <form action={async () => { 'use server'; await startPrivateChat(p.id); }}>
          <button className="btn btn-primary">Message</button>
        </form>
      </article>)}
    </div>}
  </AppShell>;
}
