import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables are missing. Copy .env.example to .env.local.');
  const cookieStore = cookies();
  return createServerClient(url, key, { cookies: { getAll() { return cookieStore.getAll(); }, setAll(values: { name: string; value: string; options?: any }[]) { try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } } });
}
