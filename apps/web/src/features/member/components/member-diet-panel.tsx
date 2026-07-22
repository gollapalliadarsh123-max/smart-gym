'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Award,
  Droplets,
  Flame,
  Leaf,
  Minus,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Trophy,
  Utensils,
  X,
} from 'lucide-react';
import {
  DIET_SCORE_PART_MAX,
  NUTRITION_DB,
  addDaysToYmd,
  buildDietTargetsFromProfile,
  computeDietScoreV2,
  computeMealLogStreak,
  getDietConsistencyBonus,
  getTodayYmd,
  listPopularFoods,
  scaleNutritionEntry,
  searchNutritionCatalog,
  type DietFood,
  type MealSlot,
  type NutritionEntry,
} from '@smart-gym/shared';
import {
  profileToDietInput,
  totalsFromFoods,
  useDietLog,
  useDietLogDates,
  useDietLogs,
  useMemberAttendanceToday,
  useSaveDietDay,
} from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MEAL_UI: {
  value: MealSlot;
  label: string;
  emoji: string;
  emptyHint: string;
}[] = [
  {
    value: 'morning',
    label: 'Breakfast',
    emoji: '🌅',
    emptyHint: 'Start with breakfast to improve today’s nutrition score.',
  },
  {
    value: 'afternoon',
    label: 'Lunch',
    emoji: '☀',
    emptyHint: 'Add lunch to fuel your afternoon training.',
  },
  {
    value: 'evening',
    label: 'Snack',
    emoji: '🌇',
    emptyHint: 'A smart snack can steady energy and protein.',
  },
  {
    value: 'unspecified',
    label: 'Dinner',
    emoji: '🌙',
    emptyHint: 'Log dinner to complete your day.',
  },
];

const WATER_QUICK_ML = [250, 500, 750, 1000] as const;
const POPULAR_FOODS = listPopularFoods(12);

function foodLabel(key: string, entry?: NutritionEntry) {
  return entry?.label ?? key.replace(/_/g, ' ');
}

