import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, Layers3, Sparkles, Users, Plus, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { createBlend, joinBlend } from '@/actions/social-suite';

export const dynamic = 'force-dynamic';

export default async function Blends() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const [{ data: rows, error }, { data: members }, { data: profiles }] = await Promise.all([
    db.from('blends').select('id,owner_id,name,description,created_at').order('created_at', { ascending: false }),
    db.from('blend_members').select('blend_id,user_id'),
    db.from('profiles').select('id,full_name')
  ]);
  if (error) throw new Error(error.message);
  const joined = new Set((members || []).filter((m: any) => m.user_id === user.id).map((m: any) => m.blend_id));
  const names = new Map((profiles || []).map((p: any) => [p.id, p]));
  const counts = new Map<string, number>();
  (members || []).forEach((m: any) => counts.set(m.blend_id, (counts.get(m.blend_id) || 0) + 1));
  return <AppShell active="/blends">
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 px-4 sm:px-0"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b78e6]">Your shared interests</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[#302443]">Blends</h1></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f0ecf8] text-[#6652a5]"><Layers3 size={21}/></span></div><p className="mt-2 max-w-xl text-sm leading-6 text-[#898196]">Smaller spaces for your circle to collect ideas, recommendations, plans and moments.</p></header>
      <section className="mb-7 rounded-3xl bg-[linear-gradient(120deg,#302642,#55447c_65%,#8974b8)] p-5 text-white shadow-[0_12px_32px_rgba(48,38,66,.16)] sm:p-7">
        <div className="flex items-center gap-2 text-white/75"><Sparkles size={16}/><span className="text-[10px] font-bold uppercase tracking-[.18em]">Make something together</span></div><h2 className="mt-3 text-xl font-bold">Create a Blend</h2><p className="mt-1 max-w-lg text-xs leading-5 text-white/70">A shared board for a small group with a common interest or goal.</p>
        <form action={createBlend} className="mt-5 grid gap-2 sm:grid-cols-[1fr_1.3fr_auto]"><input className="min-w-0 rounded-xl border border-white/20 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/55 focus:border-white/50" name="name" minLength={3} maxLength={60} required placeholder="e.g. Weekend explorers"/><input className="min-w-0 rounded-xl border border-white/20 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/55 focus:border-white/50" name="description" maxLength={240} placeholder="What will you share together?"/><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#51417e] transition hover:bg-[#f2edfb]"><Plus size={15}/> Create</button></form>
      </section>
      <section className="px-3 sm:px-0"><div className="mb-4 flex items-end justify-between"><div><h2 className="text-base font-bold text-[#302443]">Explore Blends</h2><p className="mt-0.5 text-xs text-[#938ca0]">Small circles, shared boards</p></div><span className="rounded-full bg-[#f0ecf8] px-3 py-1.5 text-[10px] font-semibold text-[#6652a5]">{(rows || []).length} blends</span></div>
        {(rows || []).length ? <div className="grid gap-3 sm:grid-cols-2">{(rows || []).map((b: any, index: number) => {const member = joined.has(b.id);const owner = (names.get(b.owner_id) as any)?.full_name || 'A member';return <article key={b.id} className="rounded-2xl border border-[#eeeaf3] bg-white p-4 shadow-[0_5px_24px_rgba(35,24,74,.035)] transition hover:-translate-y-0.5 hover:border-[#d9cfee] hover:shadow-[0_12px_32px_rgba(35,24,74,.07)] sm:p-5"><div className="flex items-start justify-between gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#eee8fb] to-[#d9ccef] text-[#6652a5]"><Layers3 size={21}/></span><span className={member?'rounded-full bg-[#edf7f0] px-2.5 py-1 text-[9px] font-bold text-[#39724c]':'rounded-full bg-[#f3f0f8] px-2.5 py-1 text-[9px] font-bold text-[#76698e]'}>{member?'MEMBER':'OPEN TO JOIN'}</span></div><h3 className="mt-4 text-base font-bold text-[#302a3d]">{b.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-[#81798e]">{b.description||'A shared space to collect ideas and moments.'}</p><div className="mt-4 flex items-center gap-2 text-[10px] text-[#9991a4]"><Users size={12}/>{counts.get(b.id)||0} members<span>·</span><span>Started by {owner}</span></div><div className="mt-4">{member?<Link className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#594681] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#7056b2]" href={'/blends/'+b.id}>Open shared board <ArrowUpRight size={14}/></Link>:<form action={async()=>{'use server';await joinBlend(b.id)}}><button className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#e7e1ee] px-3 py-2.5 text-xs font-semibold text-[#5f5472] hover:bg-[#faf8fc]">Join Blend <Plus size={14}/></button></form>}</div></article>})}</div>:<div className="rounded-3xl border border-[#eeeaf3] bg-white px-6 py-14 text-center"><Layers3 size={25} className="mx-auto text-[#7663a8]"/><h3 className="mt-3 font-semibold text-[#302443]">No Blends yet</h3><p className="mt-1 text-sm text-[#898196]">Create a shared board for your circle.</p></div>}
      </section><div className="mt-7 flex justify-center"><Link href="/groups" className="inline-flex items-center gap-2 text-xs font-semibold text-[#6a579b]">Looking for open communities? Explore Groups <ArrowUpRight size={14}/></Link></div>
    </div>
  </AppShell>;
}
