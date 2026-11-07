import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { RealtimeChat } from '@/components/realtime-chat';
import { joinGroup } from '@/actions/social';

export default async function CommunityPage({ params }: { params: { id: string } }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: group } = await db.from('groups').select('id,name,description,owner_id,created_at').eq('id', params.id).maybeSingle();
  if (!group) notFound();
  const { data: membership } = await db.from('group_members').select('role').eq('group_id', group.id).eq('user_id', user.id).maybeSingle();
  const isMember = !!membership;
  const { data: people } = isMember ? await db.rpc('get_group_members', { p_group_id: group.id }) : { data: [] as any[] };
  const { data: conversation } = isMember ? await db.from('conversations').select('id').eq('group_id', group.id).eq('type', 'group').maybeSingle() : { data: null };
  if (conversation) await db.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversation.id).eq('user_id', user.id);
  const { data: messages } = conversation ? await db.from('messages').select('id,sender_id,content,created_at').eq('conversation_id', conversation.id).order('created_at', { ascending: true }).limit(100) : { data: [] as any[] };
  const senderNames = Object.fromEntries((people || []).map((person: any) => [person.id, person.full_name || 'Community member']));

  return <AppShell active="/groups">
    <Link href="/groups" className="text-sm font-semibold text-[#6552a2]">← All communities</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><span className="pill">COMMUNITY</span><h1 className="mt-3 text-4xl font-semibold">{group.name}</h1><p className="mt-2 max-w-2xl muted">{group.description || 'A place to connect around a shared interest.'}</p></div>{isMember ? <span className="pill">You’re a member</span> : <form action={async () => { 'use server'; await joinGroup(group.id); }}><button className="btn btn-primary">Join community</button></form>}</div>
    {isMember ? <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><div>{conversation ? <RealtimeChat conversationId={conversation.id} currentUserId={user.id} initialMessages={messages || []} senderNames={senderNames} mode="group" groupId={group.id} placeholder="Message the community…" /> : <section className="surface rounded-3xl p-6"><h2 className="text-xl font-semibold">Community chat is being set up</h2><p className="mt-2 text-sm muted">Please refresh in a moment. If this continues, contact support.</p></section>}</div><aside className="surface h-fit rounded-3xl p-5"><h2 className="text-lg font-semibold">Members</h2><p className="mt-1 text-sm muted">{(people || []).length} people in this community</p><div className="mt-5 space-y-2">{(people || []).map((person: any) => <Link key={person.id} href={`/u/${person.id}`} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-[#f7f5fb]"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8e2fa] text-sm font-semibold text-[#6552a2]">{(person.full_name || '?').split(' ').map((part: string) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{person.full_name}</p><p className="truncate text-xs muted">@{person.username}</p></div><span className="ml-auto text-xs font-semibold text-[#7561ad]">View →</span></Link>)}</div></aside></div> : <div className="surface mt-8 rounded-3xl p-8"><h2 className="text-xl font-semibold">Join this community to enter</h2><p className="mt-2 text-sm muted">Members can view the member list and take part in the shared community chat.</p><form action={async () => { 'use server'; await joinGroup(group.id); }} className="mt-5"><button className="btn btn-primary">Join and open chat</button></form></div>}
  </AppShell>;
}
