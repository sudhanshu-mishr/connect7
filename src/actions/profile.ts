'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function saveProfile(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const full_name = String(formData.get('full_name') || '').trim();
  const username = String(formData.get('username') || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const bio = String(formData.get('bio') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const interests = Array.from(new Set(String(formData.get('interests') || '').split(',').map(x => x.trim()).filter(Boolean))).slice(0, 12);
  const returnTo = String(formData.get('return_to') || '');
  const destination = returnTo === '/profile' ? '/profile' : '/onboarding';

  if (!full_name || full_name.length > 80 || username.length < 3 || username.length > 24) {
    redirect(destination + '?error=Enter+a+name+and+a+username+between+3+and+24+characters');
  }

  const { error } = await db.from('profiles').upsert({
    id: user.id, full_name, username, bio, city, interests, updated_at: new Date().toISOString()
  });

  if (error) redirect(destination + '?error=' + encodeURIComponent(error.message));

  revalidatePath('/');
  revalidatePath('/profile');
  revalidatePath('/discover');
  revalidatePath(`/u/${user.id}`);
  redirect(returnTo === '/profile' ? '/profile?saved=1' : '/assessment');
}

export async function uploadProfilePhoto(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) {
    redirect('/profile?error=Choose+a+profile+photo+first');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    redirect('/profile?error=Use+a+JPG,+PNG+or+WEBP+image+under+5+MB');
  }

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${user.id}/avatar-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await db.storage.from('connect-avatars').upload(path, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: '3600'
  });
  if (uploadError) redirect('/profile?error=' + encodeURIComponent(uploadError.message));

  const { data } = db.storage.from('connect-avatars').getPublicUrl(path);
  const { error: profileError } = await db.from('profiles')
    .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (profileError) {
    await db.storage.from('connect-avatars').remove([path]);
    redirect('/profile?error=' + encodeURIComponent(profileError.message));
  }

  revalidatePath('/profile');
  revalidatePath(`/u/${user.id}`);
  revalidatePath('/photos');
  revalidatePath('/discover');
  redirect('/profile?saved=photo');
}