function getPer100Macros(entry: NutritionEntry) {
  if (entry.per100g) return entry.per100g;
  if (entry.perUnit) {
    const unitG = entry.perUnit.grams && entry.perUnit.grams > 0 ? entry.perUnit.grams : 100;
    const f = 100 / unitG;
    return {
      calories: Math.round(entry.perUnit.calories * f * 10) / 10,
      protein: Math.round(entry.perUnit.protein * f * 10) / 10,
      carbs: Math.round(entry.perUnit.carbs * f * 10) / 10,
      fat: Math.round(entry.perUnit.fat * f * 10) / 10,
    };
  }
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

type ChartRange = 'day' | 'week' | 'month';

function GlassCard({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        'rounded-[20px] border border-border/60 bg-card/80 shadow-[0_8px_28px_rgba(15,23,42,0.06)] backdrop-blur-md',
        'dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function foodEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('chicken')) return '🍗';
  if (n.includes('egg')) return '🥚';
  if (n.includes('fish') || n.includes('salmon') || n.includes('tuna')) return '🐟';
  if (n.includes('broccoli') || n.includes('spin')) return '🥦';
  if (n.includes('rice')) return '🍚';
  if (n.includes('banana')) return '🍌';
  if (n.includes('apple')) return '🍎';
  if (n.includes('paneer') || n.includes('cheese')) return '🧀';
  if (n.includes('milk') || n.includes('curd') || n.includes('yogurt')) return '🥛';
  if (n.includes('peanut') || n.includes('almond')) return '🥜';
  if (n.includes('roti') || n.includes('bread') || n.includes('oat')) return '🍞';
  if (n.includes('dal') || n.includes('lentil')) return '🍲';
  if (n.includes('whey') || n.includes('protein')) return '🥤';
  return '🥗';
}

function displayScoreLevel(label: string) {
  if (label === 'Poor') return 'Needs Improvement';
  return label;
}

function scoreMotivation(score: number, label: string) {
  if (score >= 90) return 'Outstanding day — keep this consistency.';
  if (score >= 75) return 'Keep eating protein-rich meals.';
  if (score >= 60) return 'Solid effort — small tweaks can lift your score.';
  if (score >= 40) return 'Add balanced meals and water to climb back up.';
  return label === 'Needs Improvement' || label === 'Poor'
    ? 'Start logging meals to build today’s nutrition score.'
    : 'Every log moves you forward.';
}

function CircularRing({
  value,
  max,
  size = 160,
  stroke = 10,
  label,
  sublabel,
  colorClass = 'stroke-emerald-500',
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label: string;
  sublabel?: string;
  colorClass?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = c * (1 - pct);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-muted"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={colorClass}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{label}</p>
        {sublabel ? <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p> : null}
      </div>
    </div>
  );
}

function MacroCard({
  title,
  value,
  target,
  unit,
  barClass,
  pctClass,
}: {
  title: string;
  value: number;
  target: number;
  unit: string;
  barClass: string;
  pctClass: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const remaining = Math.max(0, target - value);
  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className={cn('text-xs font-semibold tabular-nums', pctClass)}>{pct}%</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {Number.isInteger(value) || unit === 'L' ? (unit === 'L' ? value.toFixed(1) : Math.round(value)) : Math.round(value)}
        <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Goal {unit === 'L' ? target : Math.round(target)}
        {unit} · {unit === 'L' ? remaining.toFixed(1) : Math.round(remaining)}
        {unit} left
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn('h-full rounded-full', barClass)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </GlassCard>
  );
}

export function MemberDietPanel() {
  const { client, userId, profile, gym, membership } = useMemberContext();
  const today = getTodayYmd();
  const dietLogQuery = useDietLog(client, userId, today);

  if (dietLogQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-[20px] bg-muted" />
        <div className="h-32 animate-pulse rounded-[20px] bg-muted" />
      </div>
    );
  }

  const initialFoods = (dietLogQuery.data?.foods as DietFood[] | null) ?? [];
  const initialTotals = (dietLogQuery.data?.totals ?? {}) as { waterLiters?: number };

  return (
    <MemberDietEditor
      key={dietLogQuery.data?.id ?? `new-${today}`}
      initialFoods={initialFoods}
      initialWaterLiters={Number(initialTotals.waterLiters) || 0}
      today={today}
      client={client}
      userId={userId}
      profile={profile}
      gymId={gym?.id ?? membership?.gym_id ?? null}
    />
  );
}

function MemberDietEditor({
  initialFoods,
  initialWaterLiters,
  today,
  client,
  userId,
  profile,
  gymId,
}: {
  initialFoods: DietFood[];
  initialWaterLiters: number;
  today: string;
  client: ReturnType<typeof useMemberContext>['client'];
  userId: string | null;
  profile: ReturnType<typeof useMemberContext>['profile'];
  gymId: string | null;
}) {
  const [foods, setFoods] = useState<DietFood[]>(initialFoods);
  const [waterLiters, setWaterLiters] = useState(initialWaterLiters);
  const [mealSlot, setMealSlot] = useState<MealSlot>('morning');
  const [foodQuery, setFoodQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [portionGrams, setPortionGrams] = useState('100');
  const [addMode, setAddMode] = useState<'search' | 'custom'>('search');
  const [customName, setCustomName] = useState('');
  const [customCal, setCustomCal] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addPulse, setAddPulse] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCal, setEditCal] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [chartRange, setChartRange] = useState<ChartRange>('week');

  const datesQuery = useDietLogDates(client, userId, 60);
  const historyQuery = useDietLogs(client, userId, 40);
  const attendanceQuery = useMemberAttendanceToday(client, userId, today);
  const saveDiet = useSaveDietDay(client);

  const dietProfile = useMemo(
    () => (profile ? profileToDietInput(profile) : { bodyGoal: 'maintain' as const }),
    [profile],
  );
  const targets = useMemo(() => buildDietTargetsFromProfile(dietProfile), [dietProfile]);
  const totals = useMemo(() => totalsFromFoods(foods, waterLiters), [foods, waterLiters]);
  const loggedDates = datesQuery.data ?? [];
  const consistencyMeta = getDietConsistencyBonus(
    new Set(loggedDates),
    today,
    foods.length > 0,
  );
  const score = computeDietScoreV2({
    totals,
    targets,
    foods,
    attendedToday: Boolean(attendanceQuery.data),
    consistencyMeta,
    userData: dietProfile,
  });

  const calMax = targets?.calMax || targets?.calorieCenter || 2000;
  const proteinMax = targets?.proteinMaxGrams || 120;
  const waterGoal = targets?.waterGoalLiters || 3;
  const carbsTarget = Math.round((calMax * 0.45) / 4);
  const fatTarget = Math.round((calMax * 0.3) / 9);

  const level = displayScoreLevel(score.label);
  const motivation = score.feedback[0] || scoreMotivation(score.score, score.label);

  const foodsByMeal = useMemo(() => {
    const map: Record<MealSlot, DietFood[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      unspecified: [],
    };
    for (const f of foods) {
      const slot = (f.mealSlot || 'unspecified') as MealSlot;
      map[slot].push(f);
    }
    return map;
  }, [foods]);

  const mealCompletion = useMemo(() => {
    const filled = MEAL_UI.filter((m) => foodsByMeal[m.value].length > 0).length;
    return Math.round((filled / MEAL_UI.length) * 100);
  }, [foodsByMeal]);

  const overallCompletion = useMemo(() => {
    const calPct = calMax > 0 ? Math.min(1, Number(totals.calories) / calMax) : 0;
    const proPct = proteinMax > 0 ? Math.min(1, Number(totals.protein) / proteinMax) : 0;
    const watPct = waterGoal > 0 ? Math.min(1, waterLiters / waterGoal) : 0;
    const mealPct = mealCompletion / 100;
    return Math.round(((calPct + proPct + watPct + mealPct) / 4) * 100);
  }, [calMax, proteinMax, waterGoal, totals, waterLiters, mealCompletion]);

  const dietLogStreak = useMemo(
    () => computeMealLogStreak(new Set(loggedDates), today, foods.length > 0),
    [loggedDates, today, foods.length],
  );

  const waterStreak = useMemo(() => {
    const dates = new Set<string>();
    for (const row of historyQuery.data ?? []) {
      const t = (row.totals ?? {}) as { waterLiters?: number };
      if (Number(t.waterLiters) > 0) dates.add(row.log_date);
    }
    if (waterLiters > 0) dates.add(today);
    return computeMealLogStreak(dates, today, waterLiters > 0);
  }, [historyQuery.data, waterLiters, today]);

  const proteinStreak = useMemo(() => {
    const dates = new Set<string>();
    for (const row of historyQuery.data ?? []) {
      const t = (row.totals ?? {}) as { protein?: number };
      if (Number(t.protein) >= proteinMax * 0.8) dates.add(row.log_date);
    }
    if (Number(totals.protein) >= proteinMax * 0.8) dates.add(today);
    return computeMealLogStreak(
      dates,
      today,
      Number(totals.protein) >= proteinMax * 0.8,
    );
  }, [historyQuery.data, totals.protein, proteinMax, today]);

  const healthyMealStreak = useMemo(() => {
    const dates = new Set<string>();
    for (const row of historyQuery.data ?? []) {
      const list = (row.foods as DietFood[] | null) ?? [];
      if (list.length === 0) continue;
      const junk = list.filter((f) => f.junk).length;
      if (junk / list.length <= 0.25) dates.add(row.log_date);
    }
    if (foods.length > 0) {
      const junk = foods.filter((f) => f.junk).length;
      if (junk / foods.length <= 0.25) dates.add(today);
    }
    return computeMealLogStreak(
      dates,
      today,
      foods.length > 0 && foods.filter((f) => f.junk).length / foods.length <= 0.25,
    );
  }, [historyQuery.data, foods, today]);

  const insights = useMemo(() => {
    const items: { emoji: string; text: string; tone: string }[] = [];
    if (Number(totals.protein) < proteinMax * 0.7) {
      items.push({
        emoji: '🥩',
        text: 'Protein intake is below today’s target.',
        tone: 'border-amber-500/30 bg-amber-500/10',
      });
    } else {
      items.push({
        emoji: '💪',
        text: 'Protein looks on track for today.',
        tone: 'border-emerald-500/30 bg-emerald-500/10',
      });
    }
    if (waterLiters >= waterGoal * 0.9) {
      items.push({
        emoji: '💧',
        text: 'Great hydration today.',
        tone: 'border-sky-500/30 bg-sky-500/10',
      });
    } else {
      items.push({
        emoji: '🚰',
        text: 'Sip more water to hit your hydration goal.',
        tone: 'border-sky-500/20 bg-sky-500/5',
      });
    }
    const veg = foods.some((f) => {
      const n = (f.name || '').toLowerCase();
      return n.includes('broccoli') || n.includes('spin') || n.includes('salad') || n.includes('veg');
    });
    items.push(
      veg
        ? {
            emoji: '🥦',
            text: 'Nice vegetable coverage in today’s log.',
            tone: 'border-lime-500/30 bg-lime-500/10',
          }
        : {
            emoji: '🥗',
            text: 'Try adding more vegetables.',
            tone: 'border-lime-500/20 bg-lime-500/5',
          },
    );
    if (dietLogStreak >= 3) {
      items.push({
        emoji: '🔥',
        text: `Excellent consistency — ${dietLogStreak}-day logging streak.`,
        tone: 'border-orange-500/30 bg-orange-500/10',
      });
    } else if (score.recommendation) {
      items.push({
        emoji: '✨',
        text: score.recommendation,
        tone: 'border-border bg-muted/40',
      });
    }
    return items.slice(0, 4);
  }, [totals.protein, proteinMax, waterLiters, waterGoal, foods, dietLogStreak, score.recommendation]);

  const chartData = useMemo(() => {
    const history = historyQuery.data ?? [];
    const points: {
      key: string;
      label: string;
      calories: number;
      protein: number;
      water: number;
      score: number;
    }[] = [];

    if (chartRange === 'day') {
      return [
        {
          key: 'today',
          label: 'Today',
          calories: Number(totals.calories) || 0,
          protein: Number(totals.protein) || 0,
          water: waterLiters,
          score: score.score,
        },
      ];
    }

    const days = chartRange === 'week' ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const ymd = addDaysToYmd(today, -i);
      const row = history.find((r) => r.log_date === ymd);
      const t = (row?.totals ?? {}) as {
        calories?: number;
        protein?: number;
        waterLiters?: number;
      };
      const [y, m, d] = ymd.split('-').map(Number);
      const label =
        y && m && d
          ? new Date(y, m - 1, d).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })
          : ymd;
      const isToday = ymd === today;
      points.push({
        key: ymd,
        label,
        calories: isToday ? Number(totals.calories) || 0 : Number(t.calories) || 0,
        protein: isToday ? Number(totals.protein) || 0 : Number(t.protein) || 0,
        water: isToday ? waterLiters : Number(t.waterLiters) || 0,
        score: isToday ? score.score : Number(row?.diet_score) || 0,
      });
    }
    return points;
  }, [chartRange, historyQuery.data, today, totals, waterLiters, score.score]);

  function pulseSuccess() {
    setAddPulse(true);
    window.setTimeout(() => setAddPulse(false), 700);
  }

  const catalogHits = useMemo(
    () => (foodQuery.trim().length >= 1 ? searchNutritionCatalog(foodQuery, 8) : []),
    [foodQuery],
  );

  const selectedEntry = selectedKey ? NUTRITION_DB[selectedKey] : null;
  const selectedLabel = selectedKey ? foodLabel(selectedKey, selectedEntry ?? undefined) : '';
  const portionValue = Number(portionGrams);
  const hasValidPortion = Number.isFinite(portionValue) && portionValue > 0;
  const portionMacros =
    selectedEntry && hasValidPortion ? scaleNutritionEntry(selectedEntry, portionValue) : null;
  const servingGrams = selectedEntry?.perUnit?.grams;
  const portionChips = servingGrams
    ? [
        { label: '1 serve', value: servingGrams },
        { label: '2 serve', value: servingGrams * 2 },
        { label: '50g', value: 50 },
        { label: '100g', value: 100 },
        { label: '150g', value: 150 },
        { label: '200g', value: 200 },
      ]
    : [
        { label: '50g', value: 50 },
        { label: '100g', value: 100 },
        { label: '150g', value: 150 },
        { label: '200g', value: 200 },
        { label: '250g', value: 250 },
      ];

  function selectCatalogFood(key: string) {
    const entry = NUTRITION_DB[key];
    if (!entry) return;
    setSelectedKey(key);
    setFoodQuery(foodLabel(key, entry));
    setPortionGrams(
      entry.perUnit?.grams && entry.perUnit.grams > 0 ? String(entry.perUnit.grams) : '100',
    );
    setAddMode('search');
    setError(null);
  }

  function clearSelectedFood() {
    setSelectedKey(null);
    setFoodQuery('');
    setPortionGrams('100');
  }

  function adjustPortion(delta: number) {
    setPortionGrams((prev) => {
      const current = Number(prev);
      const base = Number.isFinite(current) && current > 0 ? current : 100;
      return String(Math.max(1, Math.round(base + delta)));
    });
  }

  function addCatalogFood() {
    if (!selectedKey || !selectedEntry || !portionMacros || !hasValidPortion) {
      setError('Search and choose a food, then set how many grams you ate.');
      return;
    }
    setFoods((prev) => [
      ...prev,
      {
        name: selectedLabel,
        calories: portionMacros.calories,
        protein: portionMacros.protein,
        carbs: portionMacros.carbs,
        fat: portionMacros.fat,
        junk: portionMacros.junk,
        neutral: portionMacros.neutral,
        mealSlot,
        loggedAt: new Date().toISOString(),
      },
    ]);
    clearSelectedFood();
    setError(null);
    setMessage(`Added ${portionValue}g ${selectedLabel}`);
    pulseSuccess();
    window.setTimeout(() => setMessage(null), 3500);
  }

  function startCustomizeFromCatalog() {
    if (!selectedKey || !selectedEntry) return;
    const macros = hasValidPortion
      ? scaleNutritionEntry(selectedEntry, portionValue)
      : getPer100Macros(selectedEntry);
    setCustomName(selectedLabel);
    setCustomCal(String(Math.round(macros.calories)));
    setCustomProtein(String(Math.round(macros.protein * 10) / 10));
    setCustomCarbs(String(Math.round(macros.carbs * 10) / 10));
    setCustomFat(String(Math.round(macros.fat * 10) / 10));
    setAddMode('custom');
  }

  function addCustomFood() {
    const name = customName.trim();
    if (!name) {
      setError('Enter a food name.');
      return;
    }
    setFoods((prev) => [
      ...prev,
      {
        name,
        calories: Number(customCal) || 0,
        protein: Number(customProtein) || 0,
        carbs: Number(customCarbs) || 0,
        fat: Number(customFat) || 0,
        mealSlot,
        loggedAt: new Date().toISOString(),
      },
    ]);
    setCustomName('');
    setCustomCal('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    clearSelectedFood();
    setAddMode('search');
    setError(null);
    setMessage(`Added ${name}`);
    pulseSuccess();
    window.setTimeout(() => setMessage(null), 3500);
  }

  function addWaterMl(ml: number) {
    if (ml <= 0) return;
    setWaterLiters((prev) => Math.round((prev + ml / 1000) * 100) / 100);
    pulseSuccess();
  }

  function removeFood(index: number) {
    setFoods((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function startEdit(index: number) {
    const food = foods[index];
    if (!food) return;
    setEditingIndex(index);
    setEditName(food.name ?? '');
    setEditCal(String(food.calories ?? ''));
    setEditProtein(String(food.protein ?? ''));
  }

  function applyEdit() {
    if (editingIndex == null) return;
    setFoods((prev) =>
      prev.map((f, i) =>
        i === editingIndex
          ? {
              ...f,
              name: editName.trim() || f.name,
              calories: Number(editCal) || 0,
              protein: Number(editProtein) || 0,
            }
          : f,
      ),
    );
    setEditingIndex(null);
  }

  async function handleSave() {
    if (!userId) return;
    if (foods.length === 0 && waterLiters <= 0) {
      setError('Add at least one food or water entry before saving.');
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const result = await saveDiet.mutateAsync({
        userId,
        gymId,
        logDate: today,
        foods,
        totals,
        profile: dietProfile,
        attendedToday: Boolean(attendanceQuery.data),
        loggedDatesLast21Days: loggedDates,
        hasEntriesToday: foods.length > 0,
      });
      setMessage(
        `Saved · diet score ${result.score.score} · fitness ${result.fitnessScore} · best streak ${result.streak.best_meal_log_streak}`,
      );
      pulseSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save diet day.');
    }
  }

  const waterMilestone =
    waterLiters >= waterGoal
      ? 'Hydration goal crushed 💧'
      : waterLiters >= waterGoal * 0.75
        ? 'Almost there — great sipping!'
        : waterLiters >= waterGoal * 0.5
          ? 'Halfway to your water goal'
          : null;

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [message]);

  return (
    <motion.div
      className="mx-auto w-full max-w-6xl space-y-6 pb-8 sm:space-y-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Diet</h1>
        <p className="text-sm text-muted-foreground">
          Premium nutrition dashboard for {today}
        </p>
      </header>

      <AnimatePresence>
        {message ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[20px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-200"
            role="status"
          >
            {message}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Hero */}
      <div className="grid gap-4 lg:grid-cols-5">
        <GlassCard className="relative overflow-hidden p-6 lg:col-span-2">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-teal-500/10"
            aria-hidden
          />
          <div className="relative flex flex-col items-center text-center">
            <p className="text-sm font-medium tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
              🥗 Today&apos;s Nutrition Score
            </p>
            <div className="mt-4">
              <CircularRing
                value={score.score}
                max={100}
                label={`${score.score}`}
                sublabel="/ 100"
                size={168}
              />
            </div>
            <p className="mt-4 text-lg font-semibold">{level}</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">{motivation}</p>
            <div className="mt-4 grid w-full grid-cols-2 gap-2 text-left text-xs text-muted-foreground sm:grid-cols-3">
              {(
                [
                  ['protein', 'Protein'],
                  ['calories', 'Calories'],
                  ['timing', 'Timing'],
                  ['quality', 'Quality'],
                  ['consistency', 'Consistency'],
                  ['hydration', 'Hydration'],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="rounded-xl border border-border/50 bg-background/40 px-2.5 py-2"
                >
                  <p>{label}</p>
                  <p className="font-semibold text-foreground">
                    {score.parts[key]}/{DIET_SCORE_PART_MAX[key]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-2 xl:grid-cols-3">
          <MacroCard
            title="Calories"
            value={Number(totals.calories) || 0}
            target={calMax}
            unit="kcal"
            barClass="bg-orange-500"
            pctClass="text-orange-500"
          />
          <MacroCard
            title="Protein"
            value={Number(totals.protein) || 0}
            target={proteinMax}
            unit="g"
            barClass="bg-emerald-500"
            pctClass="text-emerald-500"
          />
          <MacroCard
            title="Carbs"
            value={Number(totals.carbs) || 0}
            target={carbsTarget}
            unit="g"
            barClass="bg-amber-500"
            pctClass="text-amber-500"
          />
          <MacroCard
            title="Fat"
            value={Number(totals.fat) || 0}
            target={fatTarget}
            unit="g"
            barClass="bg-rose-400"
            pctClass="text-rose-400"
          />
          <MacroCard
            title="Water"
            value={waterLiters}
            target={waterGoal}
            unit="L"
            barClass="bg-sky-500"
            pctClass="text-sky-500"
          />
          <GlassCard className="flex flex-col justify-center p-4 sm:p-5">
            <p className="text-sm font-medium text-muted-foreground">Overall completion</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{overallCompletion}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                initial={{ width: 0 }}
                animate={{ width: `${overallCompletion}%` }}
              />
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Add food */}
        <div className="space-y-4 lg:col-span-3">
          <GlassCard id="add-food" className="scroll-mt-24 p-5 sm:p-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Add Food</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Search the catalog or enter your own macros.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Meal">
              {MEAL_UI.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMealSlot(m.value)}
                  className={cn(
                    'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors',
                    mealSlot === m.value
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                      : 'border-border/70 bg-background/50 hover:bg-muted/50',
                  )}
                >
                  <span aria-hidden>{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddMode('search');
                  setError(null);
                }}
                className={cn(
                  'min-h-10 flex-1 rounded-2xl border text-sm font-semibold transition-colors',
                  addMode === 'search'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                    : 'border-border hover:bg-muted/40',
                )}
              >
                Search catalog
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddMode('custom');
                  setError(null);
                }}
                className={cn(
                  'min-h-10 flex-1 rounded-2xl border text-sm font-semibold transition-colors',
                  addMode === 'custom'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                    : 'border-border hover:bg-muted/40',
                )}
              >
                Custom food
              </button>
            </div>

            {addMode === 'search' ? (
              <div className="mt-4 space-y-4">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={foodQuery}
                    onChange={(e) => {
                      setFoodQuery(e.target.value);
                      setSelectedKey(null);
                    }}
                    placeholder="Search chicken, rice, egg…"
                    className="min-h-12 rounded-2xl pl-10"
                    aria-label="Search foods"
                    autoComplete="off"
                  />
                  {foodQuery || selectedKey ? (
                    <button
                      type="button"
                      className="absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                      aria-label="Clear search"
                      onClick={clearSelectedFood}
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </div>

                {!selectedKey && foodQuery.trim().length === 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Popular
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_FOODS.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => selectCatalogFood(item.key)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border/70 bg-background/50 px-3 text-sm font-medium capitalize transition-colors hover:border-emerald-400 hover:bg-emerald-500/10"
                        >
                          <span aria-hidden>{foodEmoji(item.label)}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!selectedKey && catalogHits.length > 0 ? (
                  <ul className="max-h-56 overflow-y-auto rounded-2xl border border-border/70 divide-y divide-border/60">
                    {catalogHits.map((hit) => {
                      const per100 = getPer100Macros(hit.entry);
                      return (
                        <li key={hit.key}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/50"
                            onClick={() => selectCatalogFood(hit.key)}
                          >
                            <span
                              className="flex size-10 items-center justify-center rounded-xl bg-muted text-lg"
                              aria-hidden
                            >
                              {foodEmoji(hit.label)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium capitalize">
                                {hit.label}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {Math.round(per100.calories)} kcal · {Math.round(per100.protein)}g
                                protein / 100g
                              </span>
                            </span>
                            <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {!selectedKey && foodQuery.trim().length >= 2 && catalogHits.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-5 text-center">
                    <p className="text-sm font-medium">No catalog match</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Switch to Custom food and enter macros yourself.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 min-h-10 rounded-2xl"
                      onClick={() => {
                        setCustomName(foodQuery.trim());
                        setAddMode('custom');
                      }}
                    >
                      Create custom food
                    </Button>
                  </div>
                ) : null}

                {selectedKey && selectedEntry ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold capitalize">
                          <span aria-hidden>{foodEmoji(selectedLabel)} </span>
                          {selectedLabel}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {servingGrams
                            ? `1 serving ≈ ${servingGrams}g`
                            : 'Macros scale with grams'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="min-h-10 min-w-10"
                        aria-label="Clear selected food"
                        onClick={clearSelectedFood}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>

                    <p className="mt-4 text-sm font-medium">How much did you eat?</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-12 min-w-12 rounded-2xl"
                        aria-label="Decrease 10 grams"
                        onClick={() => adjustPortion(-10)}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        inputMode="decimal"
                        className="min-h-12 flex-1 rounded-2xl text-center text-xl font-semibold"
                        value={portionGrams}
                        onChange={(e) => setPortionGrams(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCatalogFood();
                          }
                        }}
                        aria-label="Portion in grams"
                      />
                      <span className="text-sm font-medium text-muted-foreground">g</span>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-12 min-w-12 rounded-2xl"
                        aria-label="Increase 10 grams"
                        onClick={() => adjustPortion(10)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {portionChips.map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          className={cn(
                            'min-h-9 rounded-full border px-3 text-sm font-semibold',
                            Number(portionGrams) === chip.value
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                              : 'border-border hover:bg-muted',
                          )}
                          onClick={() => setPortionGrams(String(chip.value))}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl border border-border/60 bg-background/50 p-3 text-center">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Calories</p>
                        <p className="font-semibold tabular-nums">
                          {portionMacros ? Math.round(portionMacros.calories) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Protein</p>
                        <p className="font-semibold tabular-nums">
                          {portionMacros
                            ? `${Math.round(portionMacros.protein * 10) / 10}g`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Carbs</p>
                        <p className="font-semibold tabular-nums">
                          {portionMacros ? `${Math.round(portionMacros.carbs * 10) / 10}g` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Fat</p>
                        <p className="font-semibold tabular-nums">
                          {portionMacros ? `${Math.round(portionMacros.fat * 10) / 10}g` : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        className="min-h-12 flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                        disabled={!hasValidPortion}
                        onClick={addCatalogFood}
                      >
                        <Plus className="size-4" />
                        Add to {MEAL_UI.find((m) => m.value === mealSlot)?.label ?? 'meal'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-12 rounded-2xl"
                        onClick={startCustomizeFromCatalog}
                      >
                        Customize macros
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use this for homemade meals, restaurant dishes, or any food not in the catalog.
                </p>
                <Input
                  placeholder="Food name"
                  className="min-h-12 rounded-2xl"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Input
                    placeholder="Calories"
                    type="number"
                    className="min-h-11 rounded-2xl"
                    value={customCal}
                    onChange={(e) => setCustomCal(e.target.value)}
                    aria-label="Calories"
                  />
                  <Input
                    placeholder="Protein (g)"
                    type="number"
                    className="min-h-11 rounded-2xl"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    aria-label="Protein grams"
                  />
                  <Input
                    placeholder="Carbs (g)"
                    type="number"
                    className="min-h-11 rounded-2xl"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                    aria-label="Carbs grams"
                  />
                  <Input
                    placeholder="Fat (g)"
                    type="number"
                    className="min-h-11 rounded-2xl"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    aria-label="Fat grams"
                  />
                </div>
                <Button
                  type="button"
                  className="min-h-12 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                  onClick={addCustomFood}
                >
                  <Plus className="size-4" />
                  Add custom to {MEAL_UI.find((m) => m.value === mealSlot)?.label ?? 'meal'}
                </Button>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Water + progress + insights */}
        <div className="space-y-4 lg:col-span-2">
          <GlassCard className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Water Tracker</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Goal {waterGoal} L</p>
              </div>
              <Droplets className="size-5 text-sky-500" aria-hidden />
            </div>
            <div className="mt-4 flex justify-center">
              <CircularRing
                value={waterLiters}
                max={waterGoal}
                label={`${waterLiters.toFixed(1)}L`}
                sublabel={`of ${waterGoal}L`}
                size={140}
                colorClass="stroke-sky-500"
              />
            </div>
            {waterMilestone ? (
              <p className="mt-3 text-center text-sm font-medium text-sky-600 dark:text-sky-300">
                {waterMilestone}
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {WATER_QUICK_ML.map((ml) => (
                <Button
                  key={ml}
                  type="button"
                  variant="outline"
                  className="min-h-12 rounded-2xl"
                  onClick={() => addWaterMl(ml)}
                >
                  +{ml >= 1000 ? '1 L' : `${ml} ml`}
                </Button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <h2 className="text-base font-semibold tracking-tight">Daily Progress</h2>
            <div className="mt-4 space-y-3">
              {[
                {
                  label: 'Protein goal',
                  pct: proteinMax > 0 ? Math.min(100, (Number(totals.protein) / proteinMax) * 100) : 0,
                  color: 'bg-emerald-500',
                },
                {
                  label: 'Calories goal',
                  pct: calMax > 0 ? Math.min(100, (Number(totals.calories) / calMax) * 100) : 0,
                  color: 'bg-orange-500',
                },
                {
                  label: 'Water goal',
                  pct: waterGoal > 0 ? Math.min(100, (waterLiters / waterGoal) * 100) : 0,
                  color: 'bg-sky-500',
                },
                {
                  label: 'Meal completion',
                  pct: mealCompletion,
                  color: 'bg-violet-500',
                },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold tabular-nums">{Math.round(row.pct)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className={cn('h-full rounded-full', row.color)}
                      initial={{ width: 0 }}
                      animate={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <h2 className="text-base font-semibold tracking-tight">Nutrition Insights</h2>
            <ul className="mt-3 space-y-2">
              {insights.map((item) => (
                <li
                  key={item.text}
                  className={cn('rounded-2xl border px-3 py-2.5 text-sm', item.tone)}
                >
                  <span className="mr-2" aria-hidden>
                    {item.emoji}
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <h2 className="text-base font-semibold tracking-tight">Streaks & Achievements</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'Diet log', value: dietLogStreak, icon: Flame },
                { label: 'Water', value: waterStreak, icon: Droplets },
                { label: 'Protein goal', value: proteinStreak, icon: Trophy },
                { label: 'Healthy meals', value: healthyMealStreak, icon: Leaf },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-border/60 bg-background/40 p-3"
                  >
                    <Icon className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <p className="mt-2 text-2xl font-semibold tabular-nums">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label} streak</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                  dietLogStreak >= 1
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground grayscale',
                )}
              >
                <Award className="size-3.5" /> First log
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                  dietLogStreak >= 7
                    ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
                    : 'bg-muted text-muted-foreground grayscale',
                )}
              >
                <Flame className="size-3.5" /> 7-day streak
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                  waterLiters >= waterGoal
                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                    : 'bg-muted text-muted-foreground grayscale',
                )}
              >
                <Droplets className="size-3.5" /> Water goal
              </span>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Charts */}
      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Weekly Nutrition Chart</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Calories, protein, water, and diet score
            </p>
          </div>
          <div className="inline-flex rounded-full bg-muted p-1" role="tablist">
            {(['day', 'week', 'month'] as ChartRange[]).map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={chartRange === r}
                onClick={() => setChartRange(r)}
                className={cn(
                  'min-h-9 rounded-full px-3.5 text-sm font-semibold capitalize',
                  chartRange === r
                    ? 'bg-background text-emerald-700 shadow-sm dark:text-emerald-300'
                    : 'text-muted-foreground',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dietCalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415533" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} width={36} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                }}
              />
              <Area
                type="monotone"
                dataKey="calories"
                stroke="#f97316"
                fill="url(#dietCalFill)"
                strokeWidth={2}
                name="Calories"
              />
              <Area
                type="monotone"
                dataKey="protein"
                stroke="#10b981"
                fill="transparent"
                strokeWidth={2}
                name="Protein"
              />
              <Area
                type="monotone"
                dataKey="water"
                stroke="#0ea5e9"
                fill="transparent"
                strokeWidth={2}
                name="Water (L)"
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#8b5cf6"
                fill="transparent"
                strokeWidth={2}
                name="Score"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Full food log cards */}
      <section aria-label="Food log">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Food Log</h2>
            <p className="text-sm text-muted-foreground">{foods.length} items today</p>
          </div>
        </div>
        {foods.length === 0 ? (
          <GlassCard className="flex flex-col items-center px-6 py-14 text-center">
            <Utensils className="size-10 text-muted-foreground/40" aria-hidden />
            <p className="mt-4 text-base font-semibold">No meals logged yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Start with breakfast to improve today&apos;s nutrition score.
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {foods.map((food, index) => (
              <GlassCard key={`${food.name}-${index}`} className="p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-12 items-center justify-center rounded-2xl bg-muted text-2xl"
                    aria-hidden
                  >
                    {foodEmoji(food.name || '')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{food.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {MEAL_UI.find((m) => m.value === food.mealSlot)?.label ||
                        food.mealSlot ||
                        'Meal'}{' '}
                      · {Math.round(Number(food.calories) || 0)} kcal · P{' '}
                      {Math.round(Number(food.protein) || 0)}g
                      {food.loggedAt
                        ? ` · ${new Date(food.loggedAt).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}`
                        : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="min-h-10 min-w-10"
                    onClick={() => startEdit(index)}
                    aria-label="Edit"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="min-h-10 min-w-10"
                    onClick={() => removeFood(index)}
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {/* Save bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="min-h-12 rounded-2xl bg-emerald-600 px-6 hover:bg-emerald-700"
          onClick={() => void handleSave()}
          disabled={saveDiet.isPending}
        >
          <Save className="size-4" />
          {saveDiet.isPending ? 'Saving…' : 'Save today'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-12 rounded-2xl"
          onClick={() => {
            setFoods([]);
            setWaterLiters(0);
            setMessage(null);
            setError(null);
          }}
        >
          Clear local log
        </Button>
        <AnimatePresence>
          {message ? (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
              role="status"
            >
              {message}
            </motion.p>
          ) : null}
        </AnimatePresence>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {addPulse ? (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-sm font-medium text-emerald-600"
          >
            Added ✓
          </motion.span>
        ) : null}
      </div>

      {/* Edit drawer portaled so it isn't clipped by motion transforms */}
      {typeof document !== 'undefined' && editingIndex != null
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
              <button
                type="button"
                className="absolute inset-0 bg-slate-950/50"
                aria-label="Close"
                onClick={() => setEditingIndex(null)}
              />
              <GlassCard className="relative z-10 m-4 w-full max-w-md p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Edit food</h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="min-h-11 min-w-11"
                    onClick={() => setEditingIndex(null)}
                    aria-label="Close"
                  >
                    <X className="size-5" />
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  <Input
                    className="min-h-12 rounded-2xl"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Food name"
                  />
                  <Input
                    type="number"
                    className="min-h-12 rounded-2xl"
                    value={editCal}
                    onChange={(e) => setEditCal(e.target.value)}
                    aria-label="Calories"
                  />
                  <Input
                    type="number"
                    className="min-h-12 rounded-2xl"
                    value={editProtein}
                    onChange={(e) => setEditProtein(e.target.value)}
                    aria-label="Protein"
                  />
                  <Button
                    className="min-h-12 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                    onClick={applyEdit}
                  >
                    Save changes
                  </Button>
                </div>
              </GlassCard>
            </div>,
            document.body,
          )
        : null}
    </motion.div>
  );
}
