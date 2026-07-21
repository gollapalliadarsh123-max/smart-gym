import { buildGymCheckInPath, buildGymCheckInUrl, extractQrToken } from '@smart-gym/shared';
import type { TypedSupabaseClient } from '../client/browser';
import type { QrCheckInResult, Tables } from '../types/database';
import { assertData } from '../lib/errors';

export type GymQrCode = Tables<'gym_qr_codes'>;
export type QrScanLog = Tables<'qr_scan_logs'>;

export { buildGymCheckInPath, buildGymCheckInUrl, extractQrToken };

export async function getActiveGymQr(
  client: TypedSupabaseClient,
  gymId: string,
): Promise<GymQrCode> {
  const { data, error } = await client.rpc('get_active_gym_qr', { p_gym_id: gymId });
  return assertData(data, error, 'Failed to load gym QR');
}

export async function regenerateGymQr(
  client: TypedSupabaseClient,
  gymId: string,
  reason = 'Rotated by owner',
): Promise<GymQrCode> {
  const { data, error } = await client.rpc('regenerate_gym_qr', {
    p_gym_id: gymId,
    p_reason: reason,
  });
  return assertData(data, error, 'Failed to regenerate gym QR');
}

export async function listGymQrHistory(
  client: TypedSupabaseClient,
  gymId: string,
): Promise<GymQrCode[]> {
  const { data, error } = await client.rpc('list_gym_qr_history', { p_gym_id: gymId });
  if (error) throw new Error(error.message);
  return (data as GymQrCode[]) ?? [];
}

export async function checkInByQrToken(
  client: TypedSupabaseClient,
  token: string,
): Promise<QrCheckInResult> {
  const { data, error } = await client.rpc('check_in_by_qr_token', {
    p_token: token.toLowerCase(),
  });
  if (error) throw new Error(error.message);
  return data as QrCheckInResult;
}

export async function listRecentQrScanLogs(
  client: TypedSupabaseClient,
  gymId: string,
  limit = 30,
): Promise<QrScanLog[]> {
  const { data, error } = await client
    .from('qr_scan_logs')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
