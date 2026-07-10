import type { TypedSupabaseClient } from '../client/browser';
import type { Tables, TablesUpdate } from '../types/database';
import { assertData } from '../lib/errors';

export async function getProfile(
  client: TypedSupabaseClient,
  userId: string,
): Promise<Tables<'profiles'> | null> {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getProfilesByIds(
  client: TypedSupabaseClient,
  userIds: string[],
): Promise<Tables<'profiles'>[]> {
  if (!userIds.length) return [];
  const { data, error } = await client.from('profiles').select('*').in('user_id', userIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateProfile(
  client: TypedSupabaseClient,
  userId: string,
  patch: TablesUpdate<'profiles'>,
): Promise<Tables<'profiles'>> {
  const { data, error } = await client
    .from('profiles')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single();

  return assertData(data, error, 'Profile not found');
}

/** Maps a profile row to diet target input used by @smart-gym/shared */
export function profileToDietInput(profile: Tables<'profiles'>): {
  dob?: string;
  gender?: string;
  bodyGoal?: 'lose' | 'maintain' | 'gain';
  dietMealWindows?: Record<string, { start: string; end: string }>;
  manualDietGoalsEnabled?: boolean;
  manualProteinGoalG?: number;
  manualCalorieGoal?: number;
  manualWaterGoalL?: number;
  weightKg?: number;
  heightCm?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
} {
  const prefs = (profile.diet_preferences ?? {}) as Record<string, unknown>;
  return {
    dob: profile.date_of_birth ?? undefined,
    gender: profile.gender || undefined,
    bodyGoal: (profile.body_goal as 'lose' | 'maintain' | 'gain') || 'maintain',
    dietMealWindows: prefs.dietMealWindows as Record<string, { start: string; end: string }> | undefined,
    manualDietGoalsEnabled: Boolean(prefs.manualDietGoalsEnabled),
    manualProteinGoalG: Number(prefs.manualProteinGoalG) || undefined,
    manualCalorieGoal: Number(prefs.manualCalorieGoal) || undefined,
    manualWaterGoalL: Number(prefs.manualWaterGoalL) || undefined,
    weightKg: Number(prefs.weightKg) || undefined,
    heightCm: Number(prefs.heightCm) || undefined,
    activityLevel: prefs.activityLevel as
      | 'sedentary'
      | 'light'
      | 'moderate'
      | 'active'
      | 'very_active'
      | undefined,
  };
}
