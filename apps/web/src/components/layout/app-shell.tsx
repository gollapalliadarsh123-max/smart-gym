'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Menu, X, type LucideIcon } from 'lucide-react';
import { APP_NAME } from '@smart-gym/shared';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { LogoutOnBackGuard } from '@/features/auth/components/logout-on-back-guard';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
  /** Show in mobile bottom bar */
  primary?: boolean;
};

export function AppShell({
  title,
  subtitle,
  nav,
  children,
  variant = 'default',
}: {
  title: string;
  subtitle?: string;
  nav: AppNavItem[];
  children: ReactNode;
  /** Owner shell: green active rail, softer SaaS spacing */
  variant?: 'default' | 'owner';
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isOwner = variant === 'owner';

  function isActive(item: AppNavItem) {
    return item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  const bottomItems = nav.filter((item) => item.primary).slice(0, 5);

  const navList = (
    <nav className={cn('flex flex-1 flex-col', isOwner ? 'gap-1.5' : 'gap-1')} aria-label="Primary">
      {nav.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'group relative inline-flex min-h-11 items-center gap-3 text-sm font-medium transition-colors',
              isOwner
                ? cn(
                    'rounded-[14px] px-3.5',
                    active
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                  )
                : cn(
                    'rounded-lg px-3',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-muted hover:text-foreground',
                  ),
            )}
            aria-current={active ? 'page' : undefined}
          >
            {isOwner && active ? (
              <span
                className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-emerald-600"
                aria-hidden
              />
            ) : null}
            <Icon
              className={cn(
                'size-5 shrink-0',
                isOwner && active && 'text-emerald-600 dark:text-emerald-400',
              )}
              aria-hidden
            />
            <span className="truncate">{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span
                className={cn(
                  'ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white',
                  isOwner ? 'bg-emerald-600' : 'bg-destructive',
                )}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div
      className={cn(
        'flex min-h-full flex-1',
        isOwner ? 'bg-[#F7F8FA] dark:bg-background' : 'bg-background',
      )}
    >
      <LogoutOnBackGuard />
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 flex-col border-r lg:flex',
          isOwner
            ? 'w-64 border-slate-200/80 bg-white p-4 dark:border-sidebar-border dark:bg-sidebar'
            : 'w-60 border-sidebar-border bg-sidebar p-3',
        )}
      >
        <div
          className={cn(
            'mb-5',
            isOwner
              ? 'rounded-[16px] bg-slate-50 px-3.5 py-3.5 dark:bg-muted'
              : 'rounded-lg border border-border px-3 py-3',
          )}
        >
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{APP_NAME}</p>
          )}
        </div>
        {navList}
        <div
          className={cn(
            'mt-auto flex items-center gap-2 border-t pt-3',
            isOwner ? 'border-slate-200 dark:border-border' : 'border-border',
          )}
        >
          <ThemeToggle />
          <SignOutButton className="min-h-11 flex-1" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header
          className={cn(
            'sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b px-4 backdrop-blur lg:hidden',
            isOwner
              ? 'border-slate-200/80 bg-white/95 dark:border-border dark:bg-background/95'
              : 'border-border bg-background/95 supports-[backdrop-filter]:bg-background/80',
          )}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="min-h-11 min-w-11"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </header>

        {/* Mobile drawer */}
        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/40"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <aside
              className={cn(
                'absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col shadow-lg',
                isOwner ? 'bg-white p-4 dark:bg-sidebar' : 'bg-sidebar p-3',
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div
                  className={cn(
                    isOwner
                      ? 'rounded-[16px] bg-slate-50 px-3 py-2 dark:bg-muted'
                      : 'rounded-lg border border-border px-3 py-2',
                  )}
                >
                  <p className="text-sm font-semibold">{title}</p>
                  {subtitle ? (
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="min-h-11 min-w-11"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                >
                  <X className="size-5" />
                </Button>
              </div>
              {navList}
              <div className="mt-auto border-t border-border pt-3">
                <SignOutButton className="min-h-11 w-full" />
              </div>
            </aside>
          </div>
        ) : null}

        <main className={cn('flex-1', bottomItems.length > 0 && 'pb-20 lg:pb-0')}>
          {children}
        </main>

        {/* Mobile bottom nav */}
        {bottomItems.length > 0 ? (
          <nav
            className={cn(
              'fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur lg:hidden',
              isOwner
                ? 'border-slate-200/80 bg-white/95 dark:border-border dark:bg-background/95'
                : 'border-border bg-background/95 supports-[backdrop-filter]:bg-background/90',
            )}
            aria-label="Quick navigation"
          >
            <ul
              className="mx-auto grid max-w-lg gap-1 px-2 py-1.5"
              style={{ gridTemplateColumns: `repeat(${bottomItems.length}, minmax(0, 1fr))` }}
            >
              {bottomItems.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium',
                        isOwner
                          ? active
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-500'
                          : active
                            ? 'text-primary'
                            : 'text-muted-foreground',
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="size-5" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
