import type { ActivityLevel, BodyGoal, MealWindows } from '../../types/diet';
import type { ProfileDietInput } from '../../types/diet';

export const DIET_ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const DIET_PROTEIN_GKG: Record<BodyGoal, { min: number; max: number }> = {
  lose: { min: 1.6, max: 2.0 },
  maintain: { min: 1.2, max: 1.6 },
  gain: { min: 1.6, max: 2.2 },
};

export const DIET_WATER_MAX_L = 4;
export const DIET_WATER_ML_PER_KG = 35;

export const DEFAULT_DIET_MEAL_WINDOWS: MealWindows = {
  morning: { start: '08:00', end: '09:00' },
  afternoon: { start: '13:00', end: '14:00' },
  evening: { start: '19:00', end: '20:00' },
};

export const DIET_SCORE_PART_MAX = {
  protein: 30,
  calories: 25,
  timing: 15,
  quality: 15,
  consistency: 5,
  gym: 5,
  hydration: 5,
} as const;

export function getDietMealWindowsFromProfile(userData?: ProfileDietInput | null): MealWindows {
  const d = DEFAULT_DIET_MEAL_WINDOWS;
  const w = userData?.dietMealWindows;
  if (!w || typeof w !== 'object') {
    return {
      morning: { ...d.morning },
      afternoon: { ...d.afternoon },
      evening: { ...d.evening },
    };
  }
  return {
    morning: {
      start: w.morning?.start ?? d.morning.start,
      end: w.morning?.end ?? d.morning.end,
    },
    afternoon: {
      start: w.afternoon?.start ?? d.afternoon.start,
      end: w.afternoon?.end ?? d.afternoon.end,
    },
    evening: {
      start: w.evening?.start ?? d.evening.start,
      end: w.evening?.end ?? d.evening.end,
    },
  };
}

export function clampDietScore0to100(n: number): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

export function dietScoreLabelFromPoints(score: number): string {
  const s = clampDietScore0to100(score);
  if (s >= 90) return 'Excellent';
  if (s >= 75) return 'Good';
  if (s >= 60) return 'Average';
  if (s >= 40) return 'Poor';
  return 'Needs Improvement';
}
