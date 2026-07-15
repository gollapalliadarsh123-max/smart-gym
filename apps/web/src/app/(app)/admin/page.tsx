'use client';

import { Home } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/feedback-states';

export default function AdminDashboardPage() {
  return (
    <AppShell
      title="Platform admin"
      subtitle="Administration"
      nav={[{ href: '/admin', label: 'Home', icon: Home, exact: true, primary: true }]}
    >
      <PageContainer>
        <PageHeader
          title="Platform admin"
          description="Cross-gym administration tools will expand here in later modules."
        />
        <EmptyState
          title="Admin workspace ready"
          description="Use the same navigation patterns as owner and member dashboards for future tools."
        />
      </PageContainer>
    </AppShell>
  );
}
