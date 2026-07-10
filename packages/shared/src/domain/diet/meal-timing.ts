import type { DietFood, MealWindows } from '../../types/diet';

export function parseHmToMinutes(hm: string): number | null {
  const s = String(hm || '').trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return h * 60 + min;
}

export function minutesOfDayFromIso(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

export function isMinutesWithinMealWindow(mins: number | null, win: { start: string; end: string }): boolean {
  if (mins == null || !win) return false;
  const start = parseHmToMinutes(win.start);
  const end = parseHmToMinutes(win.end);
  if (start == null || end == null) return false;
  if (end >= start) return mins >= start && mins <= end;
  return mins >= start || mins <= end;
}

export function isFoodTimingValidForSlot(
  food: DietFood,
  slot: 'morning' | 'afternoon' | 'evening',
  mealWindows: MealWindows,
): boolean {
  if (!food || (food.mealSlot || '') !== slot) return false;
  const iso = food.loggedAt;
  if (!iso) return true;
  const mins = minutesOfDayFromIso(iso);
  if (mins == null) return false;
  return isMinutesWithinMealWindow(mins, mealWindows[slot]);
}

export function isFoodTaggedOutsideMealWindow(food: DietFood, mealWindows: MealWindows): boolean {
  const slot = food?.mealSlot || '';
  if (!(['morning', 'afternoon', 'evening'] as const).includes(slot as 'morning') || !food.loggedAt) {
    return false;
  }
  return !isFoodTimingValidForSlot(food, slot as 'morning' | 'afternoon' | 'evening', mealWindows);
}
