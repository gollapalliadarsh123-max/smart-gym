import Link from 'next/link';
import { APP_NAME } from '@smart-gym/shared';
import { Dumbbell } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="size-5" aria-hidden />
          </span>
          <span>{APP_NAME}</span>
        </Link>

        <nav className="flex items-center gap-2" aria-label="Main navigation">
          <ThemeToggle />
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            Log in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
