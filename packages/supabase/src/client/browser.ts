import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type TypedSupabaseClient = SupabaseClient<Database>;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function createSupabaseClient(config: SupabaseConfig): TypedSupabaseClient {
  const { url, anonKey } = config;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase URL and anon key are required. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function createBrowserSupabaseClient(): TypedSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  return createSupabaseClient({
    url: url ?? '',
    anonKey: anonKey ?? '',
  });
}
