export function ymdFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateFromYmdString(ymd: string): Date | null {
  const parts = (ymd || '').split('-').map(Number);
  if (parts.length !== 3) return null;
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined) return null;
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

export function getTodayYmd(now: Date = new Date()): string {
  return ymdFromDate(now);
}

export function getYesterdayYmd(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return ymdFromDate(d);
}

export function addDaysToYmd(dateString: string, days: number): string {
  const date = dateFromYmdString(dateString);
  if (!date) return dateString;
  date.setDate(date.getDate() + days);
  return ymdFromDate(date);
}

export function calculateDaysLeft(endDateString: string, todayYmd?: string): number | null {
  if (!endDateString) return null;
  const today = dateFromYmdString(todayYmd ?? getTodayYmd());
  const endDate = dateFromYmdString(endDateString);
  if (!today || !endDate) return null;
  const diffTime = endDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getLastNYmds(n: number, anchor: Date = new Date()): string[] {
  const rows: string[] = [];
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() - i);
    rows.push(ymdFromDate(d));
  }
  return rows;
}

export function getWeekStartYmd(now: Date = new Date()): string {
  const today = new Date(now);
  const day = today.getDay();
  const diff = today.getDate() - day;
  const start = new Date(today);
  start.setDate(diff);
  return ymdFromDate(start);
}

export function getMonthStartYmd(now: Date = new Date()): string {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return ymdFromDate(start);
}

export function ageFromDobString(dob: string): number | null {
  if (!dob || typeof dob !== 'string') return null;
  const parts = dob.split('-').map(Number);
  if (parts.length !== 3) return null;
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined) return null;
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const birth = new Date(y, m - 1, d);
  if (birth.getFullYear() !== y || birth.getMonth() !== m - 1 || birth.getDate() !== d) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() < m - 1 || (today.getMonth() === m - 1 && today.getDate() < d)) {
    age--;
  }
  return age;
}
