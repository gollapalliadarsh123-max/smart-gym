'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';

export type DashboardNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  badge?: number;
  icon?: ReactNode;
};

export function DashboardShell({
  title,
  subtitle,
  nav,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: DashboardNavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(item: DashboardNavItem) {
    return item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  const navList = (
    <nav className="flex flex-1 flex-col gap-2" aria-label="Dashboard">
      {nav.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn('sg-nav-item', active && 'sg-nav-item-active')}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              {item.icon ? (
                <span className="inline-flex size-[18px] shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/14 text-[11px] font-extrabold text-[#e5ecff]">
                  {item.icon}
                </span>
              ) : null}
              <span className="truncate">{item.label}</span>
            </span>
            {item.badge && item.badge > 0 ? (
              <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-extrabold text-white shadow-[0_8px_16px_rgba(239,68,68,0.35)]">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="sg-sidebar sticky top-0 hidden h-screen w-[290px] shrink-0 flex-col border-r border-white/10 p-4 text-white lg:flex">
        <div className="mb-5 rounded-[14px] border border-white/20 bg-white/10 px-3 py-2.5">
          <h3 className="text-[19px] font-extrabold tracking-wide text-white">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs font-bold tracking-wider text-[#e5ecff]">{subtitle}</p>
          ) : null}
        </div>
        {navList}
        <div className="mt-auto flex items-center gap-2 border-t border-white/10 pt-4">
          <ThemeToggle />
          <SignOutButton className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{title}</p>
            {subtitle ? (
              <p className="truncate text-xs font-semibold text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/50"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="sg-sidebar absolute inset-y-0 left-0 flex w-[min(290px,88vw)] flex-col p-4 text-white shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="rounded-[14px] border border-white/20 bg-white/10 px-3 py-2.5">
                  <h3 className="text-lg font-extrabold text-white">{title}</h3>
                  {subtitle ? (
                    <p className="mt-1 text-xs font-bold tracking-wider text-[#e5ecff]">{subtitle}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-white/20 bg-white/10"
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="size-4" />
                </button>
              </div>
              {navList}
              <div className="mt-auto border-t border-white/10 pt-4">
                <SignOutButton className="w-full border-white/20 bg-white/10 text-white hover:bg-white/16 hover:text-white" />
              </div>
            </aside>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
