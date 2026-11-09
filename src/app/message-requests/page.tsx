import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Check, Clock3, MessageCircle, Send, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { acceptMessageRequest, declineMessageRequest } from '@/actions/message-requests';

export const dynamic = 'force-dynamic';

export default async function MessageRequestsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: incoming, error: incomingError }, { data: outgoing, error: outgoingError }] = await Promise.all([
    db.from('message_requests').select('id,from_user,to_user,message,created_at').eq('to_user', user.id).eq('status', 'pending').order('created_at', { ascending: false }),
    db.from('message_requests').select('id,from_user,to_user,message,created_at').eq('from_user', user.id).eq('status', 'pending').order('created_at', { ascending: false })
  ]);
  if (incomingError) throw new Error(incomingError.message);
  if (outgoingError) throw new Error(outgoingError.message);

  const ids = Array.from(new Set([...(incoming || []).map(r => r.from_user), ...(outgoing || []).map(r => r.to_user)]));
  const { data: profiles, error: profilesError } = ids.length
    ? await db.from('profiles').select('id,full_name,username').in('id', ids)
    : { data: [], error: null };
  if (profilesError) throw new Error(profilesError.message);
  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return <AppShell active="/chats">
    <div className="mx-auto max-w-3xl px-3 sm:px-0">
      <header className="mb-6 flex items-center gap-3">
        <Link href="/chats" aria-label="Back to inbox" className="grid h-10 w-10 place-items-center rounded-full text-[#655b78] hover:bg-[#eee8fb]"><ArrowLeft size={19}/></Link>
        <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8b78e6]">Your inbox, your choice</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[#302443]">Message requests</h1></div>
      </header>

      <section>
        <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-bold text-[#302443]">Received</h2><p className="mt-1 text-xs text-[#92899f]">Accept to open a private chat, or decline quietly.</p></div><span className="rounded-full bg-[#f0ecf8] px-3 py-1.5 text-xs font-semibold text-[#6652a5]">{(incoming || []).length} pending</span></div>
        {(incoming || []).length ? <div className="space-y-3">{(incoming || []).map(request => {
          const person = profileMap.get(request.from_user);
          const name = person?.full_name || 'CONNECT member';
          return <article key={request.id} className="rounded-2xl border border-[#eeeaf3] bg-white p-4 shadow-[0_5px_24px_rgba(35,24,74,.035)] sm:p-5">
            <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#eee8fb] to-[#cbbce9] text-sm font-bold text-[#55427f]">{name.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2"><Link href={'/u/'+request.from_user} className="text-sm font-bold text-[#302a3d]">{name}</Link><span className="text-[10px] text-[#a29aaa]">@{person?.username || 'member'}</span></div><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#51495e]">{request.message}</p><p className="mt-2 flex items-center gap-1 text-[10px] text-[#aaa3b2]"><Clock3 size={11}/>{new Date(request.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#f0edf4] pt-3">
              <form action={async()=>{'use server';await acceptMessageRequest(request.id);}}><button className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#594681] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#7056b2]"><Check size={14}/>Accept & chat</button></form>
              <form action={async()=>{'use server';await declineMessageRequest(request.id);}}><button className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#e7e1ee] px-3 py-2.5 text-xs font-semibold text-[#71687f] transition hover:bg-[#faf8fc]"><X size={14}/>Decline</button></form>
            </div>
          </article>;
        })}</div> : <div className="rounded-3xl border border-dashed border-[#e4deed] bg-white/70 px-6 py-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#eee8fb] text-[#604c9b]"><MessageCircle size={21}/></div><h3 className="mt-3 text-sm font-semibold text-[#413750]">No message requests</h3><p className="mt-1 text-xs text-[#92899f]">New introductions from people you're not connected with will appear here.</p></div>}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-bold text-[#302443]">Sent</h2><p className="mt-1 text-xs text-[#92899f]">Requests waiting for a response.</p></div><span className="text-xs text-[#92899f]">{(outgoing || []).length} pending</span></div>
        {(outgoing || []).length ? <div className="divide-y divide-[#eeeaf3] rounded-2xl border border-[#eeeaf3] bg-white">{(outgoing || []).map(request => {
          const person = profileMap.get(request.to_user);
          return <div key={request.id} className="flex items-center gap-3 p-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f0edf8] text-sm font-bold text-[#655b78]">{(person?.full_name || 'C').slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><Link href={'/u/'+request.to_user} className="block truncate text-sm font-semibold text-[#40384f]">{person?.full_name || 'CONNECT member'}</Link><p className="mt-0.5 truncate text-xs text-[#92899f]">{request.message}</p></div><span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f4f1f8] px-2.5 py-1.5 text-[10px] font-semibold text-[#776b8b]"><Send size={11}/>Pending</span></div>;
        })}</div> : <p className="rounded-2xl border border-[#eeeaf3] bg-white px-4 py-5 text-xs text-[#92899f]">You haven't sent any pending introductions.</p>}
      </section>
    </div>
  </AppShell>;
}
