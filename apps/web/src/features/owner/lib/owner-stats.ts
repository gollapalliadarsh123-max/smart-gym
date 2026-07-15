import {
  addDaysToYmd,
  getTodayYmd,
  ymdFromDate,
} from '@smart-gym/shared';

export type StatsPeriod = 'day' | 'week' | 'year';

export type ChartPoint = {
  key: string;
  label: string;
  value: number;
};

type PaidLike = {
  status: string;
  amount: number | null;
  paid_at: string | null;
  created_at?: string;
};

type AttendanceLike = {
  attendance_date: string;
  checked_in_at: string;
};

function paidAt(p: PaidLike): Date | null {
  const raw = p.paid_at || p.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isPaid(p: PaidLike) {
  return p.status === 'paid';
}

function hourLabel(hour: number) {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${suffix}`;
}

function shortWeekday(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' });
}

function monthLabel(monthIndex: number) {
  return new Date(2000, monthIndex, 1).toLocaleDateString(undefined, { month: 'short' });
}

/** Hourly income for today (0–23). */
export function buildDayIncomeSeries(
  payments: PaidLike[],
  now: Date = new Date(),
): ChartPoint[] {
  const today = getTodayYmd(now);
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    key: `h-${hour}`,
    label: hourLabel(hour),
    value: 0,
  }));

  for (const p of payments) {
    if (!isPaid(p)) continue;
    const at = paidAt(p);
    if (!at || ymdFromDate(at) !== today) continue;
    buckets[at.getHours()]!.value += Number(p.amount || 0);
  }

  return buckets;
}

/** Daily income for the last 7 days (oldest → newest). */
export function buildWeekIncomeSeries(
  payments: PaidLike[],
  now: Date = new Date(),
): ChartPoint[] {
  const today = getTodayYmd(now);
  const days: ChartPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const ymd = addDaysToYmd(today, -i);
    days.push({
      key: ymd,
      label: shortWeekday(ymd),
      value: 0,
    });
  }
  const index = new Map(days.map((d, i) => [d.key, i]));

  for (const p of payments) {
    if (!isPaid(p)) continue;
    const at = paidAt(p);
    if (!at) continue;
    const ymd = ymdFromDate(at);
    const i = index.get(ymd);
    if (i === undefined) continue;
    days[i]!.value += Number(p.amount || 0);
  }

  return days;
}

/** Monthly income for the current calendar year. */
export function buildYearIncomeSeries(
  payments: PaidLike[],
  now: Date = new Date(),
): ChartPoint[] {
  const year = now.getFullYear();
  const months: ChartPoint[] = Array.from({ length: 12 }, (_, month) => ({
    key: `${year}-${month}`,
    label: monthLabel(month),
    value: 0,
  }));

  for (const p of payments) {
    if (!isPaid(p)) continue;
    const at = paidAt(p);
    if (!at || at.getFullYear() !== year) continue;
    months[at.getMonth()]!.value += Number(p.amount || 0);
  }

  return months;
}

/** Hourly check-ins for today. */
export function buildDayAttendanceSeries(
  rows: AttendanceLike[],
  now: Date = new Date(),
): ChartPoint[] {
  const today = getTodayYmd(now);
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    key: `h-${hour}`,
    label: hourLabel(hour),
    value: 0,
  }));

  for (const row of rows) {
    if (row.attendance_date !== today) continue;
    const at = new Date(row.checked_in_at);
    if (Number.isNaN(at.getTime())) continue;
    buckets[at.getHours()]!.value += 1;
  }

  return buckets;
}

/** Daily check-ins for the last 7 days. */
export function buildWeekAttendanceSeries(
  rows: AttendanceLike[],
  now: Date = new Date(),
): ChartPoint[] {
  const today = getTodayYmd(now);
  const days: ChartPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const ymd = addDaysToYmd(today, -i);
    days.push({
      key: ymd,
      label: shortWeekday(ymd),
      value: 0,
    });
  }
  const index = new Map(days.map((d, i) => [d.key, i]));

  for (const row of rows) {
    const i = index.get(row.attendance_date);
    if (i === undefined) continue;
    days[i]!.value += 1;
  }

  return days;
}

/** Monthly check-in counts for the current calendar year. */
export function buildYearAttendanceSeries(
  rows: AttendanceLike[],
  now: Date = new Date(),
): ChartPoint[] {
  const year = now.getFullYear();
  const months: ChartPoint[] = Array.from({ length: 12 }, (_, month) => ({
    key: `${year}-${month}`,
    label: monthLabel(month),
    value: 0,
  }));

  for (const row of rows) {
    const [y, m] = row.attendance_date.split('-').map(Number);
    if (y !== year || !m) continue;
    months[m - 1]!.value += 1;
  }

  return months;
}

export function sumSeries(points: ChartPoint[]): number {
  return points.reduce((sum, p) => sum + p.value, 0);
}

export function yearStartYmd(now: Date = new Date()): string {
  return `${now.getFullYear()}-01-01`;
}

export function weekStartYmd(now: Date = new Date()): string {
  return addDaysToYmd(getTodayYmd(now), -6);
}
