import type { Metadata } from 'next';
import { OwnerSettingsForm } from '@/features/owner/components/owner-settings-form';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = { title: 'Settings' };

export default function Page() {
  return (
    <PageContainer>
      <OwnerSettingsForm />
    </PageContainer>
  );
}
