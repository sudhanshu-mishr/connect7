import { redirect } from 'next/navigation';
import { Camera, Sparkles, Clock3 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { createPhoto } from '@/actions/social';
import { StoryStrip, type StoryItem } from '@/components/story-strip';
import { InteractivePhotoCard } from '@/components/interactive-photo-card';

export const dynamic = 'force-dynamic';

export default async function Photos() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: posts }, { data: stories }, { data: notes }] = await Promise.all([
    db.from('photo_posts').select('id,user_id,image_url,caption,created_at').order('created_at', { ascending: false }).limit(40),
    db.from('stories').select('id,user_id,image_path,caption,created_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(40),
    db.from('notes').select('id,user_id,content,created_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(30),
  ]);
  const ids = Array.from(new Set([...(posts || []).map((p: any) => p.user_id), ...(stories || []).map((s: any) => s.user_id), ...(notes || []).map((n: any) => n.user_id)]));
  const { data: people } = ids.length ? await db.from('profiles').select('id,full_name,username').in('id', ids) : { data: [] as any[] };
  const profiles = new Map<string, any>((people || []).map((p: any) => [p.id, p]));
  const { data: likes } = await db.from('photo_likes').select('post_id,user_id');
  const visibleStories: StoryItem[] = await Promise.all((stories || []).map(async (s: any) => {
    const { data } = await db.storage.from('connect-stories').createSignedUrl(s.image_path, 600);
    return { id: s.id, user_id: s.user_id, image_url: data?.signedUrl || '', caption: s.caption, created_at: s.created_at, name: profiles.get(s.user_id)?.full_name || 'CONNECT member' };
  }));
  return <AppShell active="/photos">
    <div className="space-y-5">
      <StoryStrip stories={visibleStories.filter(s => s.image_url)} currentUserId={user.id}/>
      {(notes || []).length > 0 && <section className="surface rounded-3xl p-4"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Notes</h2><p className="text-[11px] muted">Quick thoughts from your people</p></div><Link href="/stories" className="text-xs font-semibold text-[#7056b2]">Add note</Link></div><div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">{(notes || []).map((note: any) => <article key={note.id} className="w-[210px] shrink-0 rounded-2xl bg-[#f4f0fb] p-3"><p className="line-clamp-3 text-sm leading-5">“{note.content}”</p><p className="mt-3 truncate text-[11px] font-semibold text-[#6e5aa8]">{profiles.get(note.user_id)?.full_name || 'CONNECT member'}</p></article>)}</div></section>}
    </div>
    <section className="feed-hero relative isolate mt-6 overflow-hidden rounded-[2rem] p-7 text-white shadow-[0_24px_80px_rgba(48,31,86,.18)] sm:p-10">
      <div className="feed-orb feed-orb-one"/><div className="feed-orb feed-orb-two"/>
      <div className="relative z-10 max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-[.16em] text-white/80"><Sparkles size={13}/> THE MOMENT WALL</span><h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">Life looks better<br/><span className="text-[#d9caff]">when it’s shared.</span></h1><p className="mt-4 max-w-lg text-sm leading-6 text-white/70 sm:text-base">A quieter corner of CONNECT for moments worth keeping. No reels. No noise. Just photos and people.</p><div className="mt-7 flex flex-wrap items-center gap-3"><a href="#share-moment" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#30234f]"><Camera size={17}/> Share a moment</a><Link href="/stories" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white"><Clock3 size={16}/> Manage stories</Link><span className="text-xs text-white/55">{(posts || []).length} moments shared</span></div></div>
    </section>
    <section id="share-moment" className="surface mt-6 scroll-mt-24 rounded-[1.7rem] p-5 sm:p-6"><div className="mb-4 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eee8ff] text-[#604c9b]"><Camera size={20}/></div><div><h2 className="font-semibold">Add to the moment wall</h2><p className="text-xs muted">One photo can say a lot.</p></div></div><form action={createPhoto} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]"><input type="file" name="photo" accept="image/*" required className="field min-w-0 text-sm"/><input name="caption" className="field" placeholder="Write a little caption…" maxLength={240}/><button className="btn btn-primary rounded-xl px-6">Share photo</button></form><p className="mt-3 text-[11px] muted">Photo-only feed · JPG, PNG or WEBP · Up to 8 MB</p></section>
    <div className="mb-5 mt-10 flex items-end justify-between gap-3"><div><span className="pill">FROM YOUR COMMUNITY</span><h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Recent moments</h2></div><span className="text-xs muted">Latest first</span></div>
    {(posts || []).length ? <div className="photo-grid">{(posts || []).map((post: any) => { const person = profiles.get(post.user_id); const postLikes = (likes || []).filter((like: any) => like.post_id === post.id); return <InteractivePhotoCard key={post.id} post={post} name={person?.full_name || 'CONNECT member'} username={person?.username} liked={postLikes.some((like: any) => like.user_id === user.id)} likes={postLikes.length}/>; })}</div> : <div className="surface rounded-3xl px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eee8ff] text-[#604c9b]"><Camera size={24}/></div><h3 className="mt-5 text-lg font-semibold">Your moment wall is waiting</h3><p className="mx-auto mt-2 max-w-sm text-sm muted">Be the first to share a photo.</p><a href="#share-moment" className="btn btn-primary mt-6">Share the first moment</a></div>}
  </AppShell>;
}
