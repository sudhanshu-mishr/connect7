import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { sendPrivateMessage } from '@/actions/chat';

export default async function PrivateChatPage({ params }: { params: { id: string } }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: membership, error: membershipError } = await db
    .from('conversation_members')
    .select('conversation_id')
    .eq('conversation_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) throw new Error(membershipError.message);
  if (!membership) notFound();

  const { data: conversation } = await db.from('conversations')
    .select('id,type')
    .eq('id', params.id)
    .eq('type', 'private')
    .maybeSingle();
  if (!conversation) notFound();

  const { data: participants } = await db.from('conversation_members')
    .select('user_id')
    .eq('conversation_id', params.id);
  const otherIds = (participants || []).map(p => p.user_id).filter(id => id !== user.id);
  const { data: profiles } = otherIds.length
    ? await db.from('profiles').select('id,full_name,username').in('id', otherIds)
    : { data: [] as any[] };
  const other = profiles?.[0];

  const { data: messages, error: messagesError } = await db.from('messages')
    .select('id,sender_id,content,created_at')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true })
    .limit(300);
  if (messagesError) throw new Error(messagesError.message);

  return <AppShell active="/chats">
    <div className="mb-6 flex items-center justify-between gap-3">
      <div>
        <Link href="/chats" className="text-sm font-medium text-[#7561bd]">← All chats</Link>
        <h1 className="mt-3 text-3xl font-semibold">{other?.full_name || 'Your friend'}</h1>
        {other?.username && <p className="text-sm muted">@{other.username}</p>}
      </div>
      {other && <Link href={`/u/${other.id}`} className="btn btn-secondary">View profile</Link>}
    </div>
    <section className="surface rounded-3xl p-5">
      <div className="min-h-[50vh] space-y-3">
        {!messages?.length && <p className="py-12 text-center text-sm muted">This is the beginning of your conversation. Say hello.</p>}
        {(messages || []).map(m => <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${m.sender_id === user.id ? 'bg-[#29233d] text-white' : 'bg-[#f0edf8] text-[#383347]'}`}>
            <p>{m.content}</p>
            <p className={`mt-1 text-[10px] ${m.sender_id === user.id ? 'text-white/60' : 'text-[#817b91]'}`}>{new Date(m.created_at).toLocaleString()}</p>
          </div>
        </div>)}
      </div>
      <form action={async (fd) => { 'use server'; await sendPrivateMessage(params.id, String(fd.get('content') || '')); }} className="mt-5 flex gap-2 border-t border-[#e9e5ef] pt-4">
        <input name="content" className="field" placeholder="Write a message…" required maxLength={2000} />
        <button className="btn btn-primary">Send</button>
      </form>
    </section>
  </AppShell>;
}
