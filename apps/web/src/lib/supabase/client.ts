import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@smart-gym/supabase';
import type { TypedSupabaseClient } from '@smart-gym/supabase';

export function createClient(): TypedSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy apps/web/.env.example to .env.local.',
    );
  }

  return createBrowserClient<Database>(url, anonKey);
}
