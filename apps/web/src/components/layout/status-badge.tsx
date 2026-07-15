import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex h-6 items-center rounded-md border px-2 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-muted text-muted-foreground',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
        warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
        danger: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
        info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200',
        primary: 'border-primary/20 bg-primary/10 text-primary',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export function StatusBadge({
  children,
  tone,
  className,
}: {
  children: React.ReactNode;
  className?: string;
} & VariantProps<typeof statusBadgeVariants>) {
  return <span className={cn(statusBadgeVariants({ tone }), className)}>{children}</span>;
}

export function statusToneFromLabel(value: string): VariantProps<typeof statusBadgeVariants>['tone'] {
  const v = value.toLowerCase();
  if (['active', 'paid', 'approved', 'accepted', 'present', 'checked in'].some((k) => v.includes(k))) {
    return 'success';
  }
  if (['pending', 'expir', 'warning', 'due'].some((k) => v.includes(k))) return 'warning';
  if (['expired', 'rejected', 'failed', 'cancelled', 'unpaid', 'not_paid'].some((k) => v.includes(k))) {
    return 'danger';
  }
  return 'neutral';
}
