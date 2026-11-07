import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Camera, Heart, Sparkles, Clock3 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { createPhoto, toggleLike } from '@/actions/social';
import { createNote, createStory } from '@/actions/social-suite';

export const dynamic = 'force-dynamic';

export default async function Photos() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: posts } = await db.from('photo_posts')
    .select('id,user_id,image_url,caption,created_at')
    .order('created_at', { ascending: false }).limit(40);

  const [{ data: stories }, { data: notes }] = await Promise.all([
    db.from('stories').select('id,user_id,image_path,caption,created_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(40),
    db.from('notes').select('id,user_id,content,created_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(40),
  ]);
  const ids = Array.from(new Set([...(posts || []).map((post: any) => post.user_id), ...(stories || []).map((story: any) => story.user_id), ...(notes || []).map((note: any) => note.user_id)]));
  const { data: people } = ids.length
    ? await db.from('profiles').select('id,full_name,username').in('id', ids)
    : { data: [] as any[] };
  const names = new Map<string, any>((people || []).map((person: any) => [person.id, person]));
  const { data: likes } = await db.from('photo_likes').select('post_id,user_id');
  const visibleStories = await Promise.all((stories || []).map(async (story: any) => {
    const { data } = await db.storage.from('connect-stories').createSignedUrl(story.image_path, 600);
    return { ...story, image_url: data?.signedUrl || '' };
  }));

  return (
    <AppShell active="/photos">
      <section className="feed-hero relative isolate overflow-hidden rounded-[2rem] p-7 text-white shadow-[0_24px_80px_rgba(48,31,86,.18)] sm:p-10">
        <div className="feed-orb feed-orb-one" /><div className="feed-orb feed-orb-two" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-[.16em] text-white/80"><Sparkles size={13}/> THE MOMENT WALL</span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">Life looks better<br/><span className="text-[#d9caff]">when it’s shared.</span></h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/70 sm:text-base">A quieter corner of CONNECT for the moments worth keeping. No reels. No noise. Just photos and people.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3"><a href="#share-moment" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#30234f] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"><Camera size={17}/> Share a moment</a><Link href="/stories" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20"><Clock3 size={16}/> View stories</Link><span className="text-xs text-white/55">{(posts || []).length} moments shared</span></div>
        </div>
      </section>

      <section id="share-moment" className="surface feed-panel mt-7 scroll-mt-24 rounded-[1.7rem] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eee8ff] text-[#604c9b]"><Camera size={20}/></div><div><h2 className="font-semibold">Add to the moment wall</h2><p className="text-xs muted">One photo can say a lot.</p></div></div>
        <form action={createPhoto} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]">
          <input type="file" name="photo" accept="image/*" required className="field min-w-0 text-sm"/>
          <input name="caption" className="field" placeholder="Write a little caption…" maxLength={240}/>
          <button className="btn btn-primary rounded-xl px-6">Share photo</button>
        </form>
        <p className="mt-3 text-[11px] muted">Photo-only feed · JPG, PNG or WEBP · Up to 8 MB</p>
      </section>

      <div className="mb-5 mt-10 flex items-end justify-between gap-3"><div><span className="pill">FROM YOUR COMMUNITY</span><h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Recent moments</h2></div><span className="text-xs muted">Latest first</span></div>

      {(posts || []).length > 0 ? (
        <div className="photo-grid">
          {(posts || []).map((post: any, index: number) => {
            const person = names.get(post.user_id);
            const postLikes = (likes || []).filter((like: any) => like.post_id === post.id);
            const liked = postLikes.some((like: any) => like.user_id === user.id);
            const displayName = person?.full_name || 'CONNECT member';
            return (
              <article key={post.id} className="photo-card group">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#eeeaf5]">
                  <Image src={post.image_url} alt={post.caption || 'Community photo'} fill sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw" className="object-cover transition duration-700 ease-out group-hover:scale-[1.045]" priority={index < 2}/>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 opacity-70"/>
                  <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[10px] font-medium tracking-wide text-white backdrop-blur-md">{new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                  <div className="absolute inset-x-4 bottom-4 text-white"><p className="text-sm font-semibold drop-shadow">{displayName}</p>{person?.username && <p className="text-xs text-white/70">@{person.username}</p>}{post.caption && <p className="mt-2 line-clamp-3 text-sm leading-5 text-white/90">{post.caption}</p>}</div>
                </div>
                <div className="flex items-center justify-between px-4 py-3"><span className="text-xs muted">A moment shared with CONNECT</span><form action={async () => { 'use server'; await toggleLike(post.id); }}><button aria-label={liked ? 'Unlike photo' : 'Like photo'} className={`like-button ${liked ? 'like-button-active' : ''}`}><Heart size={16} fill={liked ? 'currentColor' : 'none'}/><span>{postLikes.length}</span></button></form></div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="surface rounded-[1.7rem] px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eee8ff] text-[#604c9b]"><Camera size={24}/></div><h3 className="mt-5 text-lg font-semibold">Your moment wall is waiting</h3><p className="mx-auto mt-2 max-w-sm text-sm muted">Be the first to share a photo. The best connections start with little glimpses of real life.</p><a href="#share-moment" className="btn btn-primary mt-6">Share the first moment</a></div>
      )}
    </AppShell>
  );
}
