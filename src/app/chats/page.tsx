import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { ChatInbox, type ChatInboxItem } from '@/components/chat-inbox';

export default async function Chats() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberships } = await db.from('conversation_members').select('conversation_id,last_read_at').eq('user_id', user.id);
  const ids = (memberships || []).map((item) => item.conversation_id);
  const { data: conversations } = ids.length ? await db.from('conversations').select('id,type,title,group_id').in('id', ids) : { data: [] as any[] };
  const { data: messages } = ids.length ? await db.from('messages').select('id,conversation_id,sender_id,content,created_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(500) : { data: [] as any[] };
  const { data: allMembers } = ids.length ? await db.from('conversation_members').select('conversation_id,user_id').in('conversation_id', ids).neq('user_id', user.id) : { data: [] as any[] };

  const participantIds = Array.from(new Set((allMembers || []).map((member) => member.user_id)));
  const { data: profiles } = participantIds.length ? await db.from('profiles').select('id,full_name,username').in('id', participantIds) : { data: [] as any[] };
  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const lastReadById = new Map((memberships || []).map((item) => [item.conversation_id, item.last_read_at]));
  const latestById = new Map<string, any>();
  for (const message of messages || []) if (!latestById.has(message.conversation_id)) latestById.set(message.conversation_id, message);

  const items: ChatInboxItem[] = (conversations || []).map((conversation) => {
    const latest = latestById.get(conversation.id);
    const otherId = (allMembers || []).find((member) => member.conversation_id === conversation.id)?.user_id;
    const person = otherId ? profileById.get(otherId) : null;
    const isGroup = conversation.type === 'group';
    const title = isGroup ? (conversation.title || 'Community') : (person?.full_name || 'Your friend');
    const lastRead = lastReadById.get(conversation.id);
    const unread = (messages || []).filter((message) => message.conversation_id === conversation.id && message.sender_id !== user.id && (!lastRead || message.created_at > String(lastRead))).length;
    return {
      id: conversation.id,
      href: isGroup && conversation.group_id ? `/groups/${conversation.group_id}` : `/chats/${conversation.id}`,
      type: isGroup ? ('community' as const) : ('private' as const),
      title,
      subtitle: isGroup ? 'Community conversation' : (person?.username ? `@${person.username}` : 'Your connection'),
      preview: latest?.content || (isGroup ? 'Start the community conversation' : 'Say hello and start the conversation'),
      createdAt: latest?.created_at || null,
      unread,
      initials: title.split(/\s+/).map((part: string) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    };
  }).sort((a, b) => {
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return <AppShell active="/chats">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><span className="pill">YOUR SPACE</span><h1 className="mt-3 text-4xl font-semibold tracking-tight">Messages</h1><p className="mt-2 muted">Pick up where you left off with your people.</p></div>
      <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm"><span className="font-semibold">{items.length}</span><span className="muted"> conversations</span></div>
    </div>
    <ChatInbox items={items} />
  </AppShell>;
}
