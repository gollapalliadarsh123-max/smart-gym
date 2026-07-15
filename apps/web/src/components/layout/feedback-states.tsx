import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center',
        className,
      )}
      role="status"
    >
      <span className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="size-5" aria-hidden />}
      </span>
      <p className="font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} role="status" aria-live="polite">
      {label}
    </p>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm',
        className,
      )}
      role="alert"
    >
      <p className="font-medium text-destructive">{title}</p>
      {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
    </div>
  );
}
