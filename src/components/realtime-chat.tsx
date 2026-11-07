'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { ArrowUp, Check, Wifi, WifiOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sendPrivateMessage } from '@/actions/chat';
import { sendGroupMessage } from '@/actions/social';

type ChatMessage={id:string;sender_id:string;content:string;created_at:string};
type PresenceEntry={user_id?:string;typing?:boolean};
type Props={conversationId:string;currentUserId:string;initialMessages:ChatMessage[];senderNames?:Record<string,string>;mode:'private'|'group';groupId?:string;placeholder?:string};

export function RealtimeChat({conversationId,currentUserId,initialMessages,senderNames={},mode,groupId,placeholder='Message…'}:Props){
 const [messages,setMessages]=useState<ChatMessage[]>(initialMessages);
 const [content,setContent]=useState('');
 const [live,setLive]=useState(false);
 const [otherOnline,setOtherOnline]=useState(false);
 const [otherTyping,setOtherTyping]=useState(false);
 const [isPending,startTransition]=useTransition();
 const bottomRef=useRef<HTMLDivElement>(null);
 const channelRef=useRef<any>(null);
 const typingTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{
  const db=createClient();
  const channel=db.channel('chat:'+conversationId,{config:{presence:{key:currentUserId}}});
  channelRef.current=channel;
  channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+conversationId},payload=>{
   const incoming=payload.new as ChatMessage;
   setMessages(current=>current.some(m=>m.id===incoming.id)?current:[...current,incoming]);
  }).on('presence',{event:'sync'},()=>{
   const entries=Object.values(channel.presenceState()).flat() as PresenceEntry[];
   const others=entries.filter(entry=>entry.user_id!==currentUserId);
   setOtherOnline(others.length>0);
   setOtherTyping(others.some(entry=>entry.typing===true));
  }).subscribe(status=>{
   const connected=status==='SUBSCRIBED';
   setLive(connected);
   if(connected)void channel.track({user_id:currentUserId,typing:false});
  });
  return()=>{
   if(typingTimer.current)clearTimeout(typingTimer.current);
   setLive(false);setOtherOnline(false);setOtherTyping(false);
   channelRef.current=null;
   void db.removeChannel(channel);
  };
 },[conversationId,currentUserId]);
 useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth',block:'end'})},[messages,otherTyping]);
 function handleTyping(value:string){
  setContent(value);
  const channel=channelRef.current;
  if(!channel||!live)return;
  void channel.track({user_id:currentUserId,typing:value.trim().length>0});
  if(typingTimer.current)clearTimeout(typingTimer.current);
  if(value.trim())typingTimer.current=setTimeout(()=>{void channel.track({user_id:currentUserId,typing:false})},1800);
 }
 function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();const body=content.trim();if(!body||isPending)return;setContent('');
  if(typingTimer.current)clearTimeout(typingTimer.current);
  if(channelRef.current)void channelRef.current.track({user_id:currentUserId,typing:false});
  startTransition(()=>{void(async()=>{try{if(mode==='group'&&groupId)await sendGroupMessage(groupId,body);else if(mode==='private')await sendPrivateMessage(conversationId,body);else throw new Error('Chat is not configured correctly.')}catch(error){setContent(body);console.error('Message could not be sent:',error);window.alert(error instanceof Error?error.message:'Message could not be sent. Please try again.')}})()});
 }
 let previousDay='';
 return <section className="flex h-[calc(100dvh-190px)] min-h-[440px] flex-col overflow-hidden rounded-none border-y border-[#eeeaf3] bg-white sm:h-[min(760px,calc(100dvh-230px))] sm:min-h-[520px] sm:rounded-[1.7rem] sm:border sm:shadow-[0_18px_55px_rgba(35,24,74,.07)]">
  <div className="flex items-center justify-between border-b border-[#eeeaf3] px-4 py-3"><div><p className="text-sm font-semibold">{mode==='group'?'Community conversation':'Messages'}</p><p className="mt-0.5 text-[10px] muted">{otherTyping?'Typing…':otherOnline?'Active in this chat':'Private conversation'}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${live?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{live?<Wifi size={12}/>:<WifiOff size={12}/ >}{live?'Connected':'Reconnecting'}</span></div>
  <div className="flex-1 space-y-2 overflow-y-auto bg-[linear-gradient(180deg,#fbfaff,#f7f5fa)] px-3 py-5 sm:px-5">
   {!messages.length&&<div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center"><div className="grid h-14 w-14 place-items-center rounded-full bg-[#eee8fb] text-[#604c9b]"><ArrowUp size={23}/></div><p className="mt-4 text-sm font-semibold">This is the beginning</p><p className="mt-1 max-w-[230px] text-xs leading-5 muted">Say hello. Good conversations start small.</p></div>}
   {messages.map((message,index)=>{
    const mine=message.sender_id===currentUserId;
    const day=new Date(message.created_at).toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'});
    const showDay=day!==previousDay;previousDay=day;
    const samePrevious=index>0&&messages[index-1].sender_id===message.sender_id&&new Date(messages[index-1].created_at).toDateString()===new Date(message.created_at).toDateString();
    return <div key={message.id} className="animate-[rise-in_.2s_ease-out]">
     {showDay&&<div className="my-5 text-center"><span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-medium text-[#9a93a7]">{day}</span></div>}
     <div className={`flex ${mine?'justify-end':'justify-start'} ${samePrevious?'mt-1':'mt-3'}`}>
      <div className={`max-w-[84%] sm:max-w-[72%] ${mine?'items-end':'items-start'}`}>
       {!mine&&mode==='group'&&!samePrevious&&<p className="mb-1 ml-2 text-[10px] font-semibold text-[#807493]">{senderNames[message.sender_id]||'Community member'}</p>}
       <div className={`rounded-[1.25rem] px-4 py-2.5 text-[14px] leading-[1.45] shadow-sm ${mine?'rounded-br-md bg-[#594681] text-white':'rounded-bl-md border border-[#eeeaf3] bg-white text-[#302a3d]'}`}><p className="whitespace-pre-wrap break-words">{message.content}</p></div>
       <div className={`mt-1 flex items-center gap-1 px-1 text-[9px] text-[#a19aaa] ${mine?'justify-end':''}`}><time>{new Date(message.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time>{mine&&<Check size={11}/>}</div>
      </div>
     </div>
    </div>
   })}
   {otherTyping&&<div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-[#eeeaf3] bg-white px-4 py-3 text-xs text-[#82768f]"><span className="mr-2 inline-flex gap-1 align-middle"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#907db3]"/><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#907db3] [animation-delay:120ms]"/><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#907db3] [animation-delay:240ms]"/></span>{mode==='group'?'Someone is typing':'Typing'}</div></div>}
   <div ref={bottomRef}/>
  </div>
  <form onSubmit={submit} className="flex items-center gap-2 border-t border-[#eeeaf3] bg-white px-3 py-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:px-4"><input value={content} onChange={e=>handleTyping(e.target.value)} className="min-w-0 flex-1 rounded-full border border-[#e9e5ef] bg-[#f8f7fb] px-4 py-3 text-sm outline-none transition focus:border-[#b6a5dc] focus:bg-white focus:ring-2 focus:ring-[#eee8fb]" placeholder={placeholder} maxLength={2000} autoComplete="off" required/><button type="submit" disabled={isPending||!content.trim()} aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#594681] text-white shadow-md transition hover:scale-105 hover:bg-[#7056b2] disabled:cursor-not-allowed disabled:opacity-40"><ArrowUp size={19}/></button></form>
 </section>;
}
