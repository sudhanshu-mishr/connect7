import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageCircle, Search, Users, UserRound, MapPin, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { startPrivateChat } from '@/actions/chat';

export const dynamic = 'force-dynamic';

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
    ? await db.from('profiles').select('id,full_name,username,bio,city,interests').in('id', friendIds)
    : { data: [], error: null };
  if (profileError) throw new Error(profileError.message);
  const byId = new Map((profiles || []).map(p => [p.id,p]));
  const ordered = friendIds.map(id=>byId.get(id)).filter(Boolean);

  return <AppShell active="/friends">
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 px-4 sm:px-0">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b78e6]">Your circle</p>
        <div className="mt-1 flex items-end justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-[#302443]">Friends</h1><p className="mt-1 text-sm text-[#898196]">People you have mutually connected with.</p></div><span className="rounded-full bg-[#f0ecf8] px-3 py-1.5 text-xs font-semibold text-[#6652a5]">{ordered.length} connections</span></div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#e9e4ef] bg-white px-3.5 py-3 text-xs text-[#aaa3b2] shadow-sm"><Search size={16}/>Your connections</div>
      </header>
      {!ordered.length ? <div className="mx-3 rounded-3xl border border-[#eeeaf3] bg-white px-6 py-14 text-center shadow-[0_8px_30px_rgba(35,24,74,.035)] sm:mx-0"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f0ecf8] text-[#6a5798]"><Users size={24}/></div><h2 className="mt-4 text-base font-bold text-[#302443]">Your circle starts here</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#898196]">Find people who share your mindset. When a request is accepted, you’ll find each other here.</p><Link href="/discover" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#594681] px-5 py-2.5 text-xs font-semibold text-white">Discover people <ArrowRight size={13}/></Link></div> :
      <div className="grid gap-3 px-3 sm:grid-cols-2 sm:px-0">{ordered.map((p:any)=>{const initials=(p.full_name||'?').split(' ').filter(Boolean).slice(0,2).map((x:string)=>x[0]).join('').toUpperCase();return <article key={p.id} className="rounded-2xl border border-[#eeeaf3] bg-white p-4 shadow-[0_5px_24px_rgba(35,24,74,.035)] transition hover:border-[#d9cfee] hover:shadow-[0_12px_32px_rgba(35,24,74,.07)]">
        <div className="flex items-center gap-3"><Link href={'/u/'+p.id} className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#eee8fb] to-[#cbbce9] text-lg font-bold text-[#55427f]">{initials}</Link><div className="min-w-0 flex-1"><Link href={'/u/'+p.id} className="block truncate text-sm font-bold text-[#302a3d]">{p.full_name||'CONNECT member'}</Link><p className="mt-0.5 truncate text-[10px] text-[#a29aaa]">@{p.username||'member'}</p>{p.city&&<p className="mt-1 flex items-center gap-1 text-[10px] text-[#938a9f]"><MapPin size={10}/>{p.city}</p>}</div><span className="rounded-full bg-[#edf7f0] px-2 py-1 text-[9px] font-semibold text-[#39724c]">Connected</span></div>
        {p.bio&&<p className="mt-3 line-clamp-2 text-xs leading-5 text-[#746d82]">{p.bio}</p>}
        {!!p.interests?.length&&<div className="mt-3 flex flex-wrap gap-1">{p.interests.slice(0,3).map((x:string)=><span key={x} className="rounded-full bg-[#f5f2fa] px-2 py-1 text-[9px] text-[#695d80]">{x}</span>)}</div>}
        <div className="mt-4 flex gap-2 border-t border-[#f0edf4] pt-3"><Link href={'/u/'+p.id} className="inline-flex flex-1 items-center justify-center rounded-full border border-[#e7e1ee] px-3 py-2.5 text-xs font-semibold text-[#5f5472] hover:bg-[#faf8fc]">Profile</Link><form action={async()=>{'use server';await startPrivateChat(p.id);}} className="flex-1"><button className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#594681] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#7056b2]"><MessageCircle size={14}/> Message</button></form></div>
      </article>})}</div>}
    </div>
  </AppShell>;
}
