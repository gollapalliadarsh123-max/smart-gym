import type {
  BodyGoal,
  DietConsistencyMeta,
  DietFood,
  DietScoreResult,
  DietTargets,
  DietTotals,
  MealWindows,
  ProfileDietInput,
} from '../../types/diet';
import {
  clampDietScore0to100,
  dietScoreLabelFromPoints,
  getDietMealWindowsFromProfile,
} from './constants';
import { buildDietSmartInsights, resolveMealWindows } from './insights';
import { isFoodTimingValidForSlot } from './meal-timing';
import {
  scoreCalorieByBodyGoal,
  scoreFoodQualityV2,
  scoreHydration,
  scoreProteinByTier,
  scoreTimingBySlotsFilled,
} from './scoring';

export interface ComputeDietScoreInput {
  totals: DietTotals;
  targets?: DietTargets | null;
  foods?: DietFood[];
  attendedToday?: boolean;
  consistencyMeta?: DietConsistencyMeta;
  mealWindows?: MealWindows | null;
  userData?: ProfileDietInput | null;
}

export function computeDietScoreV2(input: ComputeDietScoreInput): DietScoreResult {
  const {
    totals,
    targets,
    foods = [],
    attendedToday = false,
    consistencyMeta,
    mealWindows,
    userData,
  } = input;

  const cal = Number(totals.calories) || 0;
  const protein = Number(totals.protein) || 0;
  const waterLiters = Math.max(0, Number(totals.waterLiters) || 0);

  const windows = resolveMealWindows(
    mealWindows ?? (userData ? getDietMealWindowsFromProfile(userData) : null),
  );

  let calorieGoalCenter = 2000;
  let proteinGoalG = 120;
  let waterGoalLiters = 3;

  if (targets) {
    calorieGoalCenter = Number(targets.calorieCenter);
    if (!Number.isFinite(calorieGoalCenter) || calorieGoalCenter <= 0) calorieGoalCenter = 2000;
    if (targets.isManual && Number.isFinite(Number(targets.manualProteinTarget))) {
      proteinGoalG = Number(targets.manualProteinTarget);
    } else {
      proteinGoalG = Number(targets.proteinMaxGrams) || 120;
    }
    if (Number.isFinite(targets.waterGoalLiters) && targets.waterGoalLiters > 0) {
      waterGoalLiters = targets.waterGoalLiters;
    }
  }
  if (!Number.isFinite(proteinGoalG) || proteinGoalG <= 0) proteinGoalG = 120;

  const bodyGoal: BodyGoal =
    userData?.bodyGoal && (['lose', 'maintain', 'gain'] as const).includes(userData.bodyGoal)
      ? userData.bodyGoal
      : 'maintain';

  const proteinTierRes = scoreProteinByTier(protein, proteinGoalG);
  const proteinPts = proteinTierRes.pts;

  const calRes = scoreCalorieByBodyGoal(cal, calorieGoalCenter, bodyGoal);
  const caloriePts = calRes.pts;

  const timingSlots = {
    morning: foods.some((f) => isFoodTimingValidForSlot(f, 'morning', windows)),
    afternoon: foods.some((f) => isFoodTimingValidForSlot(f, 'afternoon', windows)),
    evening: foods.some((f) => isFoodTimingValidForSlot(f, 'evening', windows)),
  };
  const timingSlotRes = scoreTimingBySlotsFilled(timingSlots);
  const timingPts = timingSlotRes.pts;
  const timingSlotsFilled = timingSlotRes.slots;

  const q = scoreFoodQualityV2(foods);
  const qualityPts = q.pts;

  const consPts = Math.max(
    0,
    Math.min(5, Math.round(Number(consistencyMeta?.bonus) || 0)),
  );
  const consDaysHit = Math.max(0, Math.min(3, Math.round(Number(consistencyMeta?.daysHit) || 0)));

  const gymPts = attendedToday ? 5 : 0;
  const hydrationPts = scoreHydration(waterLiters, waterGoalLiters);

  const score = clampDietScore0to100(
    proteinPts + caloriePts + timingPts + qualityPts + consPts + gymPts + hydrationPts,
  );
  const label = dietScoreLabelFromPoints(score);

  const { feedback, recommendation } = buildDietSmartInsights({
    protein,
    proteinGoalG,
    proteinTier: proteinTierRes.band,
    calorieGoalCenter,
    cal,
    calRes,
    bodyGoal,
    timingSlots,
    timingSlotsFilled,
    foods,
    mealWindows: windows,
    quality: q,
    consistency: { bonus: consPts, daysHit: consDaysHit },
    attendedToday,
    hydration: { pts: hydrationPts },
    waterGoalLiters,
    parts: {
      protein: proteinPts,
      calories: caloriePts,
      timing: timingPts,
      quality: qualityPts,
      consistency: consPts,
      gym: gymPts,
      hydration: hydrationPts,
    },
    totalScore: score,
  });

  return {
    score,
    label,
    parts: {
      protein: proteinPts,
      calories: caloriePts,
      timing: timingPts,
      quality: qualityPts,
      consistency: consPts,
      gym: gymPts,
      hydration: hydrationPts,
    },
    feedback,
    recommendation,
  };
}
