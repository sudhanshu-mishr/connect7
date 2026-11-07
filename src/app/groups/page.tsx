import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Compass, Users, Plus, ArrowUpRight, MessageCircle, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { createGroup, joinGroup } from '@/actions/social';

export const dynamic = 'force-dynamic';

export default async function Groups() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const [{ data: groups, error }, { data: joined }, { data: allMembers }] = await Promise.all([
    db.from('groups').select('id,name,description,created_at,owner_id').order('created_at', { ascending: false }).limit(60),
    db.from('group_members').select('group_id').eq('user_id', user.id),
    db.from('group_members').select('group_id')
  ]);
  if (error) throw new Error(error.message);
  const joinedSet = new Set((joined || []).map(x => x.group_id));
  const counts = new Map<string, number>();
  (allMembers || []).forEach(x => counts.set(x.group_id, (counts.get(x.group_id) || 0) + 1));
  return <AppShell active="/groups">
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 px-4 sm:px-0">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b78e6]">Find your people</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[#302443]">Communities</h1></div>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f0ecf8] text-[#6652a5]"><Compass size={21}/></span>
        </div>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#898196]">Join conversations around the things you care about. Meet people, exchange ideas and build your circle.</p>
      </header>
      <section className="mb-7 rounded-3xl bg-[linear-gradient(120deg,#302642,#55447c_65%,#8974b8)] p-5 text-white shadow-[0_12px_32px_rgba(48,38,66,.16)] sm:p-7">
        <div className="flex items-center gap-2 text-white/75"><Sparkles size={16}/><span className="text-[10px] font-bold uppercase tracking-[.18em]">Start something together</span></div>
        <h2 className="mt-3 text-xl font-bold">Create your own community</h2>
        <p className="mt-1 max-w-lg text-xs leading-5 text-white/70">Bring people together around a shared interest, goal or idea.</p>
        <form action={createGroup} className="mt-5 grid gap-2 sm:grid-cols-[1fr_1.3fr_auto]">
          <input className="min-w-0 rounded-xl border border-white/20 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/55 focus:border-white/50" name="name" placeholder="Community name" required minLength={3}/>
          <input className="min-w-0 rounded-xl border border-white/20 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/55 focus:border-white/50" name="description" placeholder="What brings everyone together?"/>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#51417e] transition hover:bg-[#f2edfb]"><Plus size={15}/> Create</button>
        </form>
      </section>
      <section className="px-3 sm:px-0">
        <div className="mb-4 flex items-end justify-between"><div><h2 className="text-base font-bold text-[#302443]">Explore communities</h2><p className="mt-0.5 text-xs text-[#938ca0]">Find a space that feels like yours</p></div><span className="rounded-full bg-[#f0ecf8] px-3 py-1.5 text-[10px] font-semibold text-[#6652a5]">{(groups || []).length} spaces</span></div>
        {(groups || []).length ? <div className="grid gap-3 sm:grid-cols-2">{(groups || []).map((g, index) => {
          const member = joinedSet.has(g.id);
          const count = counts.get(g.id) || 0;
          return <article key={g.id} className="group rounded-2xl border border-[#eeeaf3] bg-white p-4 shadow-[0_5px_24px_rgba(35,24,74,.035)] transition hover:-translate-y-0.5 hover:border-[#d9cfee] hover:shadow-[0_12px_32px_rgba(35,24,74,.07)] sm:p-5">
            <div className="flex items-start justify-between gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#eee8fb] to-[#d9ccef] text-[#6652a5]"><Users size={21}/></span><span className={member ? 'rounded-full bg-[#edf7f0] px-2.5 py-1 text-[9px] font-bold text-[#39724c]' : 'rounded-full bg-[#f3f0f8] px-2.5 py-1 text-[9px] font-bold text-[#76698e]'}>{member ? 'MEMBER' : 'OPEN COMMUNITY'}</span></div>
            <h3 className="mt-4 text-base font-bold text-[#302a3d]">{g.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-[#81798e]">{g.description || 'A place to connect around a shared interest.'}</p>
            <div className="mt-4 flex items-center gap-2 text-[10px] text-[#9991a4]"><Users size={12}/>{count} {count === 1 ? 'member' : 'members'}<span>·</span><span>Community {index + 1}</span></div>
            {member ? <Link href={'/groups/' + g.id} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#594681] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#7056b2]">Open community <ArrowUpRight size={14}/></Link> : <form action={async () => { 'use server'; await joinGroup(g.id); }} className="mt-4"><button className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#e7e1ee] px-3 py-2.5 text-xs font-semibold text-[#5f5472] hover:bg-[#faf8fc]">Join community <Plus size={14}/></button></form>}
          </article>;
        })}</div> : <div className="rounded-3xl border border-[#eeeaf3] bg-white px-6 py-14 text-center"><Users size={25} className="mx-auto text-[#7663a8]"/><h3 className="mt-3 font-semibold text-[#302443]">No communities yet</h3><p className="mt-1 text-sm text-[#898196]">Create the first space and invite your people.</p></div>}
      </section>
      <div className="mt-7 flex justify-center"><Link href="/blends" className="inline-flex items-center gap-2 text-xs font-semibold text-[#6a579b]">Looking for smaller shared boards? Explore Blends <ArrowUpRight size={14}/></Link></div>
    </div>
  </AppShell>;
}
