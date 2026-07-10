'use client';

import Link from 'next/link';
import { getMembershipExpiryLine } from '@smart-gym/shared';
import { useMemberContext } from '@/features/member/components/member-provider';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function MemberHome() {
  const { profile, gym, membership } = useMemberContext();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Hi{profile?.first_name ? `, ${profile.first_name}` : ''}
        </h1>
        <p className="text-muted-foreground">
          {gym?.name ?? 'Your gym'}
          {membership?.ends_at ? ` · ${getMembershipExpiryLine(membership.ends_at)}` : ''}
        </p>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/40 p-6">
        <h2 className="font-medium">Today&apos;s focus</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate your attendance code, log meals in Diet, then check payments and league progress.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/member/attendance" className={cn(buttonVariants())}>
            Open attendance
          </Link>
          <Link href="/member/diet" className={cn(buttonVariants({ variant: 'outline' }))}>
            Log diet
          </Link>
          <Link href="/member/league" className={cn(buttonVariants({ variant: 'outline' }))}>
            League
          </Link>
          <Link href="/member/friends" className={cn(buttonVariants({ variant: 'outline' }))}>
            Friends
          </Link>
        </div>
      </div>
    </div>
  );
}
