'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Menu, X, type LucideIcon } from 'lucide-react';
import { APP_NAME } from '@smart-gym/shared';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
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
}: {
  title: string;
  subtitle?: string;
  nav: AppNavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(item: AppNavItem) {
    return item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  const bottomItems = nav.filter((item) => item.primary).slice(0, 5);

  const navList = (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
      {nav.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'inline-flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/80 hover:bg-muted hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-white">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-full flex-1 bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 lg:flex">
        <div className="mb-4 rounded-lg border border-border px-3 py-3">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{APP_NAME}</p>
          )}
        </div>
        {navList}
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
          <ThemeToggle />
          <SignOutButton className="min-h-11 flex-1" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
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
            <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-sidebar p-3 shadow-lg">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="rounded-lg border border-border px-3 py-2">
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
            className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 lg:hidden"
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
                        active ? 'text-primary' : 'text-muted-foreground',
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
