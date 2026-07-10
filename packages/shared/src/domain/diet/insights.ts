import type { BodyGoal, DietFood, DietScoreParts, MealWindows } from '../../types/diet';
import type { CalorieScoreResult, FoodQualityScoreResult } from './scoring';
import { DEFAULT_DIET_MEAL_WINDOWS } from './constants';
import { isFoodTaggedOutsideMealWindow } from './meal-timing';

export interface DietInsightsContext {
  protein: number;
  proteinGoalG: number;
  proteinTier?: string;
  calorieGoalCenter: number;
  cal: number;
  calRes: CalorieScoreResult;
  bodyGoal: BodyGoal;
  timingSlots: { morning: boolean; afternoon: boolean; evening: boolean };
  timingSlotsFilled: number;
  foods: DietFood[];
  mealWindows: MealWindows;
  quality: FoodQualityScoreResult;
  consistency: { bonus: number; daysHit: number };
  attendedToday: boolean;
  hydration: { pts: number };
  waterGoalLiters: number;
  parts: DietScoreParts;
  totalScore: number;
}

export function buildDietSmartInsights(ctx: DietInsightsContext): {
  feedback: string[];
  recommendation: string;
} {
  const {
    protein,
    proteinGoalG,
    proteinTier,
    calorieGoalCenter,
    cal,
    calRes,
    bodyGoal,
    timingSlots,
    timingSlotsFilled,
    foods,
    mealWindows,
    quality,
    consistency,
    attendedToday,
    hydration,
    waterGoalLiters,
    parts,
    totalScore,
  } = ctx;

  const slotLabel = (name: string) => {
    if (name === 'morning') return 'morning';
    if (name === 'afternoon') return 'afternoon';
    if (name === 'evening') return 'evening';
    return name;
  };

  const proteinMsg = (() => {
    const tier = proteinTier || (protein >= proteinGoalG ? 'full' : 'low');
    if (tier === 'full') return 'Protein is in the top tier (near your goal)—great work.';
    if (tier === 'strong') return 'Protein is strong—close to the next tier.';
    if (tier === 'partial') return 'Protein is mid-range—add a lean source to climb tiers.';
    if (protein > 0) {
      const shortBy = Math.max(0, Math.round(proteinGoalG - protein));
      if (shortBy >= 1) return `Protein is below target by ${shortBy}g (tiered scoring).`;
      return 'Protein is slightly below your target.';
    }
    return 'Log protein-rich foods to earn protein points.';
  })();

  const calMsg = (() => {
    if (calRes.tier === 'in') {
      if (bodyGoal === 'lose') return 'Calories fit your fat-loss window around your target.';
      if (bodyGoal === 'gain') return 'Calories fit your muscle-gain window around your target.';
      return 'Calories are within your target range.';
    }
    if (calRes.tier === 'none' || !Number.isFinite(calorieGoalCenter) || calorieGoalCenter <= 0) {
      return 'Set a calorie goal in your profile for clearer calorie feedback.';
    }
    if (bodyGoal === 'lose' && cal > calorieGoalCenter * 1.08) {
      const over = Math.max(0, Math.round(cal - calorieGoalCenter));
      return `For fat loss, calories are above your target center (+${over} kcal vs center)—tighten portions if needed.`;
    }
    if (bodyGoal === 'gain' && cal < calorieGoalCenter * 0.9) {
      const under = Math.max(0, Math.round(calorieGoalCenter - cal));
      return `For muscle gain, calories are below your target center (~${under} kcal)—add fuel if you can.`;
    }
    if (cal <= 0) return 'You are eating too little today—add balanced meals.';
    if (cal > calorieGoalCenter) {
      const over = Math.max(0, Math.round(cal - calorieGoalCenter));
      return `You are ${over} calories above your calorie target.`;
    }
    const under = Math.max(0, Math.round(calorieGoalCenter - cal));
    if (under >= 50) return `You are ${under} calories below your calorie target.`;
    return 'Calories are below your target—fine if intentional.';
  })();

  const timingMsg = (() => {
    const wins = mealWindows;
    const foodList = Array.isArray(foods) ? foods : [];
    const taggedOutside = foodList.some((f) => isFoodTaggedOutsideMealWindow(f, wins));
    const n = typeof timingSlotsFilled === 'number' ? timingSlotsFilled : 0;

    if (n >= 3) {
      return "All three meal slots hit today—full timing score (logged within each slot's window).";
    }
    if (n === 2) {
      return 'Two of three meal slots logged—solid timing (one more slot for the top tier).';
    }
    if (n === 1) {
      return 'One meal slot logged—add morning, afternoon, or night meals in-window for more timing points.';
    }
    const missed: string[] = [];
    if (!timingSlots.morning) missed.push('morning');
    if (!timingSlots.afternoon) missed.push('afternoon');
    if (!timingSlots.evening) missed.push('evening');
    let line = 'Log meals into morning, afternoon, and evening slots for timing points.';
    if (missed.length && n === 0) {
      line = `No slots in-window yet—try logging ${missed.map(slotLabel).join(', ')} within your meal times.`;
    }
    if (taggedOutside) {
      line +=
        " A meal tagged Morning/Afternoon/Night only counts if you add it during that slot's time window in your profile.";
    }
    return line;
  })();

  const qualityMsg = (() => {
    if (quality.total <= 0) return 'Log meals to earn food quality points.';
    const cr =
      typeof quality.cleanRatio === 'number' ? quality.cleanRatio : quality.clean / quality.total;
    if (cr >= 0.8) {
      return quality.junk > 0
        ? 'Food quality is strong—mostly whole foods with room for a small treat.'
        : 'Food quality is strong today.';
    }
    if (cr >= 0.6) return 'Food quality is decent—aim for ~80% whole foods for full points.';
    if (cr >= 0.5) return 'Food quality is OK—swap one item for a whole food when you can.';
    if (quality.junkRatio > 0.4) return 'A lot of junk today—whole foods will lift your score faster.';
    return 'Mix in more whole foods to lift food quality.';
  })();

  const hydrationMsg = (() => {
    const pts = Number(hydration?.pts);
    const goal = Number(waterGoalLiters) > 0 ? Number(waterGoalLiters) : 3;
    if (Number.isFinite(pts) && pts >= 5) return `Hydration on target (~${goal.toFixed(2)} L goal).`;
    if (Number.isFinite(pts) && pts >= 3) {
      return 'Close to your water goal—sip steadily to lock hydration points.';
    }
    return `Drink toward ~${goal.toFixed(2)} L to earn hydration points.`;
  })();

  const gymMsg = attendedToday
    ? 'Gym attendance bonus added today.'
    : 'No gym attendance recorded today.';

  const consistencyMsg = (() => {
    if (consistency.bonus >= 5) return 'Great consistency over the last 3 days.';
    if (consistency.bonus === 3) return 'You logged 2 of the last 3 days—log tomorrow for the full bonus.';
    return '';
  })();

  const feedback = [proteinMsg, calMsg, timingMsg, qualityMsg, hydrationMsg, gymMsg];
  if (consistencyMsg) feedback.push(consistencyMsg);

  const feedbackOut = feedback.slice(0, 6);

  let recommendation = 'Keep logging meals; small habits add up.';
  const proteinGap = Math.max(0, Math.round(proteinGoalG - protein));
  const winsRec = mealWindows;
  const foodListRec = Array.isArray(foods) ? foods : [];
  const anyTaggedOutside = foodListRec.some((f) => isFoodTaggedOutsideMealWindow(f, winsRec));

  if (protein > 0 && protein < proteinGoalG && proteinGap >= 15) {
    recommendation =
      'Add a high-protein snack before the day ends—try Greek yogurt, eggs, tofu, or chicken.';
  } else if (protein > 0 && protein < proteinGoalG && proteinGap >= 5) {
    recommendation = 'Add one high-protein snack today; eggs, yogurt, or chicken are easy wins.';
  } else if (anyTaggedOutside) {
    recommendation =
      "Log foods during each meal's time window in your profile—or widen a window if you usually eat outside it.";
  } else if (!timingSlots.morning && (quality.total > 0 || protein > 0)) {
    recommendation = 'Try to log breakfast within your morning window tomorrow.';
  } else if (
    calRes.tier !== 'in' &&
    cal > calorieGoalCenter &&
    Number.isFinite(calorieGoalCenter) &&
    calorieGoalCenter > 0
  ) {
    recommendation = 'Keep your next meal lighter to move back toward your calorie goal.';
  } else if (quality.total > 0 && quality.junkRatio > 0.25) {
    recommendation = 'Choose a cleaner dinner or snack next time to lift food quality.';
  } else if (!timingSlots.evening && quality.total > 0) {
    recommendation = 'Try to eat within your evening meal slot and log it.';
  } else if (parts && Number(parts.hydration) < 3) {
    recommendation = 'Drink more water toward your daily goal—hydration now earns up to 5 points.';
  } else if (totalScore >= 75) {
    recommendation = 'You are on track today—keep it up.';
  } else if (totalScore >= 60) {
    recommendation = 'Solid day—a few tweaks could push your score higher.';
  }

  return { feedback: feedbackOut, recommendation };
}

export function resolveMealWindows(mealWindows?: MealWindows | null): MealWindows {
  if (mealWindows && typeof mealWindows === 'object') {
    return {
      morning: { ...DEFAULT_DIET_MEAL_WINDOWS.morning, ...mealWindows.morning },
      afternoon: { ...DEFAULT_DIET_MEAL_WINDOWS.afternoon, ...mealWindows.afternoon },
      evening: { ...DEFAULT_DIET_MEAL_WINDOWS.evening, ...mealWindows.evening },
    };
  }
  return {
    morning: { ...DEFAULT_DIET_MEAL_WINDOWS.morning },
    afternoon: { ...DEFAULT_DIET_MEAL_WINDOWS.afternoon },
    evening: { ...DEFAULT_DIET_MEAL_WINDOWS.evening },
  };
}
