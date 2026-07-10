import type { Metadata } from 'next';
import { DashboardShell } from '@/features/dashboard/components/dashboard-shell';

export const metadata: Metadata = {
  title: 'Admin dashboard',
};

export default function AdminDashboardPage() {
  return (
    <DashboardShell
      title="Platform admin"
      description="Cross-gym administration. Platform tools will expand in later modules."
    >
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 p-8 text-sm text-muted-foreground">
        Admin shell is ready for authenticated platform admins.
      </div>
    </DashboardShell>
  );
}
