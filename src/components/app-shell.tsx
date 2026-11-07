'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Compass, HeartHandshake, Home, Layers3, LogOut, MessageCircle, PlusSquare, Sparkles, Users, UserCheck, UserRound } from 'lucide-react';
import { signOut } from '@/actions/auth';

const primary = [
  { href: '/photos', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/create', label: 'Create', icon: PlusSquare },
  { href: '/chats', label: 'Chats', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: UserRound },
] as const;

const secondary = [
  { href: '/notifications', label: 'Activity', icon: Bell },
  { href: '/requests', label: 'Requests', icon: HeartHandshake },
  { href: '/friends', label: 'Friends', icon: UserCheck },
  { href: '/groups', label: 'Circles', icon: Users },
  { href: '/prompts', label: 'Daily prompts', icon: Sparkles },
  { href: '/blends', label: 'Blends', icon: Layers3 },
] as const;

export function AppShell({ children, active }: { children: React.ReactNode; active?: string }) {
  const pathname = usePathname();
  const current = active || pathname;
  const isActive = (href: string) => current === href || (href !== '/photos' && current.startsWith(href + '/'));
  return (
    <div className="min-h-screen bg-[#faf9fc] md:flex">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-[#eeeaf3] bg-white/90 px-4 py-5 backdrop-blur-xl md:flex">
        <Link href="/photos" className="mb-8 flex items-center gap-3 rounded-2xl px-3 py-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#302443] to-[#8068c4] text-sm font-bold text-white shadow-lg">C.</span>
          <span><b className="text-sm tracking-[.2em]">CONNECT</b><small className="block text-xs text-[#9992a7]">Find your people</small></span>
        </Link>
        <nav className="space-y-1">
          {primary.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 text-[15px] transition-all duration-200 hover:translate-x-0.5 ${isActive(href) ? 'bg-[#f0ebfb] font-semibold text-[#59468f]' : 'text-[#625d70] hover:bg-[#f8f6fb]'}`}>
              <Icon size={21} strokeWidth={isActive(href) ? 2.4 : 1.8}/>{label}
            </Link>
          ))}
        </nav>
        <div className="my-5 border-t border-[#eeeaf3] pt-4">
          <p className="px-4 pb-2 text-[10px] font-bold tracking-[.18em] text-[#aaa3b5]">YOUR CONNECT</p>
          <nav className="space-y-1">
            {secondary.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`flex items-center gap-4 rounded-xl px-4 py-2.5 text-sm transition-colors ${isActive(href) ? 'bg-[#f0ebfb] font-semibold text-[#59468f]' : 'text-[#777184] hover:bg-[#f8f6fb]'}`}>
                <Icon size={17} strokeWidth={1.8}/>{label}
              </Link>
            ))}
          </nav>
        </div>
        <form action={signOut} className="mt-auto border-t border-[#eeeaf3] pt-4">
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#817b91] transition hover:bg-[#f8f6fb] hover:text-[#392b58]"><LogOut size={18}/>Sign out</button>
        </form>
      </aside>

      <main className="min-h-screen w-full pb-24 md:ml-[248px] md:w-[calc(100%-248px)] md:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#eeeaf3]/80 bg-white/85 px-4 py-3 backdrop-blur-xl md:hidden">
          <Link href="/photos" className="flex items-center gap-2.5 font-bold tracking-[.18em]">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#302443] to-[#8068c4] text-[11px] text-white">C.</span>CONNECT
          </Link>
          <div className="flex items-center gap-1">
            <Link aria-label="Create" href="/create" className="grid h-10 w-10 place-items-center rounded-full text-[#655b78] hover:bg-[#f4f0fa]"><PlusSquare size={21}/></Link>
            <Link aria-label="Messages" href="/chats" className="grid h-10 w-10 place-items-center rounded-full text-[#655b78] hover:bg-[#f4f0fa]"><MessageCircle size={21}/></Link>
            <Link aria-label="Activity" href="/notifications" className="grid h-10 w-10 place-items-center rounded-full text-[#655b78] hover:bg-[#f4f0fa]"><Bell size={20}/></Link>
          </div>
        </header>
        <div className="mx-auto max-w-5xl px-0 py-3 sm:px-4 md:px-8 md:py-8">{children}</div>
        <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#ebe7f0] bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_30px_rgba(35,24,74,.07)] backdrop-blur-xl md:hidden">
          {primary.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] transition-all active:scale-95 ${isActive(href) ? 'font-bold text-[#604b9b]' : 'text-[#938da0]'}`}>
              {isActive(href) && <span className="absolute top-0 h-0.5 w-7 rounded-full bg-[#8068c4]"/>}
              <Icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.8}/><span>{label}</span>
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
