'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@smart-gym/shared';
import { Dumbbell } from 'lucide-react';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: '/owner', label: 'Overview', exact: true },
  { href: '/owner/members', label: 'Members' },
  { href: '/owner/attendance', label: 'Attendance' },
  { href: '/owner/payments', label: 'Payments' },
  { href: '/owner/broadcast', label: 'Broadcast' },
  { href: '/owner/settings', label: 'Settings' },
];

export function OwnerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/owner" className="flex shrink-0 items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="size-4" />
            </span>
            <span className="hidden sm:inline">{APP_NAME}</span>
          </Link>

          <nav className="flex flex-1 items-center justify-center gap-1 overflow-x-auto" aria-label="Owner">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                    active
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
