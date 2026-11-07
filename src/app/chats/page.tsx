import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';

export default async function Chats() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: memberships } = await db.from('conversation_members').select('conversation_id').eq('user_id', user.id);
  const ids = (memberships || []).map(x => x.conversation_id);
  const { data: conversations } = ids.length ? await db.from('conversations').select('id,type,title,group_id').in('id', ids) : { data: [] as any[] };
  const { data: messages } = ids.length ? await db.from('messages').select('id,conversation_id,sender_id,content,created_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(300) : { data: [] as any[] };
  const { data: allMembers } = ids.length ? await db.from('conversation_members').select('conversation_id,user_id').in('conversation_id', ids).neq('user_id', user.id) : { data: [] as any[] };
  const participantIds = Array.from(new Set((allMembers || []).map(m => m.user_id)));
  const { data: profiles } = participantIds.length ? await db.from('profiles').select('id,full_name,username').in('id', participantIds) : { data: [] as any[] };
  const profileById = new Map((profiles || []).map(p => [p.id, p]));
  const groupChats = (conversations || []).filter(c => c.type === 'group');
  const privateChats = (conversations || []).filter(c => c.type === 'private');

  return <AppShell active="/chats">
    <h1 className="text-4xl font-semibold">Chats</h1>
    <p className="mt-2 muted">Private conversations with friends and shared community chats.</p>
    <div className="mt-8 space-y-4">
      {privateChats.map(c => {
        const latest = (messages || []).find(m => m.conversation_id === c.id);
        const otherId = (allMembers || []).find(m => m.conversation_id === c.id)?.user_id;
        const person = otherId ? profileById.get(otherId) : null;
        return <Link key={c.id} href={`/chats/${c.id}`} className="surface flex items-center justify-between gap-4 rounded-3xl p-5 transition hover:-translate-y-0.5">
          <div className="min-w-0"><span className="pill">PRIVATE CHAT</span><h2 className="mt-3 font-semibold">{person?.full_name || 'Your friend'}</h2><p className="mt-1 truncate text-sm muted">{latest?.content || 'No messages yet. Say hello.'}</p></div>
          <span className="shrink-0 text-sm font-semibold text-[#6552a2]">Open →</span>
        </Link>;
      })}
      {groupChats.map(c => {
        const latest = (messages || []).find(m => m.conversation_id === c.id);
        return <Link key={c.id} href={c.group_id ? `/groups/${c.group_id}` : '/groups'} className="surface block rounded-3xl p-5 transition hover:-translate-y-0.5">
          <span className="pill">COMMUNITY CHAT</span><h2 className="mt-3 font-semibold">{c.title || 'Community'}</h2><p className="mt-1 text-sm muted">{latest?.content || 'No messages yet. Start the conversation.'}</p><span className="mt-3 inline-block text-sm font-semibold text-[#6552a2]">Open chat →</span>
        </Link>;
      })}
      {!conversations?.length && <div className="surface rounded-3xl p-8 text-center"><h2 className="font-semibold">Your inbox is quiet.</h2><p className="mt-2 text-sm muted">Connect with someone or join a community to start a conversation.</p><div className="mt-5 flex justify-center gap-2"><Link href="/discover" className="btn btn-primary">Discover people</Link><Link href="/groups" className="btn btn-secondary">Explore communities</Link></div></div>}
    </div>
  </AppShell>;
}
