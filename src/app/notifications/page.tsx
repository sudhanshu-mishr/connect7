import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell, CheckCheck, Clock3, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';

export const dynamic = 'force-dynamic';

function sectionFor(value: string) {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  return 'Earlier';
}

function timeLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

export default async function Notifications() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await db.from('notifications')
    .select('id,title,body,created_at,read')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);

  const items = data || [];
  const unread = items.filter(item => !item.read).length;
  const sections = ['Today', 'Yesterday', 'This week', 'Earlier']
    .map(label => ({ label, items: items.filter(item => sectionFor(item.created_at) === label) }))
    .filter(section => section.items.length > 0);

  if (unread) {
    await db.from('notifications').update({ read: true })
      .eq('user_id', user.id).eq('read', false);
  }

  return <AppShell active="/notifications">
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 px-4 sm:px-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b78e6]">Your updates</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#302443]">Activity</h1>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f0ecf8] text-[#6652a5]"><Bell size={22}/></div>
        </div>
        <p className="mt-2 text-sm text-[#898196]">A little update on the people and connections around you.</p>
        {items.length > 0 && <div className="mt-4 flex items-center gap-2 text-[11px] text-[#8c8499]"><CheckCheck size={14} className="text-[#7b68b2]"/>{unread ? `${unread} new ${unread === 1 ? 'update' : 'updates'} · now marked as seen` : 'You’re all caught up'}</div>}
      </header>

      {!items.length ? <div className="mx-3 rounded-3xl border border-[#eeeaf3] bg-white px-6 py-14 text-center shadow-[0_8px_30px_rgba(35,24,74,.035)] sm:mx-0">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#f0ecf8] text-[#6a5798]"><Sparkles size={25}/></div>
        <h2 className="mt-4 text-base font-bold text-[#302443]">You’re all caught up</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#898196]">When someone connects with you or there’s news from your community, you’ll find it here.</p>
        <Link href="/discover" className="mt-5 inline-flex rounded-full bg-[#594681] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#7056b2]">Discover people</Link>
      </div> : <div className="space-y-6 px-3 sm:px-0">
        {sections.map(section => <section key={section.label}>
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[.15em] text-[#9a91a7]">{section.label}</h2>
          <div className="overflow-hidden rounded-2xl border border-[#eeeaf3] bg-white shadow-[0_5px_24px_rgba(35,24,74,.035)]">
            {section.items.map((item, index) => <article key={item.id} className={`relative flex gap-3.5 px-4 py-4 transition hover:bg-[#fcfbfe] sm:px-5 ${index ? 'border-t border-[#f0edf4]' : ''} ${!item.read ? 'bg-[#f8f5ff]/70' : ''}`}>
              <div className="relative mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#eee8fb] to-[#d9ccef] text-[#6652a5]"><Bell size={17}/>{!item.read&&<span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#8068c4]"/>}</div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-semibold leading-5 text-[#393247]">{item.title}</h3>
                {item.body&&<p className="mt-1 text-xs leading-[1.6] text-[#81798e]">{item.body}</p>}
                <p className="mt-2 flex items-center gap-1 text-[10px] text-[#aaa3b2]"><Clock3 size={11}/>{timeLabel(item.created_at)}</p>
              </div>
              {!item.read&&<span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#8068c4]"/>}
            </article>)}
          </div>
        </section>)}
      </div>}
    </div>
  </AppShell>;
}
