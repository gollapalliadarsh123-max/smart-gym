import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function MobileListCard({
  title,
  subtitle,
  meta,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-none',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate font-semibold text-foreground">{title}</h3>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {meta}
      </div>
      {children ? <div className="mt-3 space-y-2 text-sm">{children}</div> : null}
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}
