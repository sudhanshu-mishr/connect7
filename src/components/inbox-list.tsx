'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Search, MessageCircle, Users, ChevronRight, X, Pin, PinOff } from 'lucide-react';
import { toggleConversationPin } from '@/actions/chat';

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

function timeLabel(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function InboxList({ chats }: { chats: ChatItem[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'people' | 'groups'>('all');
  const [pinPending, startPinTransition] = useTransition();
  const [pinningId, setPinningId] = useState<string | null>(null);

  const visibleChats = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return chats.filter((chat) => {
      const matchesFilter = filter === 'all' || (filter === 'people' ? chat.kind === 'private' : chat.kind === 'group');
      const haystack = [chat.name, chat.username, chat.preview].join(' ').toLowerCase();
      return matchesFilter && (!normalized || haystack.includes(normalized));
    });
  }, [chats, filter, query]);

  function togglePin(chatId: string) {
    setPinningId(chatId);
    startPinTransition(() => {
      void toggleConversationPin(chatId)
        .catch((error) => window.alert(error instanceof Error ? error.message : 'Could not update pinned chat.'))
        .finally(() => setPinningId(null));
    });
  }

  return (
    <section>
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#e9e5ef] bg-white px-4 py-3 shadow-sm shadow-[#30234b]/[.025] focus-within:border-[#c9b9e8] focus-within:ring-2 focus-within:ring-[#eee8fb]">
        <Search size={18} className="shrink-0 text-[#9289a2]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people or messages" aria-label="Search conversations" className="min-w-0 flex-1 bg-transparent text-sm text-[#332b42] outline-none placeholder:text-[#aaa3b4]" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="rounded-full p-1 text-[#8c829c] hover:bg-[#f2eef8]"><X size={16} /></button>}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="flex rounded-full bg-[#f0edf5] p-1" role="tablist" aria-label="Filter conversations">
          {([['all', 'All'], ['people', 'People'], ['groups', 'Groups']] as const).map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${filter === value ? 'bg-white text-[#4e3a79] shadow-sm' : 'text-[#81778f] hover:text-[#4e3a79]'}`}>{label}</button>
          ))}
        </div>
        <span className="text-xs text-[#92899f]">{visibleChats.length} {visibleChats.length === 1 ? 'chat' : 'chats'}</span>
      </div>

      {visibleChats.some((chat) => chat.isPinned) && <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[.12em] text-[#9388a8]">Pinned</p>}
      <div className="space-y-0">
        {visibleChats.map((chat) => (
          <div key={chat.id} className="group flex items-center gap-2 rounded-2xl px-2 py-2 transition hover:bg-white/85">
            <Link href={chat.kind === 'group' ? (chat.groupId ? '/groups/' + chat.groupId : '/groups') : '/chats/' + chat.id} className="flex min-w-0 flex-1 items-center gap-3 py-1 active:scale-[.99]">
              <span className={`relative grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full text-lg font-semibold ${chat.kind === 'group' ? 'bg-[#e9e5f3] text-[#655b78]' : 'bg-gradient-to-br from-[#e6ddf7] to-[#c6b5e8] text-[#4e3a79]'}`}>
                {chat.kind === 'group' ? <Users size={21} /> : chat.initial}
                {chat.unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#7056b2]" />}
              </span>
              <span className="min-w-0 flex-1 border-b border-[#eeeaf3] pb-3 pt-1 group-last:border-0">
                <span className="flex items-center justify-between gap-3">
                  <span className={`truncate text-sm ${chat.unreadCount ? 'font-bold text-[#352d43]' : 'font-semibold text-[#51495e]'}`}>{chat.name}</span>
                  <time className="shrink-0 text-[10px] text-[#9b93a7]">{timeLabel(chat.time)}</time>
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <span className={`block min-w-0 flex-1 truncate text-xs ${chat.unreadCount ? 'font-semibold text-[#625778]' : 'text-[#898195]'}`}>{chat.preview}</span>
                  {chat.unreadCount > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#604b91] px-1.5 text-[10px] font-bold text-white">{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>}
                </span>
              </span>
            </Link>
            <button type="button" disabled={pinPending && pinningId === chat.id} onClick={() => togglePin(chat.id)} aria-label={chat.isPinned ? 'Unpin conversation' : 'Pin conversation'} title={chat.isPinned ? 'Unpin chat' : 'Pin chat'} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-[#eee8fb] disabled:opacity-50 ${chat.isPinned ? 'text-[#604b91]' : 'text-[#a69eb1] opacity-0 group-hover:opacity-100 focus:opacity-100'}`}>
              {chat.isPinned ? <Pin size={15} fill="currentColor" /> : <PinOff size={15} />}
            </button>
            <ChevronRight size={15} className="shrink-0 text-[#b3aabe]" />
          </div>
        ))}

        {!visibleChats.length && <div className="rounded-3xl border border-dashed border-[#e4deed] bg-white/60 px-6 py-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#eee8fb] text-[#604c9b]"><MessageCircle size={22} /></div>
          <h3 className="mt-3 text-sm font-semibold text-[#413750]">{query ? 'No matching conversations' : 'Nothing here yet'}</h3>
          <p className="mt-1 text-xs text-[#92899f]">{query ? 'Try another name or message.' : 'Conversations in this category will appear here.'}</p>
          {query && <button type="button" onClick={() => setQuery('')} className="mt-3 text-xs font-semibold text-[#604c9b]">Clear search</button>}
        </div>}
      </div>
    </section>
  );
}
