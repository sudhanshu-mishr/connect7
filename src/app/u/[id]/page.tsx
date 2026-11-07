import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { startPrivateChat } from '@/actions/chat';

export default async function PublicProfile({ params }: { params: { id: string } }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: p } = await db.from('profiles').select('*').eq('id', params.id).maybeSingle();
  if (!p) notFound();

  const isSelf = p.id === user.id;
  let isFriend = false;
  if (!isSelf) {
    const { data: connection } = await db.from('connections').select('id')
      .or(`and(user_a.eq.${user.id},user_b.eq.${p.id}),and(user_a.eq.${p.id},user_b.eq.${user.id})`)
      .maybeSingle();
    isFriend = !!connection;
  }

  return <AppShell>
    <div className="surface mx-auto max-w-2xl rounded-3xl p-7">
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#e8e2fa] text-2xl font-semibold text-[#6552a2]">{p.full_name.split(' ').map((x:string)=>x[0]).slice(0,2).join('')}</div>
      <h1 className="mt-5 text-3xl font-semibold">{p.full_name}</h1>
      <p className="mt-1 text-sm muted">@{p.username}{p.city ? ' · '+p.city : ''}</p>
      <p className="mt-6 leading-7">{p.bio || 'A CONNECT member.'}</p>
      <div className="mt-6 flex flex-wrap gap-2">{(p.interests||[]).map((x:string)=><span key={x} className="pill">{x}</span>)}</div>
      <div className="mt-7 flex flex-wrap gap-3">
        {isSelf ? <Link href="/profile" className="btn btn-secondary">Edit profile</Link> : isFriend ? <form action={async()=>{'use server';await startPrivateChat(p.id);}}><button className="btn btn-primary">Message friend</button></form> : <p className="text-sm muted">Connect first to unlock private messaging.</p>}
      </div>
    </div>
  </AppShell>;
}
