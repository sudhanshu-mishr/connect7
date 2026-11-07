import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Check, Clock3, Heart, Sparkles, UserRound, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { respondRequest } from '@/actions/connections';

export const dynamic = 'force-dynamic';

export default async function Requests() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: reqs, error } = await db.from('connection_requests')
    .select('id,from_user,status,created_at')
    .eq('to_user', user.id).eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const ids = (reqs || []).map(r => r.from_user);
  const { data: people, error: peopleError } = ids.length
    ? await db.from('profiles').select('id,full_name,username,bio,city,interests').in('id', ids)
    : { data: [], error: null };
  if (peopleError) throw new Error(peopleError.message);
  const map = new Map<string, any>((people || []).map(p => [p.id, p]));
  const requests = (reqs || []).map(r => ({ request: r, person: map.get(r.from_user) })).filter(x => x.person);

  return <AppShell active="/requests">
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 px-4 sm:px-0">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b78e6]">Your people</p>
        <div className="mt-1 flex items-end justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-[#302443]">Connection requests</h1><p className="mt-1 text-sm text-[#898196]">People who would like to connect with you.</p></div><span className="rounded-full bg-[#f0ecf8] px-3 py-1.5 text-xs font-semibold text-[#6652a5]">{requests.length} pending</span></div>
      </header>
      {requests.length ? <section className="space-y-3 px-3 sm:px-0">{requests.map(({request,person}:any) => {
        const initials = (person.full_name || 'C').split(' ').filter(Boolean).slice(0,2).map((x:string)=>x[0]).join('').toUpperCase();
        return <article key={request.id} className="rounded-2xl border border-[#eeeaf3] bg-white p-4 shadow-[0_5px_24px_rgba(35,24,74,.035)] sm:p-5">
          <div className="flex items-start gap-3.5">
            <Link href={'/u/'+person.id} className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#eee8fb] to-[#cbbce9] text-lg font-bold text-[#55427f]">{initials}</Link>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2"><Link href={'/u/'+person.id} className="text-sm font-bold text-[#302a3d]">{person.full_name||'CONNECT member'}</Link><span className="text-[10px] text-[#a29aaa]">@{person.username||'member'}</span></div>
              {person.city&&<p className="mt-1 text-[10px] text-[#938a9f]">{person.city}</p>}
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#746d82]">{person.bio||'Would like to get to know you and build a genuine connection.'}</p>
              {!!person.interests?.length&&<div className="mt-2 flex flex-wrap gap-1">{person.interests.slice(0,3).map((x:string)=><span key={x} className="rounded-full bg-[#f5f2fa] px-2 py-1 text-[9px] text-[#695d80]">{x}</span>)}</div>}
              <p className="mt-2 flex items-center gap-1 text-[10px] text-[#aaa3b2]"><Clock3 size={11}/>{new Date(request.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#f0edf4] pt-3">
            <form action={async()=>{'use server';await respondRequest(request.id,true);}}><button className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#594681] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#7056b2]"><Check size={14}/> Accept</button></form>
            <form action={async()=>{'use server';await respondRequest(request.id,false);}}><button className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#e7e1ee] px-3 py-2.5 text-xs font-semibold text-[#71687f] transition hover:bg-[#faf8fc]"><X size={14}/> Decline</button></form>
          </div>
        </article>;
      })}</section> : <div className="mx-3 rounded-3xl border border-[#eeeaf3] bg-white px-6 py-14 text-center shadow-[0_8px_30px_rgba(35,24,74,.035)] sm:mx-0"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f0ecf8] text-[#6a5798]"><Heart size={23}/></div><h2 className="mt-4 text-base font-bold text-[#302443]">No requests just yet</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#898196]">When someone with a compatible mindset wants to connect, their request will show up here.</p><Link href="/discover" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#594681] px-5 py-2.5 text-xs font-semibold text-white">Discover people <ArrowRight size={13}/></Link></div>}
    </div>
  </AppShell>;
}
