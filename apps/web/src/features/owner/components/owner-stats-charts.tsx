'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { addDaysToYmd, getTodayYmd } from '@smart-gym/shared';
import {
  useGymAttendanceHistory,
  useGymPayments,
  type TypedSupabaseClient,
} from '@smart-gym/supabase';
import { cn } from '@/lib/utils';
import {
  buildDayAttendanceSeries,
  buildDayIncomeSeries,
  buildWeekAttendanceSeries,
  buildWeekIncomeSeries,
  buildYearAttendanceSeries,
  buildYearIncomeSeries,
  sumSeries,
  weekStartYmd,
  yearStartYmd,
  type ChartPoint,
  type StatsPeriod,
} from '@/features/owner/lib/owner-stats';

type Metric = 'income' | 'attendance';

const PERIODS: { id: StatsPeriod; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'year', label: 'Year' },
];

function formatIncome(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `₹${Math.round(value)}`;
}

function ChartShell({
  title,
  subtitle,
  totalLabel,
  children,
  period,
  onPeriod,
}: {
  title: string;
  subtitle: string;
  totalLabel: string;
  children: React.ReactNode;
  period: StatsPeriod;
  onPeriod: (p: StatsPeriod) => void;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] dark:border-border dark:bg-card dark:shadow-none sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">{subtitle}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-foreground">
            {totalLabel}
          </p>
        </div>
        <div
          className="inline-flex rounded-full bg-slate-100 p-1 dark:bg-muted"
          role="tablist"
          aria-label={`${title} period`}
        >
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={period === p.id}
              onClick={() => onPeriod(p.id)}
              className={cn(
                'min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors sm:min-h-10 sm:px-4 sm:text-sm',
                period === p.id
                  ? 'bg-white text-emerald-800 shadow-sm dark:bg-background dark:text-emerald-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-muted-foreground dark:hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 h-56 w-full sm:h-64">{children}</div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-border">
      <p className="text-sm text-slate-500 dark:text-muted-foreground">{label}</p>
    </div>
  );
}

function IncomeChart({ data, period }: { data: ChartPoint[]; period: StatsPeriod }) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) return <EmptyChart label="No income in this period yet" />;

  const chartData = data.map((d) => ({ ...d, display: Math.round(d.value) }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      {period === 'day' ? (
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ownerIncomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v: number) => formatIncome(v)}
          />
          <Tooltip
            formatter={(value) => [formatIncome(Number(value ?? 0)), 'Income']}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
            }}
          />
          <Area
            type="monotone"
            dataKey="display"
            stroke="#059669"
            strokeWidth={2}
            fill="url(#ownerIncomeFill)"
            name="Income"
          />
        </AreaChart>
      ) : (
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v: number) => formatIncome(v)}
          />
          <Tooltip
            formatter={(value) => [formatIncome(Number(value ?? 0)), 'Income']}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
            }}
          />
          <Bar dataKey="display" fill="#059669" radius={[8, 8, 4, 4]} name="Income" maxBarSize={42} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

function AttendanceChart({ data }: { data: ChartPoint[] }) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) return <EmptyChart label="No attendance in this period yet" />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={32}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
        />
        <Tooltip
          formatter={(value) => [`${Number(value ?? 0)} check-ins`, 'Attendance']}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
          }}
        />
        <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 4, 4]} name="Attendance" maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OwnerStatsCharts({
  client,
  gymId,
}: {
  client: TypedSupabaseClient;
  gymId: string | null | undefined;
}) {
  const [incomePeriod, setIncomePeriod] = useState<StatsPeriod>('week');
  const [attendancePeriod, setAttendancePeriod] = useState<StatsPeriod>('week');
  const [, setMetric] = useState<Metric>('income');
  void setMetric;

  const today = getTodayYmd();
  const fromYear = yearStartYmd();
  const fromWeek = weekStartYmd();

  const paymentsQuery = useGymPayments(client, {
    gymId: gymId ?? undefined,
    fromDate: fromYear,
    limit: 5000,
  });
  const attendanceQuery = useGymAttendanceHistory(client, gymId, fromYear, today);

  const payments = paymentsQuery.data ?? [];
  const attendance = attendanceQuery.data ?? [];

  const incomeSeries = useMemo(() => {
    if (incomePeriod === 'day') return buildDayIncomeSeries(payments);
    if (incomePeriod === 'week') return buildWeekIncomeSeries(payments);
    return buildYearIncomeSeries(payments);
  }, [payments, incomePeriod]);

  const attendanceSeries = useMemo(() => {
    // Day view needs full year fetch still works — filter to today in builder
    if (attendancePeriod === 'day') return buildDayAttendanceSeries(attendance);
    if (attendancePeriod === 'week') {
      const weekRows = attendance.filter(
        (r) => r.attendance_date >= fromWeek && r.attendance_date <= today,
      );
      return buildWeekAttendanceSeries(weekRows);
    }
    return buildYearAttendanceSeries(attendance);
  }, [attendance, attendancePeriod, fromWeek, today]);

  const incomeTotal = sumSeries(incomeSeries);
  const attendanceTotal = sumSeries(attendanceSeries);

  const incomeSubtitle =
    incomePeriod === 'day'
      ? 'Hourly paid income today'
      : incomePeriod === 'week'
        ? `Daily income · ${fromWeek} → ${today}`
        : `Monthly income · ${new Date().getFullYear()}`;

  const attendanceSubtitle =
    attendancePeriod === 'day'
      ? 'Hourly check-ins today'
      : attendancePeriod === 'week'
        ? `Daily check-ins · last 7 days`
        : `Monthly check-ins · ${new Date().getFullYear()}`;

  const loading = paymentsQuery.isLoading || attendanceQuery.isLoading;

  return (
    <section aria-label="Statistics" className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
          Statistics
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
          Income and attendance trends by day, week, and year
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-[20px] bg-slate-100 dark:bg-muted" />
          <div className="h-80 animate-pulse rounded-[20px] bg-slate-100 dark:bg-muted" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartShell
            title="Income"
            subtitle={incomeSubtitle}
            totalLabel={formatIncome(incomeTotal)}
            period={incomePeriod}
            onPeriod={setIncomePeriod}
          >
            <IncomeChart data={incomeSeries} period={incomePeriod} />
          </ChartShell>

          <ChartShell
            title="Attendance"
            subtitle={attendanceSubtitle}
            totalLabel={`${attendanceTotal} check-in${attendanceTotal === 1 ? '' : 's'}`}
            period={attendancePeriod}
            onPeriod={setAttendancePeriod}
          >
            <AttendanceChart data={attendanceSeries} />
          </ChartShell>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-muted-foreground">
        Week range starts {addDaysToYmd(today, -6)}. Only payments with status paid are counted.
      </p>
    </section>
  );
}
