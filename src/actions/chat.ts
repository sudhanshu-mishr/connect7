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
  const { data: conversationId, error } = await db.rpc('create_private_conversation', { other_user: otherUserId });
  if (error) throw new Error(error.message);
  if (!conversationId) throw new Error('Could not open this conversation.');
  revalidatePath('/chats');
  redirect(`/chats/${conversationId}`);
}

export async function sendPrivateMessage(conversationId: string, content: string) {
  const { db, user } = await getUserAndClient();
  const body = content.trim();
  if (!body || body.length > 2000) throw new Error('Message must be between 1 and 2000 characters.');
  const { data: membership, error: membershipError } = await db.from('conversation_members').select('conversation_id').eq('conversation_id', conversationId).eq('user_id', user.id).maybeSingle();
  if (membershipError) throw new Error(membershipError.message);
  if (!membership) throw new Error('You do not have access to this conversation.');
  const { error } = await db.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, content: body });
  if (error) throw new Error(error.message);
  revalidatePath('/chats');
  revalidatePath(`/chats/${conversationId}`);
}

const MESSAGE_REACTIONS = ['❤️', '😂', '😍', '🔥', '👏', '😮'] as const;

export async function sendMessageReply(conversationId: string, content: string, replyToId: string) {
  const { db, user } = await getUserAndClient();
  const body = content.trim();
  if (!body || body.length > 2000) throw new Error('Message must be between 1 and 2000 characters.');
  const { data: member } = await db.from('conversation_members').select('conversation_id').eq('conversation_id', conversationId).eq('user_id', user.id).maybeSingle();
  if (!member) throw new Error('You do not have access to this conversation.');
  const { data: parent } = await db.from('messages').select('id,conversation_id').eq('id', replyToId).eq('conversation_id', conversationId).maybeSingle();
  if (!parent) throw new Error('The message you are replying to is unavailable.');
  const { error } = await db.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, content: body, reply_to_id: replyToId });
  if (error) throw new Error(error.message);
  revalidatePath('/chats');
  revalidatePath('/chats/' + conversationId);
}

export async function toggleMessageReaction(messageId: string, emoji: string) {
  const { db, user } = await getUserAndClient();
  if (!(MESSAGE_REACTIONS as readonly string[]).includes(emoji)) throw new Error('Unsupported reaction.');
  const { data: message } = await db.from('messages').select('id,conversation_id').eq('id', messageId).maybeSingle();
  if (!message) throw new Error('Message unavailable.');
  const { data: member } = await db.from('conversation_members').select('conversation_id').eq('conversation_id', message.conversation_id).eq('user_id', user.id).maybeSingle();
  if (!member) throw new Error('You do not have access to this conversation.');
  const { data: existing, error: readError } = await db.from('message_reactions').select('id').eq('message_id', messageId).eq('user_id', user.id).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing) {
    const { error } = await db.from('message_reactions').delete().eq('id', existing.id);
    if (error) throw new Error(error.message);
    return false;
  }
  const { error } = await db.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
  if (error) throw new Error(error.message);
  return true;
}

export async function markConversationRead(conversationId: string) {
  const { db, user } = await getUserAndClient();
  const { error } = await db.from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/chats');
}

export async function toggleConversationPin(conversationId: string) {
  const { db, user } = await getUserAndClient();
  const { data: member, error: readError } = await db.from('conversation_members')
    .select('is_pinned').eq('conversation_id', conversationId).eq('user_id', user.id).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!member) throw new Error('Conversation unavailable.');
  const { error } = await db.from('conversation_members')
    .update({ is_pinned: !member.is_pinned })
    .eq('conversation_id', conversationId).eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/chats');
  return !member.is_pinned;
}
