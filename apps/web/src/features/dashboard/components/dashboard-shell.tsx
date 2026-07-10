import Link from 'next/link';
import { APP_NAME } from '@smart-gym/shared';
import { Dumbbell } from 'lucide-react';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import type { ReactNode } from 'react';

interface DashboardShellProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function DashboardShell({ title, description, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="size-4" />
            </span>
            {APP_NAME}
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-2xl text-muted-foreground">{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
