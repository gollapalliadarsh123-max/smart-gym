import type { Metadata } from 'next';
import { OwnerGymQrPanel } from '@/features/owner/components/owner-gym-qr-panel';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = { title: 'Gym QR Code' };

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        title="Gym QR Code"
        description="Print or display this secure check-in QR for members and partner visitors."
      />
      <OwnerGymQrPanel />
    </PageContainer>
  );
}
