import { ageFromDobString } from '../dates';
import type { BodyGoal, DietTargets, ProfileDietInput } from '../../types/diet';
import {
  DIET_ACTIVITY_FACTORS,
  DIET_PROTEIN_GKG,
  DIET_WATER_MAX_L,
  DIET_WATER_ML_PER_KG,
} from './constants';

export function feetInchesToCm(feet: number, inches: number): number {
  return feet * 30.48 + inches * 2.54;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalIn = cm / 2.54;
  let feet = Math.floor(totalIn / 12);
  let inches = Math.round(totalIn - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function computeBmrMifflin(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: string,
): number {
  const s = gender === 'Male' ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

export function calorieCenterForGoal(tdee: number, goal: BodyGoal): number {
  if (goal === 'lose') return tdee * 0.8;
  if (goal === 'gain') return tdee * 1.12;
  return tdee;
}

export function calorieBandForGoal(
  goal: BodyGoal,
  center: number,
): { min: number; max: number } {
  if (goal === 'lose') return { min: center * 0.88, max: center * 1.05 };
  if (goal === 'gain') return { min: center * 0.92, max: center * 1.15 };
  return { min: center * 0.9, max: center * 1.1 };
}

export function buildPersonalDietTargets(userData: ProfileDietInput | null): DietTargets | null {
  if (!userData) return null;

  const age = ageFromDobString(userData.dob ?? '');
  const gender = userData.gender;
  const w = Number(userData.weightKg);
  const hCm = Number(userData.heightCm);
  const act = userData.activityLevel;
  const goal = userData.bodyGoal;

  if (
    age == null ||
    age < 13 ||
    age > 100 ||
    (gender !== 'Male' && gender !== 'Female') ||
    !Number.isFinite(w) ||
    w < 20 ||
    w > 300 ||
    !Number.isFinite(hCm) ||
    hCm < 100 ||
    hCm > 250 ||
    !act ||
    !DIET_ACTIVITY_FACTORS[act] ||
    !goal ||
    !(['lose', 'maintain', 'gain'] as const).includes(goal)
  ) {
    return null;
  }

  const bmr = computeBmrMifflin(w, hCm, age, gender);
  const tdee = bmr * DIET_ACTIVITY_FACTORS[act];
  const center = calorieCenterForGoal(tdee, goal);
  const { min: calMin, max: calMax } = calorieBandForGoal(goal, center);
  const pg = DIET_PROTEIN_GKG[goal];
  const proteinMinGrams = w * pg.min;
  const proteinMaxGrams = w * pg.max;
  const waterMl = Math.min(DIET_WATER_ML_PER_KG * w, DIET_WATER_MAX_L * 1000);
  const waterGoalLiters = waterMl / 1000;

  return {
    calMin,
    calMax,
    calorieCenter: center,
    tdee,
    proteinMinGrams,
    proteinMaxGrams,
    waterGoalLiters,
    isManual: false,
  };
}

export function buildManualDietTargets(userData: ProfileDietInput | null): DietTargets | null {
  if (!userData?.manualDietGoalsEnabled) return null;

  const p = Number(userData.manualProteinGoalG);
  const c = Number(userData.manualCalorieGoal);
  const wL = Number(userData.manualWaterGoalL);

  if (!Number.isFinite(p) || p < 20 || p > 400) return null;
  if (!Number.isFinite(c) || c < 600 || c > 6000) return null;
  if (!Number.isFinite(wL) || wL < 0.25 || wL > DIET_WATER_MAX_L) return null;

  const calorieCenter = c;
  return {
    calMin: calorieCenter * 0.93,
    calMax: calorieCenter * 1.07,
    calorieCenter,
    tdee: null,
    proteinMinGrams: p * 0.93,
    proteinMaxGrams: p * 1.07,
    waterGoalLiters: Math.min(wL, DIET_WATER_MAX_L),
    isManual: true,
    manualProteinTarget: p,
    manualCalorieTarget: c,
    manualWaterTarget: wL,
  };
}

export function buildDietTargetsFromProfile(userData: ProfileDietInput | null): DietTargets | null {
  return buildManualDietTargets(userData) ?? buildPersonalDietTargets(userData);
}

export function healthyWeightRangeKg(heightCm: number): { minKg: number; maxKg: number } | null {
  if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) return null;
  const hM = heightCm / 100;
  return {
    minKg: 18.5 * hM * hM,
    maxKg: 24.9 * hM * hM,
  };
}
