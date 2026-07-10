'use client';

import { useMemo, useState } from 'react';
import {
  DIET_SCORE_PART_MAX,
  NUTRITION_DB,
  buildDietTargetsFromProfile,
  computeDietScoreV2,
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
import { Badge } from '@/components/ui/badge';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MEAL_SLOTS: { value: MealSlot; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'unspecified', label: 'Other' },
];

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {Math.round(value)} / {Math.round(max)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MemberDietPanel() {
  const { client, userId, profile, gym, membership } = useMemberContext();
  const today = getTodayYmd();
  const dietLogQuery = useDietLog(client, userId, today);

  if (dietLogQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading today&apos;s diet log…</p>;
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
  const [waterAdd, setWaterAdd] = useState('250');
  const [customName, setCustomName] = useState('');
  const [customCal, setCustomCal] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const datesQuery = useDietLogDates(client, userId, 40);
  const historyQuery = useDietLogs(client, userId, 14);
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
    () => (foodQuery.trim().length >= 1 ? searchNutritionCatalog(foodQuery, 8) : []),
    [foodQuery],
  );
  const popular = useMemo(() => listPopularFoods(12), []);

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
  }

  function addWater() {
    const ml = Number(waterAdd) || 0;
    if (ml <= 0) return;
    setWaterLiters((prev) => Math.round((prev + ml / 1000) * 100) / 100);
  }

  function removeFood(index: number) {
    setFoods((prev) => prev.filter((_, i) => i !== index));
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save diet day.');
    }
  }

  const calMax = targets?.calMax || targets?.calorieCenter || 2000;
  const proteinMax = targets?.proteinMaxGrams || 120;
  const waterGoal = targets?.waterGoalLiters || 3;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Diet</h1>
        <p className="text-muted-foreground">
          Log meals and water for {today}. Score updates as you add foods.
        </p>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-card/40 p-5 lg:col-span-1">
              <p className="text-sm text-muted-foreground">Diet score</p>
              <p className="mt-2 text-5xl font-semibold tracking-tight">{score.score}</p>
              <Badge className="mt-2" variant="secondary">
                {score.label}
              </Badge>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                {(
                  [
                    ['protein', 'Protein'],
                    ['calories', 'Calories'],
                    ['timing', 'Timing'],
                    ['quality', 'Quality'],
                    ['consistency', 'Consistency'],
                    ['gym', 'Gym'],
                    ['hydration', 'Hydration'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span>{label}</span>
                    <span>
                      {score.parts[key]}/{DIET_SCORE_PART_MAX[key]}
                    </span>
                  </div>
                ))}
              </div>
              {score.feedback[0] ? (
                <p className="mt-4 text-sm text-muted-foreground">{score.feedback[0]}</p>
              ) : null}
            </div>

            <div className="space-y-4 rounded-xl border border-border/70 p-5 lg:col-span-2">
              <h2 className="font-medium">Today&apos;s nutrition</h2>
              <ProgressBar value={Number(totals.calories) || 0} max={calMax} label="Calories" />
              <ProgressBar value={Number(totals.protein) || 0} max={proteinMax} label="Protein (g)" />
              <ProgressBar value={waterLiters} max={waterGoal} label="Water (L)" />
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Carbs</p>
                  <p className="font-medium">{Math.round(Number(totals.carbs) || 0)} g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fat</p>
                  <p className="font-medium">{Math.round(Number(totals.fat) || 0)} g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gym today</p>
                  <p className="font-medium">{attendanceQuery.data ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-border/70 p-5">
              <h2 className="font-medium">Add food</h2>
              <Field>
                <FieldLabel>Meal slot</FieldLabel>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={mealSlot}
                  onChange={(e) => setMealSlot(e.target.value as MealSlot)}
                >
                  {MEAL_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel>Search catalog</FieldLabel>
                <Input
                  value={foodQuery}
                  onChange={(e) => setFoodQuery(e.target.value)}
                  placeholder="chicken, roti, paneer…"
                />
                <FieldDescription>Ported from the legacy nutrition database.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Grams</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                />
              </Field>
              {suggestions.length > 0 ? (
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2 text-sm">
                  {suggestions.map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        className="w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
                        onClick={() => addCatalogFood(item.key, item.label)}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {popular.map((item) => (
                    <Button
                      key={item.key}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addCatalogFood(item.key, item.label)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              )}

              <div className="border-t border-border/60 pt-4">
                <p className="mb-3 text-sm font-medium">Custom food</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Name" value={customName} onChange={(e) => setCustomName(e.target.value)} />
                  <Input placeholder="Calories" type="number" value={customCal} onChange={(e) => setCustomCal(e.target.value)} />
                  <Input placeholder="Protein g" type="number" value={customProtein} onChange={(e) => setCustomProtein(e.target.value)} />
                  <Input placeholder="Carbs g" type="number" value={customCarbs} onChange={(e) => setCustomCarbs(e.target.value)} />
                  <Input placeholder="Fat g" type="number" value={customFat} onChange={(e) => setCustomFat(e.target.value)} />
                </div>
                <Button type="button" variant="outline" className="mt-3" onClick={addCustomFood}>
                  Add custom
                </Button>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border/70 p-5">
              <h2 className="font-medium">Water</h2>
              <p className="text-3xl font-semibold">{waterLiters.toFixed(2)} L</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={50}
                  step={50}
                  value={waterAdd}
                  onChange={(e) => setWaterAdd(e.target.value)}
                  aria-label="Milliliters to add"
                />
                <Button type="button" onClick={addWater}>
                  Add ml
                </Button>
              </div>
              <FieldDescription>Goal about {waterGoal} L based on your profile targets.</FieldDescription>

              <h2 className="pt-4 font-medium">Food log ({foods.length})</h2>
              {foods.length === 0 ? (
                <p className="text-sm text-muted-foreground">No foods logged yet.</p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                  {foods.map((food, index) => (
                    <li
                      key={`${food.name}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/50 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">{food.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {food.mealSlot} · {Math.round(Number(food.calories) || 0)} kcal · P{' '}
                          {Math.round(Number(food.protein) || 0)}g
                          {food.junk ? ' · junk' : ''}
                        </p>
                      </div>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeFood(index)}>
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void handleSave()} disabled={saveDiet.isPending}>
              {saveDiet.isPending ? 'Saving…' : 'Save today'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFoods([]);
                setWaterLiters(0);
                setMessage(null);
                setError(null);
              }}
            >
              Clear local log
            </Button>
            {message ? (
              <p className="text-sm" role="status">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          {score.recommendation ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
              {score.recommendation}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {historyQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          ) : (historyQuery.data ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-sm text-muted-foreground">
              No saved diet days yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Fitness</TableHead>
                    <TableHead>Calories</TableHead>
                    <TableHead>Protein</TableHead>
                    <TableHead>Water</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(historyQuery.data ?? []).map((row) => {
                    const t = (row.totals ?? {}) as {
                      calories?: number;
                      protein?: number;
                      waterLiters?: number;
                    };
                    return (
                      <TableRow key={row.id}>
                        <TableCell>{row.log_date}</TableCell>
                        <TableCell>{row.diet_score}</TableCell>
                        <TableCell>{row.fitness_score}</TableCell>
                        <TableCell>{Math.round(Number(t.calories) || 0)}</TableCell>
                        <TableCell>{Math.round(Number(t.protein) || 0)} g</TableCell>
                        <TableCell>{Number(t.waterLiters) || 0} L</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
