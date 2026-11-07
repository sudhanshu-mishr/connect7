'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendPrivateMessage } from '@/actions/chat';
import { sendGroupMessage } from '@/actions/social';
import { AlertCircle, Check, LoaderCircle, Send } from 'lucide-react';

type ChatMessage = { id: string; sender_id: string; content: string; created_at: string };
type Props = { conversationId: string; currentUserId: string; initialMessages: ChatMessage[]; senderNames?: Record<string, string>; mode: 'private' | 'group'; groupId?: string; placeholder?: string };
type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline';

function dayLabel(value: string) {
  const date = new Date(value), today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}

export function RealtimeChat({ conversationId, currentUserId, initialMessages, senderNames = {}, mode, groupId, placeholder = 'Write a message…' }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [content, setContent] = useState('');
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const db = createClient();
    let mounted = true;
    const channel = db.channel(`chat:${conversationId}`).on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      const incoming = payload.new as ChatMessage;
      if (!mounted) return;
      setMessages((current) => current.some((message) => message.id === incoming.id) ? current : [...current, incoming]);
    }).subscribe((status) => {
      if (!mounted) return;
      if (status === 'SUBSCRIBED') setConnection('live');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnection('offline');
      else if (status === 'CLOSED') setConnection('reconnecting');
      else setConnection('connecting');
    });
    return () => { mounted = false; void db.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = content.trim();
    if (!body || sending) return;
    setSending(true); setError(''); setContent('');
    try {
      if (mode === 'group' && groupId) await sendGroupMessage(groupId, body);
      else if (mode === 'private') await sendPrivateMessage(conversationId, body);
      else throw new Error('Chat is not configured correctly.');
      inputRef.current?.focus();
    } catch (caught) {
      setContent(body);
      setError(caught instanceof Error ? caught.message : 'Message could not be sent. Please try again.');
    } finally { setSending(false); }
  }

  const statusText = connection === 'live' ? 'Live updates on' : connection === 'offline' ? 'Live updates unavailable' : connection === 'reconnecting' ? 'Reconnecting…' : 'Connecting…';
  return <section className="surface overflow-hidden rounded-3xl">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeaf4] px-5 py-4 md:px-6"><div><h2 className="font-semibold">{mode === 'group' ? 'Community conversation' : 'Your conversation'}</h2><p className="mt-1 text-xs muted">A private space to talk and stay connected.</p></div><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${connection === 'live' ? 'bg-emerald-50 text-emerald-700' : connection === 'offline' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}><span className={`h-2 w-2 rounded-full ${connection === 'live' ? 'bg-emerald-500' : connection === 'offline' ? 'bg-rose-500' : 'bg-amber-500'}`} />{statusText}</span></div>
    <div aria-live="polite" aria-relevant="additions" className="max-h-[65vh] min-h-[48vh] space-y-4 overflow-y-auto bg-gradient-to-b from-[#faf9fc] to-[#f4f1f9] px-4 py-5 md:px-6">
      {messages.length === 0 && <div className="flex min-h-[40vh] flex-col items-center justify-center text-center"><div className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-[#7561ad] shadow-sm"><Send size={25} /></div><h3 className="mt-4 font-semibold">Start with a hello</h3><p className="mt-1 max-w-xs text-sm muted">Good conversations begin with a small message.</p></div>}
      {messages.map((message, index) => {
        const mine = message.sender_id === currentUserId;
        const showDay = index === 0 || new Date(messages[index - 1].created_at).toDateString() !== new Date(message.created_at).toDateString();
        return <div key={message.id}>{showDay && <div className="my-3 flex justify-center"><span className="rounded-full border border-[#e9e4f0] bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#8b8498]">{dayLabel(message.created_at)}</span></div>}<div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm md:max-w-[75%] ${mine ? 'rounded-br-md bg-[#29233d] text-white' : 'rounded-bl-md border border-[#eeeaf4] bg-white text-[#29233d]'}`}>{!mine && mode === 'group' && <small className="mb-1 block font-semibold text-[#7561ad]">{senderNames[message.sender_id] || 'Community member'}</small>}<p className="whitespace-pre-wrap break-words">{message.content}</p><p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-white/60' : 'text-[#928ba0]'}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{mine && <Check size={11} />}</p></div></div></div>;
      })}
      <div ref={bottomRef} />
    </div>
    <div className="border-t border-[#eeeaf4] bg-white/90 p-4 md:p-5">{error && <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</p>}{connection === 'offline' && <p className="mb-3 text-xs text-amber-700">You can still send messages. Refresh this page if live updates do not reconnect.</p>}<form onSubmit={submitMessage} className="flex items-end gap-2"><input ref={inputRef} value={content} onChange={(event) => setContent(event.target.value)} className="field min-w-0 flex-1" placeholder={placeholder} maxLength={2000} autoComplete="off" aria-label="Write a message" required /><button type="submit" className="btn btn-primary min-h-[46px] min-w-[48px] px-4" disabled={sending || !content.trim()} aria-label="Send message">{sending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}<span className="hidden sm:inline">{sending ? 'Sending…' : 'Send'}</span></button></form><p className="mt-2 text-right text-[11px] muted">{content.length}/2000</p></div>
  </section>;
}
