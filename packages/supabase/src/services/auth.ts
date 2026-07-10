import type { TypedSupabaseClient } from '../client/browser';

export async function getSession(client: TypedSupabaseClient) {
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export async function getCurrentUserId(client: TypedSupabaseClient): Promise<string | null> {
  const { data, error } = await client.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user?.id ?? null;
}

export async function signInWithEmail(
  client: TypedSupabaseClient,
  email: string,
  password: string,
) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export interface SignUpOptions {
  email: string;
  password: string;
  metadata?: Record<string, string>;
  emailRedirectTo?: string;
}

export async function signUpWithEmail(client: TypedSupabaseClient, options: SignUpOptions) {
  const { data, error } = await client.auth.signUp({
    email: options.email,
    password: options.password,
    options: {
      data: options.metadata,
      emailRedirectTo: options.emailRedirectTo,
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut(client: TypedSupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw new Error(error.message);
}
