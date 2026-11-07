import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {AppShell} from '@/components/app-shell';
import {sendMessage} from '@/actions/social';

export default async function Chats(){
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) redirect('/login');
  const {data:members}=await db.from('conversation_members').select('conversation_id').eq('user_id',user.id);
  const ids=(members||[]).map(x=>x.conversation_id);
  const {data:conversations}=ids.length?await db.from('conversations').select('id,type,title,group_id').in('id',ids):{data:[] as any[]};
  const {data:messages}=ids.length?await db.from('messages').select('id,conversation_id,sender_id,content,created_at').in('conversation_id',ids).order('created_at',{ascending:true}).limit(200):{data:[] as any[]};
  const {data:profiles}=await db.from('profiles').select('id,full_name').neq('id',user.id);
  const names=new Map<string,string>((profiles||[]).map(p=>[p.id,p.full_name] as [string,string]));
  const groupChats=(conversations||[]).filter(c=>c.type==='group');
  const privateChats=(conversations||[]).filter(c=>c.type!=='group');
  return <AppShell active="/chats">
    <h1 className="text-4xl font-semibold">Conversations</h1>
    <p className="mt-2 muted">Your private connections and community conversations.</p>
    <div className="mt-8 space-y-4">
      {groupChats.map(c=>{
        const latest=(messages||[]).filter(m=>m.conversation_id===c.id).slice(-1)[0];
        return <Link key={c.id} href={c.group_id?`/groups/${c.group_id}`:'/groups'} className="surface block rounded-3xl p-5 transition hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-3"><div><span className="pill">COMMUNITY CHAT</span><h2 className="mt-3 text-lg font-semibold">{c.title||'Community'}</h2><p className="mt-1 text-sm muted">{latest?latest.content:'No messages yet. Start the conversation.'}</p></div><span className="text-sm font-semibold text-[#6552a2]">Open chat →</span></div>
        </Link>;
      })}
      {privateChats.map(c=><section key={c.id} className="surface rounded-3xl p-5">
        <h2 className="font-semibold">Private conversation</h2>
        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">{(messages||[]).filter(m=>m.conversation_id===c.id).map(m=><div key={m.id} className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.sender_id===user.id?'ml-auto bg-[#29233d] text-white':'bg-[#f0edf8]'}`}><small className="block opacity-60">{m.sender_id===user.id?'You':names.get(m.sender_id)||'Member'}</small>{m.content}</div>)}</div>
        <form action={async(fd)=>{'use server';await sendMessage(c.id,String(fd.get('content')||''));}} className="mt-4 flex gap-2"><input name="content" className="field" placeholder="Write a thoughtful message…" required maxLength={2000}/><button className="btn btn-primary">Send</button></form>
      </section>)}
      {ids.length===0&&<div className="surface rounded-3xl p-8 text-center"><h2 className="font-semibold">Your inbox is quiet.</h2><p className="mt-2 text-sm muted">Join a community or connect with someone to start a conversation.</p><Link href="/groups" className="btn btn-primary mt-5 inline-flex">Explore communities</Link></div>}
    </div>
  </AppShell>;
}
