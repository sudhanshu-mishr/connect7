import { redirect } from 'next/navigation';
import { Camera } from 'lucide-react';
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

  const [{ data: posts }, { data: stories }] = await Promise.all([
    db.from('photo_posts').select('id,user_id,image_url,caption,created_at').order('created_at', { ascending: false }).limit(40),
    db.from('stories').select('id,user_id,image_path,caption,created_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(40),
  ]);
  const ids = Array.from(new Set([...(posts || []).map((p: any) => p.user_id), ...(stories || []).map((s: any) => s.user_id)]));
  const { data: people } = ids.length ? await db.from('profiles').select('id,full_name,username').in('id', ids) : { data: [] as any[] };
  const profiles = new Map<string, any>((people || []).map((p: any) => [p.id, p]));
  const { data: likes } = await db.from('photo_likes').select('post_id,user_id');
  const visibleStories: StoryItem[] = await Promise.all((stories || []).map(async (s: any) => {
    const { data } = await db.storage.from('connect-stories').createSignedUrl(s.image_path, 600);
    return { id: s.id, user_id: s.user_id, image_url: data?.signedUrl || '', caption: s.caption, created_at: s.created_at, name: profiles.get(s.user_id)?.full_name || 'CONNECT member' };
  }));

  return <AppShell active="/photos">
    <StoryStrip stories={visibleStories.filter(s => s.image_url)} currentUserId={user.id}/>
    <section id="share-photo" className="surface mt-6 scroll-mt-24 rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eee8ff] text-[#604c9b]"><Camera size={20}/></div><div><h2 className="font-semibold">Share a photo</h2><p className="text-xs muted">A little glimpse of your day.</p></div></div>
      <form action={createPhoto} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]"><input type="file" name="photo" accept="image/*" required className="field min-w-0 text-sm"/><input name="caption" className="field" placeholder="Write a caption…" maxLength={240}/><button className="btn btn-primary rounded-xl px-6">Share photo</button></form>
    </section>
    <div className="mb-5 mt-9 flex items-end justify-between gap-3"><div><span className="pill">YOUR COMMUNITY</span><h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Photo feed</h1></div><span className="text-xs muted">Latest first</span></div>
    {(posts || []).length ? <div className="photo-grid">{(posts || []).map((post: any) => { const person = profiles.get(post.user_id); const postLikes = (likes || []).filter((like: any) => like.post_id === post.id); return <InteractivePhotoCard key={post.id} post={post} name={person?.full_name || 'CONNECT member'} username={person?.username} liked={postLikes.some((like: any) => like.user_id === user.id)} likes={postLikes.length}/>; })}</div> : <div className="surface rounded-3xl px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eee8ff] text-[#604c9b]"><Camera size={24}/></div><h3 className="mt-5 text-lg font-semibold">Nothing here yet</h3><p className="mx-auto mt-2 max-w-sm text-sm muted">Share the first photo with your community.</p><a href="#share-photo" className="btn btn-primary mt-6">Share a photo</a></div>}
  </AppShell>;
}
