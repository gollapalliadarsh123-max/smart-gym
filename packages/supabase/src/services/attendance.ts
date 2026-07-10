import type { MarkAttendanceResult, SelfCheckInResult, Tables } from '../types/database';
import type { TypedSupabaseClient } from '../client/browser';

export async function markAttendanceByCode(
  client: TypedSupabaseClient,
  gymId: string,
  code: string,
): Promise<MarkAttendanceResult> {
  const { data, error } = await client.rpc('mark_attendance_by_code', {
    p_gym_id: gymId,
    p_code: code,
  });

  if (error) throw new Error(error.message);
  return data as MarkAttendanceResult;
}

export async function generateDailyAttendanceCode(
  client: TypedSupabaseClient,
  gymId: string,
): Promise<string> {
  const { data, error } = await client.rpc('generate_daily_attendance_code', {
    p_gym_id: gymId,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function selfCheckIn(
  client: TypedSupabaseClient,
  gymId: string,
): Promise<SelfCheckInResult> {
  const { data, error } = await client.rpc('self_check_in', {
    p_gym_id: gymId,
  });

  if (error) throw new Error(error.message);
  return data as SelfCheckInResult;
}

export async function expireMembershipsIfNeeded(
  client: TypedSupabaseClient,
  userId?: string,
): Promise<void> {
  const { error } = await client.rpc('expire_memberships_if_needed', {
    p_user_id: userId,
  });

  if (error) throw new Error(error.message);
}

export async function listAttendanceForGymDate(
  client: TypedSupabaseClient,
  gymId: string,
  dateYmd: string,
): Promise<Tables<'attendance'>[]> {
  const { data, error } = await client
    .from('attendance')
    .select('*')
    .eq('gym_id', gymId)
    .eq('attendance_date', dateYmd)
    .order('checked_in_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAttendanceForGymRange(
  client: TypedSupabaseClient,
  gymId: string,
  fromYmd: string,
  toYmd: string,
): Promise<Tables<'attendance'>[]> {
  const { data, error } = await client
    .from('attendance')
    .select('*')
    .eq('gym_id', gymId)
    .gte('attendance_date', fromYmd)
    .lte('attendance_date', toYmd)
    .order('checked_in_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMemberAttendanceForDate(
  client: TypedSupabaseClient,
  userId: string,
  dateYmd: string,
): Promise<Tables<'attendance'> | null> {
  const { data, error } = await client
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .eq('attendance_date', dateYmd)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listMemberAttendance(
  client: TypedSupabaseClient,
  userId: string,
  limit = 30,
): Promise<Tables<'attendance'>[]> {
  const { data, error } = await client
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .order('attendance_date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
