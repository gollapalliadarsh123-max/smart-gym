import type { Metadata } from 'next';
import { DashboardShell } from '@/features/dashboard/components/dashboard-shell';

export const metadata: Metadata = {
  title: 'Admin dashboard',
};

export default function AdminDashboardPage() {
  return (
    <DashboardShell
      title="Platform admin"
      subtitle="Cross-gym administration"
      nav={[{ href: '/admin', label: 'Dashboard', exact: true }]}
    >
      <div className="sg-panel text-sm text-muted-foreground">
        Admin shell is ready for authenticated platform admins.
      </div>
    </DashboardShell>
  );
}
