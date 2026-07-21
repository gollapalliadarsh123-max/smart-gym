'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  extractQrToken,
  getCurrentUserId,
  useCheckInByQrToken,
  type QrCheckInResult,
} from '@smart-gym/supabase';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { AuthCard } from '@/features/auth/components/auth-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function TokenCheckInPageClient({ token: rawToken }: { token: string }) {
  const client = useMemo(() => createClient(), []);
  const token = extractQrToken(rawToken) ?? extractQrToken(`/checkin/${rawToken}`);
  const checkIn = useCheckInByQrToken(client);
  const [result, setResult] = useState<QrCheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoTried, setAutoTried] = useState(false);

  const userQuery = useQuery({
    queryKey: ['current-user-id'],
    queryFn: () => getCurrentUserId(client),
  });
  const userId = userQuery.data ?? null;

  async function runCheckIn() {
    if (!token) {
      setError('Invalid QR code.');
      return;
    }
    setError(null);
    setResult(null);
    try {
      const res = await checkIn.mutateAsync(token);
      setResult(res);
      if (!res.success) setError(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed.');
    }
  }

  useEffect(() => {
    if (autoTried || userQuery.isLoading) return;
    if (!userId || !token) {
      setAutoTried(true);
      return;
    }
    setAutoTried(true);
    void runCheckIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto once on load
  }, [autoTried, userId, userQuery.isLoading, token]);

  if (!token) {
    return (
      <AuthLayout>
        <AuthCard title="Invalid QR" description="This check-in link is not valid.">
          <p className="text-sm text-destructive">Ask the gym for the current check-in QR.</p>
        </AuthCard>
      </AuthLayout>
    );
  }

  if (userQuery.isLoading) {
    return (
      <AuthLayout>
        <AuthCard title="Gym check-in" description="Checking your session…">
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        </AuthCard>
      </AuthLayout>
    );
  }

  if (!userId) {
    return (
      <AuthLayout>
        <AuthCard title="Sign in to check in" description="Secure gym QR detected.">
          <Link
            href={`/login?next=${encodeURIComponent(`/checkin/${token}`)}`}
            className={cn(buttonVariants({ size: 'lg' }), 'inline-flex w-full')}
          >
            Sign in
          </Link>
        </AuthCard>
      </AuthLayout>
    );
  }

  const success = result?.success === true;

  return (
    <AuthLayout>
      <AuthCard
        title="Gym check-in"
        description="Validated securely — this QR never exposes gym database IDs."
      >
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="ok"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center dark:border-emerald-900 dark:bg-emerald-950/40"
              >
                <CheckCircle2 className="mx-auto size-12 text-emerald-600 dark:text-emerald-300" />
                <p className="mt-3 text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                  {result.message}
                </p>
                {result.check_in_kind === 'partner' ? (
                  <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
                    Remaining visits: {result.visits_remaining ?? 0} / {result.monthly_limit ?? 3}
                  </p>
                ) : null}
                {result.gym_name ? (
                  <p className="mt-1 text-sm text-muted-foreground">{result.gym_name}</p>
                ) : null}
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={checkIn.isPending}
                  onClick={() => void runCheckIn()}
                >
                  {checkIn.isPending ? 'Checking in…' : 'Confirm check-in'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && !success ? (
            <p className="text-center text-sm text-destructive" role="alert">
              {error}
              {result?.detail ? ` — ${result.detail}` : ''}
            </p>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/member/attendance" className="text-primary underline-offset-4 hover:underline">
              Back to attendance
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
