import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { RealtimeChat } from '@/components/realtime-chat';

export default async function PrivateChatPage({ params }: { params: { id: string } }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: membership, error: membershipError } = await db.from('conversation_members').select('conversation_id').eq('conversation_id', params.id).eq('user_id', user.id).maybeSingle();
  if (membershipError) throw new Error(membershipError.message);
  if (!membership) notFound();
  const { data: conversation } = await db.from('conversations').select('id,type').eq('id', params.id).eq('type', 'private').maybeSingle();
  if (!conversation) notFound();

  await db.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', params.id).eq('user_id', user.id);
  const { data: participants } = await db.from('conversation_members').select('user_id').eq('conversation_id', params.id);
  const otherIds = (participants || []).map((participant) => participant.user_id).filter((id) => id !== user.id);
  const { data: profiles } = otherIds.length ? await db.from('profiles').select('id,full_name,username').in('id', otherIds) : { data: [] as any[] };
  const other = profiles?.[0];
  const { data: messages, error: messagesError } = await db.from('messages').select('id,sender_id,content,created_at').eq('conversation_id', params.id).order('created_at', { ascending: true }).limit(300);
  if (messagesError) throw new Error(messagesError.message);

  return <AppShell active="/chats">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><Link href="/chats" className="text-sm font-medium text-[#7561bd]">← All chats</Link><div className="mt-3 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e9e3f7] text-sm font-bold text-[#6552a2]">{(other?.full_name || 'YF').split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}</div><div><h1 className="text-2xl font-semibold">{other?.full_name || 'Your friend'}</h1>{other?.username && <p className="text-sm muted">@{other.username}</p>}</div></div></div>{other && <Link href={`/u/${other.id}`} className="btn btn-secondary">View profile</Link>}</div>
    <RealtimeChat conversationId={params.id} currentUserId={user.id} initialMessages={messages || []} mode="private" />
  </AppShell>;
}
