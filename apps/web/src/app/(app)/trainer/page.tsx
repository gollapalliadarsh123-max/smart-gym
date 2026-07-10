import type { Metadata } from 'next';
import { DashboardShell } from '@/features/dashboard/components/dashboard-shell';

export const metadata: Metadata = {
  title: 'Trainer dashboard',
};

export default function TrainerDashboardPage() {
  return (
    <DashboardShell
      title="Trainer dashboard"
      description="View assigned members and attendance tools. Trainer workflows arrive in a later module."
    >
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 p-8 text-sm text-muted-foreground">
        Your trainer workspace shell is ready.
      </div>
    </DashboardShell>
  );
}
