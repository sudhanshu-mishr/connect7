'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendPrivateMessage } from '@/actions/chat';
import { sendGroupMessage } from '@/actions/social';

type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type Props = {
  conversationId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  senderNames?: Record<string, string>;
  mode: 'private' | 'group';
  groupId?: string;
  placeholder?: string;
};

export function RealtimeChat({
  conversationId,
  currentUserId,
  initialMessages,
  senderNames = {},
  mode,
  groupId,
  placeholder = 'Write a message…'
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [content, setContent] = useState('');
  const [live, setLive] = useState(false);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const db = createClient();
    const channel = db
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          setMessages((current) =>
            current.some((message) => message.id === incoming.id)
              ? current
              : [...current, incoming]
          );
        }
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED');
      });

    return () => {
      setLive(false);
      void db.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = content.trim();
    if (!body || isPending) return;
    setContent('');
    startTransition(async () => {
      try {
        if (mode === 'group' && groupId) {
          await sendGroupMessage(groupId, body);
        } else if (mode === 'private') {
          await sendPrivateMessage(conversationId, body);
        } else {
          throw new Error('Chat is not configured correctly.');
        }
      } catch (error) {
        setContent(body);
        console.error('Message could not be sent:', error);
        window.alert(error instanceof Error ? error.message : 'Message could not be sent. Please try again.');
      }
    });
  }

  return (
    <section className="surface rounded-3xl p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{mode === 'group' ? 'Community chat' : 'Messages'}</h2>
          <p className="mt-1 text-sm muted">Messages appear here instantly for everyone in this chat.</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${live ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {live ? 'Live' : 'Connecting'}
        </span>
      </div>

      <div className="min-h-[50vh] max-h-[65vh] space-y-3 overflow-y-auto rounded-2xl bg-[#f7f5fb] p-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm muted">No messages yet. Say hello and start the conversation.</p>
        )}
        {messages.map((message) => {
          const mine = message.sender_id === currentUserId;
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? 'bg-[#29233d] text-white' : 'bg-white text-[#29233d]'}`}>
                {!mine && mode === 'group' && (
                  <small className="mb-1 block font-semibold opacity-65">
                    {senderNames[message.sender_id] || 'Community member'}
                  </small>
                )}
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p className={`mt-1 text-right text-[10px] ${mine ? 'text-white/60' : 'text-[#817b91]'}`}>
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submitMessage} className="mt-4 flex gap-2 border-t border-[#e9e5ef] pt-4">
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="field min-w-0 flex-1"
          placeholder={placeholder}
          maxLength={2000}
          autoComplete="off"
          required
        />
        <button className="btn btn-primary" disabled={isPending || !content.trim()}>
          {isPending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </section>
  );
}
