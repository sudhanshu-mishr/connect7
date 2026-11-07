'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function getUserAndClient() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  return { db, user };
}

export async function startPrivateChat(otherUserId: string) {
  const { db, user } = await getUserAndClient();
  if (!otherUserId || otherUserId === user.id) throw new Error('Invalid profile.');

  // The database RPC verifies that both people are already connected.
  const { data: conversationId, error } = await db.rpc('create_private_conversation', {
    other_user: otherUserId
  });
  if (error) throw new Error(error.message);
  if (!conversationId) throw new Error('Could not open this conversation.');

  revalidatePath('/chats');
  redirect(`/chats/${conversationId}`);
}

export async function sendPrivateMessage(conversationId: string, content: string) {
  const { db, user } = await getUserAndClient();
  const body = content.trim();
  if (!body || body.length > 2000) throw new Error('Message must be between 1 and 2000 characters.');

  const { data: membership, error: membershipError } = await db
    .from('conversation_members')
    .select('conversation_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) throw new Error(membershipError.message);
  if (!membership) throw new Error('You do not have access to this conversation.');

  const { error } = await db.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: body
  });
  if (error) throw new Error(error.message);

  revalidatePath('/chats');
  revalidatePath(`/chats/${conversationId}`);
}
