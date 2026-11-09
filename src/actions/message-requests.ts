'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function getCurrent() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('Please sign in.');
  return { db, user };
}

export async function createMessageRequest(targetId: string, message: string) {
  const { db, user } = await getCurrent();
  const body = message.trim();
  if (!targetId || targetId === user.id) throw new Error('Choose a valid person.');
  if (body.length < 1 || body.length > 500) throw new Error('Introduction must be between 1 and 500 characters.');

  const { data: profile, error: profileError } = await db.from('profiles')
    .select('id,is_discoverable').eq('id', targetId).maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile?.is_discoverable) throw new Error('This profile is not accepting new message requests.');

  const { data: connection, error: connectionError } = await db.from('connections')
    .select('id').or(`and(user_a.eq.${user.id},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${user.id})`).maybeSingle();
  if (connectionError) throw new Error(connectionError.message);
  if (connection) throw new Error('You are already connected. Open your existing chat instead.');

  const { error } = await db.from('message_requests').insert({
    from_user: user.id, to_user: targetId, message: body
  });
  if (error?.code === '23505') throw new Error('You already have a pending request with this person.');
  if (error) throw new Error(error.message);
  revalidatePath('/message-requests');
  revalidatePath(`/u/${targetId}`);
}

export async function acceptMessageRequest(requestId: string) {
  const { db } = await getCurrent();
  const { data: conversationId, error } = await db.rpc('accept_message_request', { p_request_id: requestId });
  if (error) throw new Error(error.message);
  revalidatePath('/message-requests');
  revalidatePath('/chats');
  if (!conversationId) throw new Error('The chat could not be created.');
  redirect(`/chats/${conversationId}`);
}

export async function declineMessageRequest(requestId: string) {
  const { db } = await getCurrent();
  const { error } = await db.rpc('decline_message_request', { p_request_id: requestId });
  if (error) throw new Error(error.message);
  revalidatePath('/message-requests');
}
