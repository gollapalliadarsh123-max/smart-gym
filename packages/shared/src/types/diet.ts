export type BodyGoal = 'lose' | 'maintain' | 'gain';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type MealSlot = 'morning' | 'afternoon' | 'evening' | 'unspecified';

export interface MealWindow {
  start: string;
  end: string;
}

export type MealWindows = Record<'morning' | 'afternoon' | 'evening', MealWindow>;

export interface DietFood {
  name?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  junk?: boolean;
  neutral?: boolean;
  mealSlot?: MealSlot;
  loggedAt?: string;
}

export interface DietTotals {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  waterLiters?: number;
}

export interface DietTargets {
  calMin: number;
  calMax: number;
  calorieCenter: number;
  tdee: number | null;
  proteinMinGrams: number;
  proteinMaxGrams: number;
  waterGoalLiters: number;
  isManual: boolean;
  manualProteinTarget?: number;
  manualCalorieTarget?: number;
  manualWaterTarget?: number;
}

export interface DietConsistencyMeta {
  bonus: number;
  daysHit: number;
}

export interface DietScoreParts {
  protein: number;
  calories: number;
  timing: number;
  quality: number;
  consistency: number;
  gym: number;
  hydration: number;
}

export interface DietScoreResult {
  score: number;
  label: string;
  parts: DietScoreParts;
  feedback: string[];
  recommendation: string;
}

export interface ProfileDietInput {
  dob?: string;
  gender?: string;
  weightKg?: number;
  heightCm?: number;
  activityLevel?: ActivityLevel;
  bodyGoal?: BodyGoal;
  manualDietGoalsEnabled?: boolean;
  manualProteinGoalG?: number;
  manualCalorieGoal?: number;
  manualWaterGoalL?: number;
  dietMealWindows?: Partial<MealWindows>;
}
