'use client';

import { useState, useTransition } from 'react';
import { MessageCircle, X, Send, Check } from 'lucide-react';
import { createMessageRequest } from '@/actions/message-requests';

export function MessageRequestButton({ targetId }: { targetId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError('');
    startTransition(async () => {
      try {
        await createMessageRequest(targetId, message);
        setSent(true);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not send your request.');
      }
    });
  }

  if (sent) return <span className="inline-flex items-center gap-2 rounded-full bg-[#f0edf8] px-4 py-2 text-xs font-semibold text-[#625778]"><Check size={14}/>Request sent</span>;

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[#594681] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#7056b2]"><MessageCircle size={14}/>Message</button>
    {open && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#211a30]/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="message-request-title" className="w-full max-w-md rounded-t-[28px] border border-[#eeeaf3] bg-white p-5 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8b78e6]">Start a conversation</p><h2 id="message-request-title" className="mt-1 text-lg font-bold text-[#302443]">Send a message request</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-[#81778f] hover:bg-[#f3f0f8]"><X size={18}/></button></div>
        <p className="mt-3 text-xs leading-5 text-[#898196]">You aren&apos;t connected yet. Send a short introduction; they can accept or decline it. Your message will only enter their chat if they accept.</p>
        <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0,500))} maxLength={500} rows={4} autoFocus placeholder="Hi! I noticed we share an interest in…" className="mt-4 w-full resize-none rounded-2xl border border-[#e8e2ef] bg-[#fcfbfe] p-3 text-sm text-[#352d43] outline-none transition focus:border-[#b9a9dc] focus:ring-2 focus:ring-[#eee8fb]"/>
        <div className="mt-1 flex justify-between text-[10px] text-[#a29aaa]"><span>{error || 'Keep it friendly and respectful.'}</span><span>{message.length}/500</span></div>
        <button type="button" disabled={pending || !message.trim()} onClick={submit} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#594681] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#7056b2] disabled:cursor-not-allowed disabled:opacity-50">{pending ? 'Sending…' : 'Send request'} <Send size={14}/></button>
      </section>
    </div>}
  </>;
}
