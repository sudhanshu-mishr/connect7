'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { MessageCircle, Search, Users } from 'lucide-react';

export type ChatInboxItem = {
  id: string; href: string; type: 'private' | 'community'; title: string; subtitle: string;
  preview: string; createdAt: string | null; unread: number; initials: string;
};

function formatTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function ChatInbox({ items }: { items: ChatInboxItem[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'private' | 'community'>('all');
  const filtered = useMemo(() => items.filter((item) => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const term = query.trim().toLowerCase();
    return matchesFilter && (!term || `${item.title} ${item.subtitle} ${item.preview}`.toLowerCase().includes(term));
  }), [items, query, filter]);
  const unreadTotal = items.reduce((sum, item) => sum + item.unread, 0);

  return <section>
    <div className="surface rounded-3xl p-4 md:p-5">
      <div className="relative"><Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#928ba3]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="field pl-11" placeholder="Search people or communities…" aria-label="Search conversations" /></div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(['all', 'private', 'community'] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === value ? 'bg-[#29233d] text-white' : 'bg-[#f1eef7] text-[#6f687f] hover:bg-[#e9e4f3]'}`}>{value === 'all' ? 'All chats' : value === 'private' ? 'People' : 'Communities'}</button>)}
        <span className="ml-auto text-xs muted">{unreadTotal ? `${unreadTotal} unread messages` : 'All caught up'}</span>
      </div>
    </div>
    <div className="mt-5 space-y-2">
      {filtered.map((item) => <Link key={item.id} href={item.href} className="group flex items-center gap-4 rounded-3xl border border-transparent bg-white/75 p-4 transition hover:-translate-y-0.5 hover:border-[#e6e0f1] hover:bg-white hover:shadow-[0_12px_35px_rgba(35,24,74,.07)] md:p-5">
        <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#eee9fb] to-[#ded5f4] text-sm font-bold text-[#5f4c91]">{item.type === 'community' ? <Users size={22} /> : item.initials || <MessageCircle size={21} />}{item.unread > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[#8066c6]" />}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold text-[#28243a]">{item.title}</h2>{item.unread > 0 && <span className="rounded-full bg-[#eee9fb] px-2 py-0.5 text-[11px] font-bold text-[#604b96]">{item.unread > 99 ? '99+' : item.unread} new</span>}</div><p className="mt-0.5 text-xs muted">{item.subtitle}</p><p className={`mt-2 truncate text-sm ${item.unread ? 'font-semibold text-[#39334c]' : 'text-[#827c90]'}`}>{item.preview}</p></div>
        <div className="flex shrink-0 flex-col items-end gap-2 self-stretch"><span className="text-xs muted">{formatTime(item.createdAt)}</span><span className="mt-auto text-sm font-semibold text-[#7561ad] transition group-hover:translate-x-0.5">Open →</span></div>
      </Link>)}
      {filtered.length === 0 && <div className="surface rounded-3xl px-6 py-12 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f0edf8] text-[#68549e]"><MessageCircle size={24} /></div><h2 className="mt-4 text-lg font-semibold">{items.length ? 'No conversations found' : 'Your inbox is waiting'}</h2><p className="mx-auto mt-2 max-w-sm text-sm muted">{items.length ? 'Try another name or switch the filter.' : 'Connect with someone or join a community to start a conversation.'}</p>{!items.length && <div className="mt-5 flex flex-wrap justify-center gap-2"><Link href="/discover" className="btn btn-primary">Discover people</Link><Link href="/groups" className="btn btn-secondary">Explore communities</Link></div>}</div>}
    </div>
  </section>;
}
