'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  resolveFoodKey,
  scaleNutritionEntry,
  searchNutritionCatalog,
  type DietFood,
  type MealSlot,
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
import { Field, FieldLabel } from '@/components/ui/field';
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
    label: 'Evening Snack',
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

const QUICK_FOODS: { key: string; label: string; emoji: string }[] = [
  { key: 'chicken', label: 'Chicken', emoji: '🍗' },
  { key: 'egg', label: 'Eggs', emoji: '🥚' },
  { key: 'rice', label: 'Rice', emoji: '🍚' },
  { key: 'milk', label: 'Milk', emoji: '🥛' },
  { key: 'peanut_butter', label: 'Peanut Butter', emoji: '🥜' },
  { key: 'apple', label: 'Apple', emoji: '🍎' },
  { key: 'broccoli', label: 'Broccoli', emoji: '🥦' },
  { key: 'fish', label: 'Fish', emoji: '🐟' },
  { key: 'banana', label: 'Banana', emoji: '🍌' },
  { key: 'paneer', label: 'Paneer', emoji: '🧀' },
];

const WATER_QUICK_ML = [250, 500, 750, 1000] as const;

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
  const [grams, setGrams] = useState('100');
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
  const [composeOpen, setComposeOpen] = useState(false);

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

  const suggestions = useMemo(
    () => (foodQuery.trim().length >= 1 ? searchNutritionCatalog(foodQuery, 10) : []),
    [foodQuery],
  );
  const popular = useMemo(() => listPopularFoods(12), []);

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

  const recentFoodNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of foods) {
      if (!f.name) continue;
      counts.set(f.name, (counts.get(f.name) ?? 0) + 1);
    }
    for (const row of historyQuery.data ?? []) {
      const list = (row.foods as DietFood[] | null) ?? [];
      for (const f of list) {
        if (!f.name) continue;
        counts.set(f.name, (counts.get(f.name) ?? 0) + 2);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);
  }, [foods, historyQuery.data]);

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

  function addCatalogFood(key: string, label: string) {
    const resolvedKey = resolveFoodKey(key) ?? resolveFoodKey(label) ?? key;
    const entry = NUTRITION_DB[resolvedKey];
    if (!entry) {
      setError('Food not found in catalog.');
      return;
    }
    const g = Number(grams) || 100;
    const macros = scaleNutritionEntry(entry, g);
    const item: DietFood = {
      name: label,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      junk: macros.junk,
      neutral: macros.neutral,
      mealSlot,
      loggedAt: new Date().toISOString(),
    };
    setFoods((prev) => [...prev, item]);
    setFoodQuery('');
    setError(null);
    pulseSuccess();
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
    setError(null);
    pulseSuccess();
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

  const availableQuick = QUICK_FOODS.filter(
    (f) => NUTRITION_DB[f.key] || resolveFoodKey(f.key),
  );

  return (
    <motion.div
      className="mx-auto w-full max-w-6xl space-y-6 pb-24 sm:space-y-8 lg:pb-8"
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
        {/* Meal timeline + add food */}
        <div className="space-y-4 lg:col-span-3">
          <GlassCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Meal Timeline</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Visual meal log · select a meal then add foods
                </p>
              </div>
              <select
                className="min-h-11 rounded-2xl border border-input bg-background px-3 text-sm"
                value={mealSlot}
                onChange={(e) => setMealSlot(e.target.value as MealSlot)}
                aria-label="Active meal slot"
              >
                {MEAL_UI.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.emoji} {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 space-y-3">
              {MEAL_UI.map((meal) => {
                const list = foodsByMeal[meal.value];
                const mealCals = list.reduce((s, f) => s + Number(f.calories || 0), 0);
                const mealPro = list.reduce((s, f) => s + Number(f.protein || 0), 0);
                const active = mealSlot === meal.value;
                return (
                  <button
                    key={meal.value}
                    type="button"
                    onClick={() => setMealSlot(meal.value)}
                    className={cn(
                      'w-full rounded-[20px] border p-4 text-left transition-colors',
                      active
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-border/60 bg-background/30 hover:bg-muted/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          <span className="mr-2" aria-hidden>
                            {meal.emoji}
                          </span>
                          {meal.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {list.length === 0
                            ? meal.emptyHint
                            : `${Math.round(mealCals)} kcal · ${Math.round(mealPro)}g protein`}
                        </p>
                      </div>
                      {list.length > 0 ? (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          {list.length}
                        </span>
                      ) : null}
                    </div>
                    {list.length > 0 ? (
                      <ul className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                        {list.map((food) => {
                          const globalIndex = foods.indexOf(food);
                          return (
                            <li
                              key={`${food.name}-${globalIndex}`}
                              className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-3 py-2"
                            >
                              <span
                                className="flex size-10 items-center justify-center rounded-xl bg-muted text-lg"
                                aria-hidden
                              >
                                {foodEmoji(food.name || '')}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{food.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {Math.round(Number(food.calories) || 0)} kcal · P{' '}
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
                                aria-label={`Edit ${food.name}`}
                                onClick={() => startEdit(globalIndex)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="min-h-10 min-w-10"
                                aria-label={`Remove ${food.name}`}
                                onClick={() => removeFood(globalIndex)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        No meals logged yet — tap to select, then add food.
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard id="add-food" className="scroll-mt-24 p-5 sm:p-6">
            <h2 className="text-base font-semibold tracking-tight">Add Food</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Search catalog, quick-add favorites, or custom macros
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {availableQuick.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => addCatalogFood(item.key, item.label)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border/70 bg-background/50 px-3 text-sm font-semibold transition-colors hover:border-emerald-400 hover:bg-emerald-500/10"
                >
                  <span aria-hidden>{item.emoji}</span>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={foodQuery}
                  onChange={(e) => setFoodQuery(e.target.value)}
                  placeholder="Search chicken, roti, paneer…"
                  className="min-h-12 rounded-2xl pl-10"
                  aria-label="Search foods"
                />
              </label>
              <Field>
                <FieldLabel className="sr-only">Grams</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  className="min-h-12 rounded-2xl"
                  aria-label="Grams"
                  placeholder="Grams"
                />
              </Field>
            </div>

            {suggestions.length > 0 ? (
              <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-border/60 p-2">
                {suggestions.map((item) => {
                  const macros = scaleNutritionEntry(item.entry, Number(grams) || 100);
                  const frequent = recentFoodNames.some(
                    (n) => n.toLowerCase() === item.label.toLowerCase(),
                  );
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-muted',
                          frequent && 'bg-emerald-500/5',
                        )}
                        onClick={() => addCatalogFood(item.key, item.label)}
                      >
                        <span
                          className="flex size-10 items-center justify-center rounded-xl bg-muted text-lg"
                          aria-hidden
                        >
                          {foodEmoji(item.label)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium">{item.label}</span>
                            {frequent ? (
                              <span className="rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                Frequent
                              </span>
                            ) : null}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(macros.calories)} kcal · P {Math.round(macros.protein)}g · C{' '}
                            {Math.round(macros.carbs)}g · F {Math.round(macros.fat)}g
                          </span>
                        </span>
                        <Plus className="size-4 text-muted-foreground" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : foodQuery.trim().length === 0 ? (
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Popular
                </p>
                <div className="flex flex-wrap gap-2">
                  {popular.map((item) => (
                    <Button
                      key={item.key}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-10 rounded-full"
                      onClick={() => addCatalogFood(item.key, item.label)}
                    >
                      <span aria-hidden>{foodEmoji(item.label)}</span>
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {recentFoodNames.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Recent / frequent
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentFoodNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 text-sm font-medium"
                      onClick={() => {
                        const key = resolveFoodKey(name);
                        if (key) addCatalogFood(key, name);
                        else {
                          setCustomName(name);
                          setComposeOpen(true);
                        }
                      }}
                    >
                      <span aria-hidden>{foodEmoji(name)}</span>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 border-t border-border/60 pt-4">
              <button
                type="button"
                className="text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                onClick={() => setComposeOpen((v) => !v)}
              >
                {composeOpen ? 'Hide custom food' : 'Add custom food'}
              </button>
              {composeOpen ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Name"
                    className="min-h-11 rounded-2xl"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                  <Input
                    placeholder="Calories"
                    type="number"
                    className="min-h-11 rounded-2xl"
                    value={customCal}
                    onChange={(e) => setCustomCal(e.target.value)}
                  />
                  <Input
                    placeholder="Protein g"
                    type="number"
                    className="min-h-11 rounded-2xl"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                  />
                  <Input
                    placeholder="Carbs g"
                    type="number"
                    className="min-h-11 rounded-2xl"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                  />
                  <Input
                    placeholder="Fat g"
                    type="number"
                    className="min-h-11 rounded-2xl"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 rounded-2xl"
                    onClick={addCustomFood}
                  >
                    Add custom
                  </Button>
                </div>
              ) : null}
            </div>
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

      {/* History strip */}
      <GlassCard className="p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight">History</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Recently saved diet days</p>
        {historyQuery.isLoading ? (
          <div className="mt-4 h-20 animate-pulse rounded-2xl bg-muted" />
        ) : (historyQuery.data ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No saved diet days yet.</p>
        ) : (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {(historyQuery.data ?? []).slice(0, 14).map((row) => {
              const t = (row.totals ?? {}) as {
                calories?: number;
                protein?: number;
                waterLiters?: number;
              };
              return (
                <div
                  key={row.id}
                  className="min-w-[140px] rounded-2xl border border-border/60 bg-background/40 p-3"
                >
                  <p className="text-xs font-medium text-muted-foreground">{row.log_date}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{row.diet_score}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(Number(t.calories) || 0)} kcal · {Math.round(Number(t.protein) || 0)}p
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

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

      {/* Sticky mobile add */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border/80 bg-background/90 p-3 backdrop-blur lg:hidden">
        <Button
          className="min-h-12 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
          onClick={() => {
            document.getElementById('add-food')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <Plus className="size-4" />
          Add Food
        </Button>
      </div>

      {/* Edit drawer */}
      {editingIndex != null ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
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
        </div>
      ) : null}
    </motion.div>
  );
}
