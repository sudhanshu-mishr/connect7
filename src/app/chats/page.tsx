import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search, MessageCircle, Users, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';

export const dynamic = 'force-dynamic';

function timeLabel(value?: string) {
  if (!value) return '';
  const date = new Date(value), now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  return date.toLocaleDateString([], {day:'numeric',month:'short'});
}

export default async function Chats() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const [{ data: memberships }, { data: notes }] = await Promise.all([
    db.from('conversation_members').select('conversation_id').eq('user_id', user.id),
    db.from('notes').select('id,user_id,content,created_at').gt('expires_at', new Date().toISOString()).order('created_at', {ascending:false}).limit(50),
  ]);
  const ids = (memberships || []).map(x => x.conversation_id);
  const [{ data: conversations }, { data: messages }, { data: members }] = await Promise.all([
    ids.length ? db.from('conversations').select('id,type,title,group_id').in('id', ids) : Promise.resolve({data:[] as any[]}),
    ids.length ? db.from('messages').select('id,conversation_id,sender_id,content,created_at').in('conversation_id', ids).order('created_at', {ascending:false}).limit(500) : Promise.resolve({data:[] as any[]}),
    ids.length ? db.from('conversation_members').select('conversation_id,user_id').in('conversation_id', ids).neq('user_id', user.id) : Promise.resolve({data:[] as any[]}),
  ]);
  const profileIds = Array.from(new Set([...(members || []).map(m=>m.user_id), ...(notes || []).map(n=>n.user_id)]));
  const {data: profiles} = profileIds.length ? await db.from('profiles').select('id,full_name,username').in('id',profileIds) : {data:[] as any[]};
  const byId = new Map((profiles || []).map(p=>[p.id,p]));
  const privateChats = (conversations || []).filter(c=>c.type==='private').map(c=>{
    const latest=(messages || []).find(m=>m.conversation_id===c.id);
    const member=(members || []).find(m=>m.conversation_id===c.id);
    const person:any=member?byId.get(member.user_id):null;
    return {id:c.id,name:person?.full_name||'Your friend',username:person?.username||'',initial:(person?.full_name||'F').slice(0,1).toUpperCase(),preview:latest?(latest.sender_id===user.id?'You: ':'')+latest.content:'Say hello and start a conversation.',time:latest?.created_at||'',kind:'private'};
  });
  const groupChats=(conversations || []).filter(c=>c.type==='group').map(c=>{
    const latest=(messages || []).find(m=>m.conversation_id===c.id);
    return {id:c.id,name:c.title||'Community',username:'Group conversation',initial:(c.title||'C').slice(0,1).toUpperCase(),preview:latest?latest.content:'Start the conversation.',time:latest?.created_at||'',kind:'group',groupId:c.group_id};
  });
  const chats=[...privateChats,...groupChats].sort((a,b)=>new Date(b.time||0).getTime()-new Date(a.time||0).getTime());
  return <AppShell active="/chats">
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between px-4 sm:px-0"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#8b7ca8]">Your space</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Messages</h1></div><Link href="/discover" aria-label="Find people" className="grid h-11 w-11 place-items-center rounded-full bg-[#eee8fb] text-[#604c9b]"><MessageCircle size={19}/></Link></div>
      <section className="mb-7 px-4 sm:px-0">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Notes</h2><p className="text-xs muted">A little thought from your people</p></div><Link href="/stories" className="text-xs font-semibold text-[#66509d]">Your note +</Link></div>
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">{(notes||[]).map((note:any)=>{const person:any=byId.get(note.user_id);return <article key={note.id} className="w-[174px] shrink-0 rounded-[1.4rem] border border-[#e9e2f5] bg-gradient-to-br from-[#faf7ff] to-[#eee8fb] p-3.5 shadow-sm"><p className="line-clamp-4 min-h-[76px] text-sm leading-5 text-[#342a4c]">{note.content}</p><div className="mt-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#dcd2f2] text-[10px] font-bold text-[#594687]">{(person?.full_name||'C').slice(0,1).toUpperCase()}</span><span className="truncate text-[11px] font-semibold text-[#554477]">{person?.full_name||'CONNECT member'}</span></div></article>})}{!notes?.length&&<div className="rounded-2xl bg-[#f7f4fb] px-4 py-5 text-xs muted">No notes yet. Share a thought to start.</div>}</div>
      </section>
      <div className="mb-4 px-4 sm:px-0"><div className="flex items-center gap-3 rounded-2xl border border-[#e9e5ef] bg-white px-4 py-3 text-[#9992a7]"><Search size={18}/><span className="text-sm">Search conversations</span></div></div>
      <div className="mb-3 flex items-center justify-between px-4 sm:px-0"><h2 className="text-sm font-semibold">Messages</h2><span className="text-xs muted">{chats.length} conversations</span></div>
      <div className="space-y-1 px-2 sm:px-0">
      {chats.map(chat=><Link key={chat.id} href={chat.kind==='group'?(chat.groupId?'/groups/'+chat.groupId:'/groups'):'/chats/'+chat.id} className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/80 active:scale-[.99]"><span className={`grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full text-lg font-semibold ${chat.kind==='group'?'bg-[#e9e5f3] text-[#655b78]':'bg-gradient-to-br from-[#e6ddf7] to-[#c6b5e8] text-[#4e3a79]'}`}>{chat.kind==='group'?<Users size={21}/>:chat.initial}</span><div className="min-w-0 flex-1 border-b border-[#eeeaf3] pb-3 pt-1 group-last:border-0"><div className="flex items-center justify-between gap-3"><h3 className="truncate text-sm font-semibold">{chat.name}</h3><time className="shrink-0 text-[10px] muted">{timeLabel(chat.time)}</time></div><p className="mt-1 truncate text-xs muted">{chat.preview}</p></div><ChevronRight size={16} className="text-[#b3aabe]"/></Link>)}
      {!chats.length&&<div className="surface mx-2 rounded-3xl p-9 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#eee8fb] text-[#604c9b]"><MessageCircle size={24}/></div><h2 className="mt-4 font-semibold">Your inbox is waiting</h2><p className="mt-2 text-sm muted">Find people who share your wavelength and start a conversation.</p><Link href="/discover" className="btn btn-primary mt-5">Discover people</Link></div>}
      </div>
    </div>
  </AppShell>;
}
