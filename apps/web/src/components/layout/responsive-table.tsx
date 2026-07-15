import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Desktop: normal table wrapper. Mobile: horizontal scroll without breaking page width. */
export function ResponsiveTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('-mx-1 overflow-x-auto', className)}>
      <div className="min-w-[640px] px-1">{children}</div>
    </div>
  );
}
