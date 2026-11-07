'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export async function signUp(formData: FormData) { const supabase = await createClient(); const email=String(formData.get('email')||'').trim(); const password=String(formData.get('password')||''); const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`}}); if(error) redirect('/register?error='+encodeURIComponent(error.message)); redirect('/login?message=Check your email to verify your account.'); }
export async function signIn(formData: FormData) { const supabase=await createClient(); const email=String(formData.get('email')||'').trim(); const password=String(formData.get('password')||''); const {error}=await supabase.auth.signInWithPassword({email,password}); if(error) redirect('/login?error='+encodeURIComponent(error.message)); redirect('/discover'); }
export async function signOut() { const supabase=await createClient(); await supabase.auth.signOut(); redirect('/'); }
