import type { TypedSupabaseClient } from '../client/browser';
import type { Tables } from '../types/database';

export async function getLeagueSeasonForUser(
  client: TypedSupabaseClient,
  userId: string,
  seasonId: string,
): Promise<Tables<'league_seasons'> | null> {
  const { data, error } = await client
    .from('league_seasons')
    .select('*')
    .eq('user_id', userId)
    .eq('season_id', seasonId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listLeagueLeaderboard(
  client: TypedSupabaseClient,
  seasonId: string,
  limit = 100,
): Promise<Tables<'league_seasons'>[]> {
  const { data, error } = await client
    .from('league_seasons')
    .select('*')
    .eq('season_id', seasonId)
    .order('total_points', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
