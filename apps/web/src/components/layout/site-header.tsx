import Link from 'next/link';
import { APP_NAME } from '@smart-gym/shared';
import { Dumbbell } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="size-5" aria-hidden />
          </span>
          <span className="truncate">{APP_NAME}</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
          <ThemeToggle />
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'min-h-11')}>
            Log in
          </Link>
          <Link href="/signup" className={cn(buttonVariants(), 'min-h-11')}>
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
