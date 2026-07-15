'use client';

import { Home } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/feedback-states';

export default function TrainerDashboardPage() {
  return (
    <AppShell
      title="Trainer"
      subtitle="Workspace"
      nav={[{ href: '/trainer', label: 'Home', icon: Home, exact: true, primary: true }]}
    >
      <PageContainer>
        <PageHeader
          title="Trainer dashboard"
          description="Assigned members and session tools will appear here as trainer workflows expand."
        />
        <EmptyState
          title="Trainer tools coming next"
          description="Your account is ready. Member lists, sessions, and plans will plug into this same layout."
        />
      </PageContainer>
    </AppShell>
  );
}
