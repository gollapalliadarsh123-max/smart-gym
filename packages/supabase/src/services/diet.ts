import {
  applyLeagueDayPoints,
  buildDietTargetsFromProfile,
  cleanRatioFromFoods,
  computeCombinedFitnessScore,
  computeDietScoreV2,
  computeMealLogStreak,
  getDietConsistencyBonus,
  getLeagueSeasonId,
  type DietFood,
  type DietTotals,
  type ProfileDietInput,
} from '@smart-gym/shared';
import type { TypedSupabaseClient } from '../client/browser';
import { assertData } from '../lib/errors';
import type { Json, Tables, TablesInsert } from '../types/database';

export async function getDietLogForDate(
  client: TypedSupabaseClient,
  userId: string,
  logDate: string,
): Promise<Tables<'diet_logs'> | null> {
  const { data, error } = await client
    .from('diet_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listDietLogs(
  client: TypedSupabaseClient,
  userId: string,
  limit = 30,
): Promise<Tables<'diet_logs'>[]> {
  const { data, error } = await client
    .from('diet_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listDietLogDates(
  client: TypedSupabaseClient,
  userId: string,
  limit = 40,
): Promise<string[]> {
  const { data, error } = await client
    .from('diet_logs')
    .select('log_date')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.log_date);
}

export interface SaveDietDayInput {
  userId: string;
  gymId?: string | null;
  logDate: string;
  foods: DietFood[];
  totals: DietTotals;
  profile: ProfileDietInput;
  attendedToday: boolean;
  loggedDatesLast21Days: string[];
  hasEntriesToday: boolean;
}

export async function saveDietDay(
  client: TypedSupabaseClient,
  input: SaveDietDayInput,
): Promise<{
  dietLog: Tables<'diet_logs'>;
  summary: Tables<'diet_daily_summaries'>;
  score: ReturnType<typeof computeDietScoreV2>;
  fitnessScore: number;
}> {
  const targets = buildDietTargetsFromProfile(input.profile);
  const consistencyMeta = getDietConsistencyBonus(
    new Set(input.loggedDatesLast21Days),
    input.logDate,
    input.hasEntriesToday,
  );

  const scoreResult = computeDietScoreV2({
    totals: input.totals,
    targets,
    foods: input.foods,
    attendedToday: input.attendedToday,
    consistencyMeta,
    userData: input.profile,
  });

  const fitnessScore = computeCombinedFitnessScore(input.attendedToday, scoreResult.score);

  const dietLogPayload: TablesInsert<'diet_logs'> = {
    user_id: input.userId,
    gym_id: input.gymId ?? null,
    log_date: input.logDate,
    foods: input.foods as unknown as Json,
    totals: input.totals as unknown as Json,
    diet_score: scoreResult.score,
    fitness_score: fitnessScore,
  };

  const { data: dietLog, error: dietError } = await client
    .from('diet_logs')
    .upsert(dietLogPayload, { onConflict: 'user_id,log_date' })
    .select('*')
    .single();

  const savedLog = assertData(dietLog, dietError, 'Failed to save diet log');

  const summaryPayload: TablesInsert<'diet_daily_summaries'> = {
    user_id: input.userId,
    gym_id: input.gymId ?? null,
    summary_date: input.logDate,
    score: scoreResult.score,
    protein_g: Number(input.totals.protein) || 0,
    calories: Number(input.totals.calories) || 0,
    clean_ratio: cleanRatioFromFoods(input.foods),
    timing_score: scoreResult.parts.timing,
    gym_attended: input.attendedToday,
    water_liters: Number(input.totals.waterLiters) || 0,
  };

  const { data: summary, error: summaryError } = await client
    .from('diet_daily_summaries')
    .upsert(summaryPayload, { onConflict: 'user_id,summary_date' })
    .select('*')
    .single();

  return {
    dietLog: savedLog,
    summary: assertData(summary, summaryError, 'Failed to save diet summary'),
    score: scoreResult,
    fitnessScore,
  };
}

export async function syncLeaguePointsForDay(
  client: TypedSupabaseClient,
  userId: string,
  gymId: string | null,
  logDate: string,
  fitnessScore: number,
): Promise<Tables<'league_seasons'>> {
  const seasonId = getLeagueSeasonId(new Date(`${logDate}T12:00:00`));

  const { data: existing, error: fetchError } = await client
    .from('league_seasons')
    .select('*')
    .eq('user_id', userId)
    .eq('season_id', seasonId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  const dayPoints = (existing?.day_points as Record<string, number> | null) ?? {};
  const { dayPoints: nextDayPoints, totalPoints } = applyLeagueDayPoints(
    dayPoints,
    seasonId,
    logDate,
    fitnessScore,
  );

  const { data, error } = await client
    .from('league_seasons')
    .upsert(
      {
        user_id: userId,
        gym_id: gymId,
        season_id: seasonId,
        day_points: nextDayPoints as unknown as Json,
        total_points: totalPoints,
      },
      { onConflict: 'user_id,season_id' },
    )
    .select('*')
    .single();

  return assertData(data, error, 'Failed to sync league points');
}

export async function upsertMealLogStreak(
  client: TypedSupabaseClient,
  userId: string,
  loggedDates: string[],
  todayYmd: string,
  hasEntriesToday: boolean,
): Promise<Tables<'user_streaks'>> {
  const streak = computeMealLogStreak(new Set(loggedDates), todayYmd, hasEntriesToday);

  const { data: existing, error: fetchError } = await client
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  const best = Math.max(existing?.best_meal_log_streak ?? 0, streak);

  const { data, error } = await client
    .from('user_streaks')
    .upsert(
      {
        user_id: userId,
        best_meal_log_streak: best,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();

  return assertData(data, error, 'Failed to update streak');
}

/** Save diet day, sync league points, and update meal-log streak. */
export async function saveDietDayAndSync(
  client: TypedSupabaseClient,
  input: SaveDietDayInput,
): Promise<{
  dietLog: Tables<'diet_logs'>;
  summary: Tables<'diet_daily_summaries'>;
  score: ReturnType<typeof computeDietScoreV2>;
  fitnessScore: number;
  streak: Tables<'user_streaks'>;
}> {
  const saved = await saveDietDay(client, input);
  await syncLeaguePointsForDay(
    client,
    input.userId,
    input.gymId ?? null,
    input.logDate,
    saved.fitnessScore,
  );

  const dates = new Set(input.loggedDatesLast21Days);
  dates.add(input.logDate);
  const streak = await upsertMealLogStreak(
    client,
    input.userId,
    [...dates],
    input.logDate,
    input.hasEntriesToday,
  );

  return { ...saved, streak };
}

export function totalsFromFoods(foods: DietFood[], waterLiters = 0): DietTotals {
  return {
    calories: foods.reduce((sum, f) => sum + (Number(f.calories) || 0), 0),
    protein: foods.reduce((sum, f) => sum + (Number(f.protein) || 0), 0),
    carbs: foods.reduce((sum, f) => sum + (Number(f.carbs) || 0), 0),
    fat: foods.reduce((sum, f) => sum + (Number(f.fat) || 0), 0),
    waterLiters,
  };
}
