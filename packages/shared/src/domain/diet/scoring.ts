import type { BodyGoal, DietFood } from '../../types/diet';

export interface CalorieScoreResult {
  pts: number;
  tier: 'in' | 'slight' | 'moderate' | 'extreme' | 'none';
}

export interface ProteinScoreResult {
  pts: number;
  band: 'full' | 'strong' | 'partial' | 'low';
}

export interface TimingScoreResult {
  pts: number;
  slots: number;
}

export interface FoodQualityScoreResult {
  pts: number;
  clean: number;
  junk: number;
  neutral: number;
  junkRatio: number;
  total: number;
  cleanRatio: number;
}

export function scoreCalorieMaintainBands(cal: number, goalCenter: number): CalorieScoreResult {
  const G = Number(goalCenter);
  const c = Number(cal) || 0;
  if (!Number.isFinite(G) || G <= 0) return { pts: 0, tier: 'none' };
  const innerLo = 0.9 * G;
  const innerHi = 1.1 * G;
  if (c >= innerLo && c <= innerHi) return { pts: 25, tier: 'in' };
  const slightLo = 0.8 * G;
  const slightHi = 1.2 * G;
  if (c >= slightLo && c <= slightHi) return { pts: 18, tier: 'slight' };
  const modLo = 0.7 * G;
  const modHi = 1.3 * G;
  if (c >= modLo && c <= modHi) return { pts: 10, tier: 'moderate' };
  return { pts: 0, tier: 'extreme' };
}

export function scoreCalorieByBodyGoal(
  cal: number,
  goalCenter: number,
  bodyGoal: BodyGoal,
): CalorieScoreResult {
  const G = Number(goalCenter);
  const c = Number(cal) || 0;
  if (!Number.isFinite(G) || G <= 0) return { pts: 0, tier: 'none' };
  const bg: BodyGoal = (['lose', 'maintain', 'gain'] as const).includes(bodyGoal)
    ? bodyGoal
    : 'maintain';

  if (bg === 'maintain') return scoreCalorieMaintainBands(c, G);
  if (bg === 'lose') {
    if (c >= G * 0.78 && c <= G * 1.03) return { pts: 25, tier: 'in' };
    if (c >= G * 0.65 && c <= G * 1.12) return { pts: 18, tier: 'slight' };
    if (c >= G * 0.52 && c <= G * 1.28) return { pts: 10, tier: 'moderate' };
    return { pts: 0, tier: 'extreme' };
  }
  if (c >= G * 0.93 && c <= G * 1.22) return { pts: 25, tier: 'in' };
  if (c >= G * 0.82 && c <= G * 1.35) return { pts: 18, tier: 'slight' };
  if (c >= G * 0.7 && c <= G * 1.48) return { pts: 10, tier: 'moderate' };
  return { pts: 0, tier: 'extreme' };
}

export function scoreProteinByTier(proteinG: number, goalG: number): ProteinScoreResult {
  const g = Math.max(0.001, Number(goalG) || 120);
  const p = Math.max(0, Number(proteinG) || 0);
  const r = p / g;
  if (r >= 0.9) return { pts: 30, band: 'full' };
  if (r >= 0.75) return { pts: 26, band: 'strong' };
  if (r >= 0.5) return { pts: 17, band: 'partial' };
  return { pts: Math.min(14, Math.round(r * 28)), band: 'low' };
}

export function scoreTimingBySlotsFilled(timingSlots: {
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
}): TimingScoreResult {
  const n = [timingSlots.morning, timingSlots.afternoon, timingSlots.evening].filter(Boolean).length;
  if (n >= 3) return { pts: 15, slots: n };
  if (n === 2) return { pts: 12, slots: n };
  if (n === 1) return { pts: 6, slots: n };
  return { pts: 0, slots: 0 };
}

export function scoreFoodQualityV2(foods: DietFood[]): FoodQualityScoreResult {
  const list = Array.isArray(foods) ? foods.filter(Boolean) : [];
  const n = list.length;
  if (!n) {
    return { pts: 0, clean: 0, junk: 0, neutral: 0, junkRatio: 0, total: 0, cleanRatio: 0 };
  }

  let clean = 0;
  let junk = 0;
  let neutral = 0;
  for (const f of list) {
    if (f.junk) junk++;
    else if (f.neutral) neutral++;
    else clean++;
  }

  const effectiveClean = clean + neutral * 0.5;
  const cleanRatio = effectiveClean / n;
  const junkRatio = junk / n;

  let pts = 0;
  if (cleanRatio >= 0.8) pts = 15;
  else if (cleanRatio >= 0.6) pts = 10;
  else if (cleanRatio >= 0.5) pts = 6;
  else pts = Math.max(0, Math.round(cleanRatio * 12));

  pts = Math.max(0, Math.min(15, pts));
  if (junkRatio > 0.45 && pts > 0) pts = Math.max(0, pts - 2);

  return { pts, clean, junk, neutral, junkRatio, total: n, cleanRatio };
}

export function scoreHydration(waterLiters: number, waterGoalLiters: number): number {
  const w = Math.max(0, Number(waterLiters) || 0);
  const g = Number(waterGoalLiters);
  const goal = Number.isFinite(g) && g > 0 ? g : 3;
  const ratio = goal > 0 ? w / goal : 0;
  if (ratio >= 0.92) return 5;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.55) return 2;
  return Math.min(5, Math.max(0, Math.round(ratio * 5)));
}

export function cleanRatioFromFoods(foods: DietFood[]): number {
  const q = scoreFoodQualityV2(foods);
  if (!q.total) return 0;
  return Math.round(q.cleanRatio * 1000) / 1000;
}
