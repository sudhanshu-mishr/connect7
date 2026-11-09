import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageCircle, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { NotesStrip } from '@/components/notes-strip';
import { InboxList } from '@/components/inbox-list';

export const dynamic = 'force-dynamic';

type ChatItem = {
 id: string;
 name: string;
 username: string;
 initial: string;
 preview: string;
 time: string;
 kind: 'private' | 'group';
 groupId: string | null;
 isPinned: boolean;
 unreadCount: number;
};

export default async function Chats(){
 const db=await createClient();
 const{data:{user}}=await db.auth.getUser();
 if(!user)redirect('/login');

 const membershipResult=await db.from('conversation_members').select('conversation_id,last_read_at,is_pinned').eq('user_id',user.id);
 // Older databases may not have the pin column yet. Retry without it so existing chats remain visible.
 const membershipFallback=membershipResult.error
  ? await db.from('conversation_members').select('conversation_id,last_read_at').eq('user_id',user.id)
  : null;
 const memberships=membershipResult.error
  ? (membershipFallback?.error ? (()=>{throw new Error('Could not load your conversations: '+membershipFallback.error.message)})() : (membershipFallback?.data||[]).map(row=>({...row,is_pinned:false})))
  : (membershipResult.data||[]);
 const notesResult=await db.from('notes').select('id,user_id,content,created_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(50);
 if(notesResult.error) throw new Error('Could not load notes: '+notesResult.error.message);
 const notes=notesResult.data||[];
 const ids=memberships.map(x=>x.conversation_id);
 const [conversationsResult,messagesResult,membersResult]=await Promise.all([
  ids.length?db.from('conversations').select('id,type,title,group_id').in('id',ids):Promise.resolve({data:[],error:null}),
  ids.length?db.from('messages').select('id,conversation_id,sender_id,content,created_at').in('conversation_id',ids).order('created_at',{ascending:false}).limit(500):Promise.resolve({data:[],error:null}),
  ids.length?db.from('conversation_members').select('conversation_id,user_id').in('conversation_id',ids).neq('user_id',user.id):Promise.resolve({data:[],error:null})
 ]);
 if(conversationsResult.error) throw new Error('Could not load conversations: '+conversationsResult.error.message);
 if(messagesResult.error) throw new Error('Could not load messages: '+messagesResult.error.message);
 if(membersResult.error) throw new Error('Could not load conversation participants: '+membersResult.error.message);
 const conversations=conversationsResult.data||[];
 const messages=messagesResult.data||[];
 const members=membersResult.data||[];
 const profileIds=Array.from(new Set([...(members||[]).map(m=>m.user_id),...(notes||[]).map(n=>n.user_id)]));
 const{data:profiles}=profileIds.length?await db.from('profiles').select('id,full_name,username').in('id',profileIds):{data:[] as any[]};
 const byId=new Map((profiles||[]).map(p=>[p.id,p]));
 const memberState=new Map((memberships||[]).map(m=>[m.conversation_id,m]));
 const unreadFor=(conversationId:string)=>{
  const lastRead=memberState.get(conversationId)?.last_read_at;
  return (messages||[]).filter(m=>m.conversation_id===conversationId&&m.sender_id!==user.id&&(!lastRead||new Date(m.created_at)>new Date(lastRead))).length;
 };
 const privateChats:ChatItem[]=(conversations||[]).filter(c=>c.type==='private').map(c=>{
  const latest=(messages||[]).find(m=>m.conversation_id===c.id);
  const member=(members||[]).find(m=>m.conversation_id===c.id);
  const person:any=member?byId.get(member.user_id):null;
  const name=person?.full_name||'Your friend';
  return{id:c.id,name,username:person?.username||'',initial:name.slice(0,1).toUpperCase(),preview:latest?(latest.sender_id===user.id?'You: ':'')+latest.content:'Say hello and start a conversation.',time:latest?.created_at||'',kind:'private',groupId:null,isPinned:!!memberState.get(c.id)?.is_pinned,unreadCount:unreadFor(c.id)};
 });
 const groupChats:ChatItem[]=(conversations||[]).filter(c=>c.type==='group').map(c=>{
  const latest=(messages||[]).find(m=>m.conversation_id===c.id);
  const name=c.title||'Community';
  return{id:c.id,name,username:'Group conversation',initial:name.slice(0,1).toUpperCase(),preview:latest?latest.content:'Start the conversation.',time:latest?.created_at||'',kind:'group',groupId:c.group_id,isPinned:!!memberState.get(c.id)?.is_pinned,unreadCount:unreadFor(c.id)};
 });
 const chats=[...privateChats,...groupChats].sort((a,b)=>(Number(b.isPinned)-Number(a.isPinned))||new Date(b.time||0).getTime()-new Date(a.time||0).getTime());
 const noteItems=(notes||[]).map((n:any)=>({id:n.id,user_id:n.user_id,content:n.content,name:(byId.get(n.user_id) as any)?.full_name||'Member'}));

 return <AppShell active="/chats">
  <div className="mx-auto max-w-3xl">
   <header className="mb-5 flex items-center justify-between px-4 sm:px-0">
    <div><h1 className="text-2xl font-bold tracking-tight">Messages</h1><p className="mt-1 text-xs text-[#92899f]">Your conversations, all in one place</p></div>
    <div className="flex items-center gap-2"><Link href="/message-requests" aria-label="Message requests" className="grid h-10 w-10 place-items-center rounded-full text-[#51417e] transition hover:bg-[#f1edf8]"><Mail size={19}/></Link><Link href="/discover" aria-label="Find people" className="grid h-10 w-10 place-items-center rounded-full text-[#51417e] transition hover:bg-[#f1edf8]"><MessageCircle size={22}/></Link></div>
   </header>
   <NotesStrip notes={noteItems} currentUserId={user.id}/>
   <div className="mt-5 mb-2 flex items-center justify-between px-1">
    <h2 className="text-sm font-semibold">Inbox</h2>
    <span className="text-xs text-[#92899f]">{chats.length} conversations</span>
   </div>
   <InboxList chats={chats}/>
  </div>
 </AppShell>;
}
