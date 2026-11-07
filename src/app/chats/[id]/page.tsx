import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, MoreHorizontal, Phone, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { RealtimeChat } from '@/components/realtime-chat';

export default async function PrivateChatPage({params}:{params:{id:string}}){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect('/login');
 const {data:membership,error:membershipError}=await db.from('conversation_members').select('conversation_id').eq('conversation_id',params.id).eq('user_id',user.id).maybeSingle();
 if(membershipError)throw new Error(membershipError.message);
 if(!membership)notFound();
 const {data:conversation}=await db.from('conversations').select('id,type').eq('id',params.id).eq('type','private').maybeSingle();
 if(!conversation)notFound();
 const {data:participants}=await db.from('conversation_members').select('user_id').eq('conversation_id',params.id);
 const otherIds=(participants||[]).map(p=>p.user_id).filter(id=>id!==user.id);
 const {data:profiles}=otherIds.length?await db.from('profiles').select('id,full_name,username').in('id',otherIds):{data:[] as any[]};
 const other=profiles?.[0];
 const {data:messages,error:messagesError}=await db.from('messages').select('id,sender_id,content,created_at').eq('conversation_id',params.id).order('created_at',{ascending:true}).limit(300);
 if(messagesError)throw new Error(messagesError.message);
 const displayName=other?.full_name||'Your friend';
 return <AppShell active="/chats">
  <div className="mx-auto max-w-3xl">
   <header className="sticky top-[57px] z-10 flex items-center gap-3 border-b border-[#eeeaf3] bg-[#faf9fc]/95 px-3 py-3 backdrop-blur-xl sm:static sm:mb-4 sm:rounded-2xl sm:border sm:bg-white/85 sm:px-4">
    <Link href="/chats" aria-label="Back to messages" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#655b78] transition hover:bg-[#eee8fb]"><ArrowLeft size={21}/></Link>
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#e6ddf7] to-[#c6b5e8] font-semibold text-[#4e3a79]">{displayName.slice(0,1).toUpperCase()}</span>
    <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-semibold">{displayName}</h1><p className="truncate text-[11px] muted">{other?.username?'@'+other.username:'CONNECT friend'}</p></div>
    {other&&<Link href={`/u/${other.id}`} aria-label="View profile" className="grid h-9 w-9 place-items-center rounded-full text-[#74658f] hover:bg-[#f0edf8]"><MoreHorizontal size={21}/></Link>}
   </header>
   <RealtimeChat conversationId={params.id} currentUserId={user.id} initialMessages={messages||[]} mode="private"/>
  </div>
 </AppShell>;
}
