import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-6 lg:py-8', className)}>
      {children}
    </div>
  );
}
