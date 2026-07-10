import { getLastNYmds } from '../dates';

export const STREAK_SHARE_MILESTONES = [3, 7, 14, 30] as const;

export function shouldShowStreakShareButton(currentStreak: number): boolean {
  const n = Math.floor(Number(currentStreak) || 0);
  return (STREAK_SHARE_MILESTONES as readonly number[]).includes(n);
}

export function getDietConsistencyBonus(
  loggedDates: ReadonlySet<string>,
  todayYmd: string,
  hasEntriesToday: boolean,
): { bonus: number; daysHit: number } {
  const dates = new Set(loggedDates);
  if (hasEntriesToday) dates.add(todayYmd);

  const last3 = getLastNYmds(3, new Date(`${todayYmd}T00:00:00`));
  let daysHit = 0;
  for (const ymd of last3) {
    if (dates.has(ymd)) daysHit++;
  }

  let bonus = 0;
  if (daysHit >= 3) bonus = 5;
  else if (daysHit === 2) bonus = 3;

  return { bonus, daysHit };
}

export function computeMealLogStreak(
  loggedDates: ReadonlySet<string>,
  todayYmd: string,
  hasEntriesToday: boolean,
): number {
  const dates = new Set(loggedDates);
  if (hasEntriesToday) dates.add(todayYmd);

  const anchor = new Date(`${todayYmd}T00:00:00`);
  if (Number.isNaN(anchor.getTime())) return 0;

  let streak = 0;
  const cursor = new Date(anchor);

  for (let n = 0; n < 400; n++) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;
    if (dates.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function countJunkMealsFromFoods(
  foods: ReadonlyArray<{ junk?: boolean }>,
): number {
  return foods.filter((f) => f?.junk).length;
}
