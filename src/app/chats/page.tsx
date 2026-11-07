import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';

export const dynamic = 'force-dynamic';

export default async function Chats() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const [{ data: memberships }, { data: notes }] = await Promise.all([
    db.from('conversation_members').select('conversation_id').eq('user_id', user.id),
    db.from('notes').select('id,user_id,content,created_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(50),
  ]);
  const ids = (memberships || []).map(x => x.conversation_id);
  const { data: conversations } = ids.length ? await db.from('conversations').select('id,type,title,group_id').in('id', ids) : { data: [] as any[] };
  const { data: messages } = ids.length ? await db.from('messages').select('id,conversation_id,sender_id,content,created_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(300) : { data: [] as any[] };
  const { data: allMembers } = ids.length ? await db.from('conversation_members').select('conversation_id,user_id').in('conversation_id', ids).neq('user_id', user.id) : { data: [] as any[] };
  const participantIds = Array.from(new Set([...(allMembers || []).map(m => m.user_id), ...(notes || []).map(n => n.user_id)]));
  const { data: profiles } = participantIds.length ? await db.from('profiles').select('id,full_name,username').in('id', participantIds) : { data: [] as any[] };
  const profileById = new Map((profiles || []).map(p => [p.id, p]));
  const groupChats = (conversations || []).filter(c => c.type === 'group');
  const privateChats = (conversations || []).filter(c => c.type === 'private');

  return <AppShell active="/chats">
    <div className="mb-7"><h1 className="text-3xl font-semibold sm:text-4xl">Messages</h1><p className="mt-2 text-sm muted">Your conversations and little updates from your people.</p></div>
    <section className="surface mb-8 rounded-3xl p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Notes</h2><p className="mt-0.5 text-xs muted">Quick thoughts that disappear in 24 hours</p></div><Link href="/stories" className="inline-flex items-center gap-1 rounded-full bg-[#eee8fb] px-3 py-2 text-xs font-semibold text-[#604c9b]"><Plus size={14}/> Add note</Link></div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">{(notes || []).map((note: any) => { const person: any = profileById.get(note.user_id); return <article key={note.id} className="w-[190px] shrink-0 rounded-[1.35rem] border border-[#e9e2f5] bg-gradient-to-br from-[#f8f4ff] to-[#eee8fb] p-3.5"><p className="line-clamp-4 min-h-[76px] text-sm leading-5 text-[#342a4c]">“{note.content}”</p><div className="mt-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#dcd2f2] text-[10px] font-bold text-[#594687]">{(person?.full_name || 'C').slice(0,1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-[#554477]">{person?.full_name || 'CONNECT member'}</p>{person?.username && <p className="truncate text-[10px] text-[#9186a5]">@{person.username}</p>}</div></div></article>; })}{!notes?.length && <div className="rounded-2xl bg-[#f7f4fb] px-4 py-5 text-xs muted">No notes from your people yet. Drop the first one.</div>}</div>
    </section>
    <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Your chats</h2><Link href="/discover" className="text-xs font-semibold text-[#6552a2]">Find people →</Link></div>
    <div className="space-y-3">
      {privateChats.map(c => { const latest = (messages || []).find(m => m.conversation_id === c.id); const otherId = (allMembers || []).find(m => m.conversation_id === c.id)?.user_id; const person: any = otherId ? profileById.get(otherId) : null; return <Link key={c.id} href={`/chats/${c.id}`} className="surface flex items-center gap-3 rounded-3xl p-4 transition hover:-translate-y-0.5 sm:p-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ded4f4] to-[#bca9e2] text-base font-semibold text-[#4e3a79]">{(person?.full_name || 'F').slice(0,1).toUpperCase()}</span><div className="min-w-0 flex-1"><h3 className="font-semibold">{person?.full_name || 'Your friend'}</h3><p className="mt-1 truncate text-sm muted">{latest?.content || 'No messages yet. Say hello.'}</p></div><span className="text-sm text-[#6552a2]">›</span></Link>; })}
      {groupChats.map(c => { const latest = (messages || []).find(m => m.conversation_id === c.id); return <Link key={c.id} href={c.group_id ? `/groups/${c.group_id}` : '/groups'} className="surface block rounded-3xl p-5 transition hover:-translate-y-0.5"><span className="pill">COMMUNITY CHAT</span><h3 className="mt-3 font-semibold">{c.title || 'Community'}</h3><p className="mt-1 text-sm muted">{latest?.content || 'No messages yet. Start the conversation.'}</p></Link>; })}
      {!conversations?.length && <div className="surface rounded-3xl p-8 text-center"><h2 className="font-semibold">Your inbox is quiet.</h2><p className="mt-2 text-sm muted">Connect with someone or join a community to start a conversation.</p><div className="mt-5 flex justify-center gap-2"><Link href="/discover" className="btn btn-primary">Discover people</Link><Link href="/groups" className="btn btn-secondary">Explore communities</Link></div></div>}
    </div>
  </AppShell>;
}
