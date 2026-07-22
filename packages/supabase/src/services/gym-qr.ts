import { buildGymCheckInPath, buildGymCheckInUrl, extractQrToken } from '@smart-gym/shared';
import type { TypedSupabaseClient } from '../client/browser';
import type { QrCheckInResult, Tables } from '../types/database';

export type GymQrCode = Tables<'gym_qr_codes'>;
export type QrScanLog = Tables<'qr_scan_logs'>;

export { buildGymCheckInPath, buildGymCheckInUrl, extractQrToken };

function asGymQr(data: unknown): GymQrCode | null {
  let value: unknown = data;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Partial<GymQrCode>;
  if (!row.id || !row.gym_id || !row.token) return null;
  return row as GymQrCode;
}

function asGymQrList(data: unknown): GymQrCode[] {
  let value: unknown = data;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.map(asGymQr).filter((row): row is GymQrCode => row !== null);
}

/** Prefer table read; create via RPC if missing. */
export async function getActiveGymQr(
  client: TypedSupabaseClient,
  gymId: string,
): Promise<GymQrCode> {
  const { data: existing, error: selectError } = await client
    .from('gym_qr_codes')
    .select('*')
    .eq('gym_id', gymId)
    .eq('status', 'active')
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);
  if (existing) return existing;

  const { data, error } = await client.rpc('ensure_active_gym_qr', { p_gym_id: gymId });
  if (error) throw new Error(error.message);
  const row = asGymQr(data);
  if (!row) throw new Error('Failed to create gym QR');
  return row;
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
  if (error) throw new Error(error.message);
  const row = asGymQr(data);
  if (row) return row;

  // Fallback: read active row after regenerate
  return getActiveGymQr(client, gymId);
}

export async function listGymQrHistory(
  client: TypedSupabaseClient,
  gymId: string,
): Promise<GymQrCode[]> {
  const { data: fromTable, error: tableError } = await client
    .from('gym_qr_codes')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!tableError && fromTable) return fromTable;

  const { data, error } = await client.rpc('list_gym_qr_history', { p_gym_id: gymId });
  if (error) throw new Error(error.message);
  return asGymQrList(data);
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
