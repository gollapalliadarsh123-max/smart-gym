import { ATTENDANCE_LIVE_WINDOW_MS } from '../../constants/app';

export interface AttendanceLiveRow {
  checkInTimestamp?: number | string | bigint | null;
  check_in_timestamp?: number | string | bigint | null;
  expiresAt?: number | string | bigint | null;
  expires_at?: number | string | bigint | null;
}

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    // ISO timestamps from Postgres timestamptz
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed) || trimmed.includes('T')) {
      const ms = Date.parse(trimmed);
      return Number.isFinite(ms) ? ms : 0;
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Returns epoch ms when the check-in stops counting toward live crowd meter */
export function attendanceLiveWindowEndMs(row: AttendanceLiveRow | null | undefined): number {
  if (!row) return 0;
  const ts = toNumber(row.check_in_timestamp ?? row.checkInTimestamp);
  const exp = toNumber(row.expires_at ?? row.expiresAt);
  if (exp > 1e11) return exp;
  if (ts > 0) return ts + ATTENDANCE_LIVE_WINDOW_MS;
  return 0;
}

export function isAttendanceLive(
  row: AttendanceLiveRow,
  nowMs: number = Date.now(),
): boolean {
  return attendanceLiveWindowEndMs(row) > nowMs;
}

export function countLiveMembers<T extends AttendanceLiveRow>(
  rows: T[],
  nowMs: number = Date.now(),
): number {
  const seen = new Set<string>();
  let count = 0;
  for (const row of rows) {
    const key =
      (row as { user_id?: string; uid?: string }).user_id ??
      (row as { uid?: string }).uid ??
      JSON.stringify(row);
    if (seen.has(key)) continue;
    if (isAttendanceLive(row, nowMs)) {
      seen.add(key);
      count++;
    }
  }
  return count;
}
