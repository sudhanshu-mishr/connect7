import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { StoryStrip, type StoryItem } from '@/components/story-strip';
import { InteractivePhotoCard } from '@/components/interactive-photo-card';

export const dynamic = 'force-dynamic';

export default async function Photos() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: posts }, { data: stories }, { data: comments }, { data: bookmarks }] = await Promise.all([
    db.from('photo_posts').select('id,user_id,image_url,caption,created_at').order('created_at', { ascending: false }).limit(40),
    db.from('stories').select('id,user_id,image_path,caption,created_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(40),
    db.from('photo_comments').select('id,post_id,user_id,parent_id,body,created_at').order('created_at', { ascending: true }).limit(500),
    db.from('photo_bookmarks').select('post_id').eq('user_id', user.id),
  ]);
  const ids = Array.from(new Set([...(posts || []).map((p: any) => p.user_id), ...(stories || []).map((s: any) => s.user_id), ...(comments || []).map((c: any) => c.user_id)]));
  const { data: people } = ids.length ? await db.from('profiles').select('id,full_name,username').in('id', ids) : { data: [] as any[] };
  const profiles = new Map<string, any>((people || []).map((p: any) => [p.id, p]));
  const { data: likes } = await db.from('photo_likes').select('post_id,user_id');
  const visibleStories: StoryItem[] = await Promise.all((stories || []).map(async (s: any) => {
    const { data } = await db.storage.from('connect-stories').createSignedUrl(s.image_path, 600);
    return { id: s.id, user_id: s.user_id, image_url: data?.signedUrl || '', caption: s.caption, created_at: s.created_at, name: profiles.get(s.user_id)?.full_name || 'CONNECT member' };
  }));

  const savedPostIds = new Set((bookmarks || []).map((b: any) => b.post_id));

  return <AppShell active="/photos">
    <div className="mx-auto max-w-[620px]">
      <div className="mb-5 -mt-3"><StoryStrip stories={visibleStories.filter(s => s.image_url)} currentUserId={user.id}/></div>
      <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-semibold">Your feed</h2><Link href="/discover" className="text-xs font-semibold text-[#6a579b]">Discover people</Link></div>
      {(posts || []).length ? <div className="space-y-5">{(posts || []).map((post: any) => { const person = profiles.get(post.user_id); const postLikes = (likes || []).filter((like: any) => like.post_id === post.id); return <InteractivePhotoCard key={post.id} post={post} name={person?.full_name || 'CONNECT member'} username={person?.username} liked={postLikes.some((like: any) => like.user_id === user.id)} likes={postLikes.length} comments={(comments || []).filter((comment: any) => comment.post_id === post.id).map((comment: any) => ({ ...comment, name: profiles.get(comment.user_id)?.full_name || 'CONNECT member', username: profiles.get(comment.user_id)?.username }))} bookmarked={savedPostIds.has(post.id)}/>; })}</div> : <div className="surface rounded-3xl px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#eee8ff] text-[#604c9b]"><Search size={23}/></div><h3 className="mt-5 text-lg font-semibold">Your feed starts here</h3><p className="mx-auto mt-2 max-w-sm text-sm muted">Share a photo from Create, then find people to connect with.</p><Link href="/create" className="btn btn-primary mt-6">Create a post</Link></div>}
    </div>
  </AppShell>;
}
