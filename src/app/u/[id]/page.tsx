import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Grid3X3, MessageCircle, MapPin, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { startPrivateChat } from '@/actions/chat';
import { MessageRequestButton } from '@/components/message-request-button';

export const dynamic = 'force-dynamic';

export default async function PublicProfile({ params }: { params: { id: string } }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: p, error } = await db.from('profiles')
    .select('id,full_name,username,bio,city,interests,assessment_completed,is_discoverable')
    .eq('id', params.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!p) notFound();

  const isSelf = p.id === user.id;
  const [postsResult, friendsResult, connectionResult, scoreResult, requestResult] = await Promise.all([
    db.from('photo_posts').select('id,image_url,caption,created_at').eq('user_id', p.id).order('created_at', { ascending: false }).limit(60),
    db.from('connections').select('id', { count: 'exact', head: true }).or(`user_a.eq.${p.id},user_b.eq.${p.id}`),
    isSelf ? Promise.resolve({ data: null }) : db.from('connections').select('id')
      .or(`and(user_a.eq.${user.id},user_b.eq.${p.id}),and(user_a.eq.${p.id},user_b.eq.${user.id})`).maybeSingle(),
    isSelf ? Promise.resolve({ data: null, error: null }) : db.rpc('get_connect_compatibility_score', { candidate_id: p.id }),
    isSelf ? Promise.resolve({ data: null }) : db.from('message_requests').select('id,status,conversation_id,from_user').or(`and(from_user.eq.${user.id},to_user.eq.${p.id}),and(from_user.eq.${p.id},to_user.eq.${user.id})`).in('status', ['pending','accepted']).maybeSingle()
  ]);
  if (postsResult.error) throw new Error(postsResult.error.message);
  const posts = postsResult.data || [];
  const isFriend = !!connectionResult.data;
  const compatibility = !scoreResult.error && typeof scoreResult.data === 'number' && scoreResult.data >= 50 ? scoreResult.data : null;
  const initials = (p.full_name || 'C').split(' ').filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();
  const friendCount = friendsResult.count || 0;

  return <AppShell>
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between px-4 sm:px-0">
        <Link href={isSelf ? '/photos' : '/discover'} className="text-sm font-semibold text-[#7561bd]">← Back</Link>
        <span className="text-xs font-medium text-[#92899f]">CONNECT profile</span>
      </div>
      <section className="overflow-hidden bg-white sm:rounded-3xl sm:border sm:border-[#eeeaf3] sm:shadow-[0_12px_40px_rgba(35,24,74,.05)]">
        <div className="h-28 bg-[radial-gradient(circle_at_80%_20%,#a995d7,transparent_35%),linear-gradient(120deg,#29233d,#514275_55%,#8873bc)] sm:h-36"/>
        <div className="px-4 pb-5 sm:px-7">
          <div className="-mt-12 flex items-end justify-between gap-3 sm:-mt-14">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-[#eee9ff] to-[#cfc3f6] text-3xl font-bold text-[#51417e] shadow-md sm:h-28 sm:w-28">{initials}</div>
            <div className="mb-1 flex flex-wrap justify-end gap-2">
              {isSelf ? <Link href="/profile" className="rounded-full border border-[#ded7e9] px-4 py-2 text-xs font-semibold text-[#51417e] hover:bg-[#f7f4fb]">Edit profile</Link> : isFriend ? <form action={async () => { 'use server'; await startPrivateChat(p.id); }}><button className="inline-flex items-center gap-2 rounded-full bg-[#594681] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7056b2]"><MessageCircle size={14}/>Message</button></form> : p.is_discoverable ? requestResult.data?.status === 'accepted' && requestResult.data.conversation_id ? <Link href={'/chats/' + requestResult.data.conversation_id} className="inline-flex items-center gap-2 rounded-full bg-[#594681] px-4 py-2 text-xs font-semibold text-white"><MessageCircle size={14}/>Open chat</Link> : requestResult.data?.status === 'pending' && requestResult.data.from_user === user.id ? <span className="rounded-full bg-[#f0edf8] px-4 py-2 text-xs font-semibold text-[#625778]">Request sent</span> : requestResult.data?.status === 'pending' ? <Link href="/message-requests" className="rounded-full bg-[#f0edf8] px-4 py-2 text-xs font-semibold text-[#625778]">Review request</Link> : <MessageRequestButton targetId={p.id}/> : <span className="rounded-full bg-[#f0edf8] px-4 py-2 text-xs font-semibold text-[#625778]">Not accepting requests</span>}
            </div>
          </div>
          <div className="mt-4">
            <h1 className="text-xl font-bold tracking-tight text-[#302a3d]">{p.full_name}</h1>
            <p className="mt-0.5 text-xs text-[#91899d]">@{p.username}</p>
            <div className="mt-4 flex max-w-sm items-center justify-between gap-5 text-center">
              <div><p className="text-base font-bold text-[#302a3d]">{posts.length}</p><p className="text-[11px] text-[#82798e]">posts</p></div>
              <div><p className="text-base font-bold text-[#302a3d]">{friendCount}</p><p className="text-[11px] text-[#82798e]">connections</p></div>
              <div><p className="text-base font-bold text-[#302a3d]">{(p.interests || []).length}</p><p className="text-[11px] text-[#82798e]">interests</p></div>
            </div>
            {p.bio&&<p className="mt-4 whitespace-pre-wrap text-[13px] leading-5 text-[#494254]">{p.bio}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#81778f]">
              {p.city&&<span className="inline-flex items-center gap-1"><MapPin size={12}/>{p.city}</span>}
              {p.assessment_completed&&<span className="inline-flex items-center gap-1"><Sparkles size={12}/>Assessment complete</span>}
              {compatibility!==null&&<span className="rounded-full bg-[#eee9ff] px-2.5 py-1 font-semibold text-[#6552a2]">{compatibility}% compatible</span>}
            </div>
            {!!(p.interests||[]).length&&<div className="mt-3 flex flex-wrap gap-1.5">{p.interests.map((interest:string)=><span key={interest} className="rounded-full bg-[#f4f1f8] px-3 py-1 text-[10px] font-medium text-[#655b78]">{interest}</span>)}</div>}
          </div>
        </div>
        <div className="border-t border-[#eeeaf3]">
          <div className="flex items-center justify-center gap-2 py-3 text-[11px] font-bold uppercase tracking-[.16em] text-[#594681]"><Grid3X3 size={15}/>Posts</div>
          {posts.length ? <div className="grid grid-cols-3 gap-[2px] sm:gap-1">{posts.map((post:any)=><div key={post.id} className="relative aspect-square overflow-hidden bg-[#f2eff7]"><Image src={post.image_url} alt={post.caption||'Photo post'} fill sizes="(max-width:640px) 33vw,200px" className="object-cover transition duration-300 hover:scale-105"/>{post.caption&&<div className="absolute inset-x-0 bottom-0 line-clamp-1 bg-gradient-to-t from-black/65 to-transparent px-2 pb-2 pt-5 text-[9px] text-white">{post.caption}</div>}</div>)}</div> : <div className="px-6 py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#e8e2ef] text-[#786a91]"><Grid3X3 size={20}/></div><h2 className="mt-3 text-sm font-semibold text-[#40384f]">No posts yet</h2><p className="mt-1 text-xs text-[#91899d]">{isSelf?'Share a photo to start your grid.':'Their photos will appear here.'}</p>{isSelf&&<Link href="/stories" className="mt-4 inline-flex rounded-full bg-[#594681] px-4 py-2 text-xs font-semibold text-white">Create a post</Link>}</div>}
        </div>
      </section>
    </div>
  </AppShell>;
}
