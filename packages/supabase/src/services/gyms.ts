import { generateGymCode, normalizeGymCode } from '@smart-gym/shared';
import type { TypedSupabaseClient } from '../client/browser';
import type { Tables, TablesInsert, TablesUpdate } from '../types/database';
import { assertData } from '../lib/errors';

export async function getGymById(
  client: TypedSupabaseClient,
  gymId: string,
): Promise<Tables<'gyms'> | null> {
  const { data, error } = await client.from('gyms').select('*').eq('id', gymId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getGymByCode(
  client: TypedSupabaseClient,
  code: string,
): Promise<Tables<'gyms'> | null> {
  const { data, error } = await client
    .from('gyms')
    .select('*')
    .eq('code', normalizeGymCode(code))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Works for anon callers during member signup (limited fields). */
export async function lookupGymByCode(
  client: TypedSupabaseClient,
  code: string,
): Promise<{ id: string; code: string; name: string; location: string } | null> {
  const { data, error } = await client.rpc('lookup_gym_by_code', {
    p_code: normalizeGymCode(code),
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return row ?? null;
}

export async function createGym(
  client: TypedSupabaseClient,
  input: Omit<TablesInsert<'gyms'>, 'code'> & { code?: string },
): Promise<Tables<'gyms'>> {
  const code = input.code ? normalizeGymCode(input.code) : generateGymCode();
  const { data, error } = await client
    .from('gyms')
    .insert({ ...input, code })
    .select('*')
    .single();

  return assertData(data, error, 'Failed to create gym');
}

export async function updateGym(
  client: TypedSupabaseClient,
  gymId: string,
  patch: TablesUpdate<'gyms'>,
): Promise<Tables<'gyms'>> {
  const { data, error } = await client
    .from('gyms')
    .update(patch)
    .eq('id', gymId)
    .select('*')
    .single();

  return assertData(data, error, 'Gym not found');
}

export async function listGymsByOwner(
  client: TypedSupabaseClient,
  ownerId: string,
): Promise<Tables<'gyms'>[]> {
  const { data, error } = await client.from('gyms').select('*').eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
  return data ?? [];
}
