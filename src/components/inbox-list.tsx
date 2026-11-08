'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, MessageCircle, Users, ChevronRight, X } from 'lucide-react';

type ChatItem = {
  id: string;
  name: string;
  username: string;
  initial: string;
  preview: string;
  time: string;
  kind: 'private' | 'group';
  groupId: string | null;
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

  const visibleChats = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return chats.filter((chat) => {
      const matchesFilter = filter === 'all' || (filter === 'people' ? chat.kind === 'private' : chat.kind === 'group');
      const haystack = [chat.name, chat.username, chat.preview].join(' ').toLowerCase();
      return matchesFilter && (!normalized || haystack.includes(normalized));
    });
  }, [chats, filter, query]);

  return (
    <section>
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#e9e5ef] bg-white px-4 py-3 shadow-sm shadow-[#30234b]/[.025] focus-within:border-[#c9b9e8] focus-within:ring-2 focus-within:ring-[#eee8fb]">
        <Search size={18} className="shrink-0 text-[#9289a2]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people or messages"
          aria-label="Search conversations"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#332b42] outline-none placeholder:text-[#aaa3b4]"
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="rounded-full p-1 text-[#8c829c] hover:bg-[#f2eef8]"><X size={16} /></button>}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="flex rounded-full bg-[#f0edf5] p-1" role="tablist" aria-label="Filter conversations">
          {([
            ['all', 'All'],
            ['people', 'People'],
            ['groups', 'Groups'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${filter === value ? 'bg-white text-[#4e3a79] shadow-sm' : 'text-[#81778f] hover:text-[#4e3a79]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#92899f]">{visibleChats.length} {visibleChats.length === 1 ? 'chat' : 'chats'}</span>
      </div>

      <div className="space-y-0">
        {visibleChats.map((chat) => (
          <Link
            key={chat.id}
            href={chat.kind === 'group' ? (chat.groupId ? '/groups/' + chat.groupId : '/groups') : '/chats/' + chat.id}
            className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/85 active:scale-[.99]"
          >
            <span className={`grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full text-lg font-semibold ${chat.kind === 'group' ? 'bg-[#e9e5f3] text-[#655b78]' : 'bg-gradient-to-br from-[#e6ddf7] to-[#c6b5e8] text-[#4e3a79]'}`}>
              {chat.kind === 'group' ? <Users size={21} /> : chat.initial}
            </span>
            <span className="min-w-0 flex-1 border-b border-[#eeeaf3] pb-3 pt-1 group-last:border-0">
              <span className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-[#352d43]">{chat.name}</span>
                <time className="shrink-0 text-[10px] text-[#9b93a7]">{timeLabel(chat.time)}</time>
              </span>
              <span className="mt-1 block truncate text-xs text-[#898195]">{chat.preview}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-[#b3aabe] transition group-hover:translate-x-0.5" />
          </Link>
        ))}

        {!visibleChats.length && (
          <div className="rounded-3xl border border-dashed border-[#e4deed] bg-white/60 px-6 py-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#eee8fb] text-[#604c9b]"><MessageCircle size={22} /></div>
            <h3 className="mt-3 text-sm font-semibold text-[#413750]">{query ? 'No matching conversations' : 'Nothing here yet'}</h3>
            <p className="mt-1 text-xs text-[#92899f]">{query ? 'Try another name or message.' : 'Conversations in this category will appear here.'}</p>
            {query && <button type="button" onClick={() => setQuery('')} className="mt-3 text-xs font-semibold text-[#604c9b]">Clear search</button>}
          </div>
        )}
      </div>
    </section>
  );
}
