import type { Metadata } from 'next';
import { DashboardShell } from '@/features/dashboard/components/dashboard-shell';

export const metadata: Metadata = {
  title: 'Trainer dashboard',
};

export default function TrainerDashboardPage() {
  return (
    <DashboardShell
      title="Trainer dashboard"
      subtitle="Assigned members & attendance"
      nav={[{ href: '/trainer', label: 'Dashboard', exact: true }]}
    >
      <div className="sg-panel text-sm text-muted-foreground">
        Your trainer workspace shell is ready.
      </div>
    </DashboardShell>
  );
}
