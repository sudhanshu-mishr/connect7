import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {AppShell} from '@/components/app-shell';
import {joinGroup,sendGroupMessage} from '@/actions/social';

export default async function CommunityPage({params}:{params:{id:string}}){
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) redirect('/login');
  const {data:group}=await db.from('groups').select('id,name,description,owner_id,created_at').eq('id',params.id).maybeSingle();
  if(!group) notFound();
  const {data:membership}=await db.from('group_members').select('role').eq('group_id',group.id).eq('user_id',user.id).maybeSingle();
  const isMember=!!membership;
  const {data:people}=isMember?await db.rpc('get_group_members',{p_group_id:group.id}):{data:[] as any[]};
  const {data:conversation}=isMember?await db.from('conversations').select('id').eq('group_id',group.id).eq('type','group').maybeSingle():{data:null};
  const {data:messages}=conversation?await db.from('messages').select('id,sender_id,content,created_at').eq('conversation_id',conversation.id).order('created_at',{ascending:true}).limit(100):{data:[] as any[]};
  const memberNames=new Map<string,string>((people||[]).map((p:any)=>[p.id,p.full_name] as [string,string]));
  return <AppShell active="/groups">
    <Link href="/groups" className="text-sm font-semibold text-[#6552a2]">← All communities</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><span className="pill">COMMUNITY</span><h1 className="mt-3 text-4xl font-semibold">{group.name}</h1><p className="mt-2 max-w-2xl muted">{group.description||'A place to connect around a shared interest.'}</p></div>{isMember?<span className="pill">You’re a member</span>:<form action={async()=>{'use server';await joinGroup(group.id);}}><button className="btn btn-primary">Join community</button></form>}</div>
    {isMember?<div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="surface rounded-3xl p-5 md:p-6">
        <div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Community chat</h2><p className="mt-1 text-sm muted">Everyone in this community can see these messages.</p></div><span className="pill">{(people||[]).length} members</span></div>
        <div className="mt-6 max-h-[520px] min-h-48 space-y-3 overflow-y-auto rounded-2xl bg-[#f7f5fb] p-4">
          {(messages||[]).length===0?<p className="py-12 text-center text-sm muted">No messages yet. Say hello and start the conversation.</p>:(messages||[]).map((m:any)=><div key={m.id} className={`max-w-[90%] rounded-2xl p-3 text-sm ${m.sender_id===user.id?'ml-auto bg-[#29233d] text-white':'bg-white text-[#29233d]'}`}><small className="mb-1 block font-semibold opacity-65">{m.sender_id===user.id?'You':memberNames.get(m.sender_id)||'Community member'}</small><p className="whitespace-pre-wrap break-words">{m.content}</p><small className="mt-1 block text-right opacity-50">{new Date(m.created_at).toLocaleString()}</small></div>)}
        </div>
        <form action={async(fd)=>{'use server';await sendGroupMessage(group.id,String(fd.get('content')||''));}} className="mt-4 flex gap-2"><input name="content" className="field min-w-0 flex-1" placeholder="Message the community…" required maxLength={2000}/><button className="btn btn-primary">Send</button></form>
      </section>
      <aside className="surface h-fit rounded-3xl p-5"><h2 className="text-lg font-semibold">Members</h2><p className="mt-1 text-sm muted">People in this community</p><div className="mt-5 space-y-4">{(people||[]).map((p:any)=><Link key={p.id} href={`/u/${p.id}`} className="flex items-start gap-3 rounded-xl p-2 transition hover:bg-[#f7f5fb]"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8e2fa] text-sm font-semibold text-[#6552a2]">{(p.full_name||'?').split(' ').map((x:string)=>x[0]).slice(0,2).join('')}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{p.full_name}</p><p className="text-xs muted">@{p.username}</p>{p.city&&<p className="mt-1 text-xs muted">{p.city}</p>}<p className="mt-1 text-xs font-semibold text-[#6552a2]">View profile →</p></div></Link>)}</div></aside>
    </div>:<div className="surface mt-8 rounded-3xl p-8"><h2 className="text-xl font-semibold">Join this community to enter</h2><p className="mt-2 text-sm muted">Members can view the member list and take part in the shared community chat.</p><form action={async()=>{'use server';await joinGroup(group.id);}} className="mt-5"><button className="btn btn-primary">Join and open chat</button></form></div>}
  </AppShell>;
}
